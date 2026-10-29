/**
 * Pure transitions for the level review lifecycle:
 *
 *   drafting ─author approves─▶ review (round 1)
 *   review ─all stakeholders approve, feedback present─▶ reconcile ─author approves─▶ review (round 2)
 *   review ─all stakeholders approve, no feedback─▶ finalized (locked)
 */
import { patchCard, addHistory } from "./actions";
import {
  makeId,
  nextRevision,
  nowISO,
  todayISO,
  type CardReview,
  type ReviewFeedback,
  type Signature,
  type WorkflowState,
} from "./types";
import type { Stakeholder } from "./level";

export function emptyReview(cardId: string): CardReview {
  return { cardId, state: "drafting", round: 0, authorApprovals: [], stakeholderApprovals: {}, feedback: [], notifications: [] };
}

export function getReview(s: WorkflowState, cardId: string): CardReview {
  return s.reviews?.[cardId] ?? emptyReview(cardId);
}

function putReview(s: WorkflowState, r: CardReview): WorkflowState {
  return { ...s, reviews: { ...(s.reviews ?? {}), [r.cardId]: r } };
}

/** Fields may be edited only by the author while drafting or reconciling. */
export function canEdit(r: CardReview, isAuthor: boolean) {
  return isAuthor && (r.state === "drafting" || r.state === "reconcile");
}

export function feedbackForRound(r: CardReview, round = r.round) {
  return r.feedback.filter((f) => f.round === round);
}

/** Author approves the draft (or the reconciled draft): routes to stakeholders for the next round. */
export function authorApprove(s: WorkflowState, cardId: string, sig: Omit<Signature, "round">, stakeholders: Stakeholder[]): WorkflowState {
  const r = getReview(s, cardId);
  if (r.state !== "drafting" && r.state !== "reconcile") return s;
  const round = r.round + 1;
  const next: CardReview = {
    ...r,
    state: "review",
    round,
    authorApprovals: [...r.authorApprovals, { ...sig, round }],
    stakeholderApprovals: {},
    notifications: [...r.notifications, { round, at: nowISO(), to: stakeholders.map((x) => x.name) }],
  };
  let out = putReview(s, next);
  out = patchCard(out, cardId, (c) => ({ ...c, status: "amber" }));
  out = addHistory(out, cardId, "edited", `Author approved draft · routed for review round ${round} (${stakeholders.length} stakeholders notified)`);
  return out;
}

export function addFeedback(s: WorkflowState, cardId: string, fb: Omit<ReviewFeedback, "id" | "at" | "round">): WorkflowState {
  const r = getReview(s, cardId);
  if (r.state !== "review") return s;
  return putReview(s, { ...r, feedback: [...r.feedback, { ...fb, id: makeId("fb"), at: nowISO(), round: r.round }] });
}

/** A stakeholder approves the current round. When everyone has, the card moves on. */
export function stakeholderApprove(s: WorkflowState, cardId: string, sig: Omit<Signature, "round">, stakeholders: Stakeholder[]): WorkflowState {
  const r = getReview(s, cardId);
  if (r.state !== "review") return s;
  const approvals = { ...r.stakeholderApprovals, [sig.by]: { ...sig, round: r.round } };
  const all = stakeholders.every((x) => approvals[x.name]);
  let next: CardReview = { ...r, stakeholderApprovals: approvals };
  let out = s;
  if (all) {
    const hasFeedback = feedbackForRound(r).length > 0;
    if (hasFeedback) {
      next = { ...next, state: "reconcile" };
      out = addHistory(out, cardId, "edited", `Review round ${r.round} complete with feedback · returned to author to reconcile`);
    } else {
      const rev = nextRevision(findCardRevision(s, cardId));
      next = { ...next, state: "finalized", finalizedAt: nowISO(), finalRevision: rev };
      out = patchCard(out, cardId, (c) => ({
        ...c,
        status: "green",
        provenance: { ...c.provenance, cardRevision: rev, revisionDate: todayISO() },
        history: [
          ...c.history,
          {
            id: makeId("ev"),
            at: nowISO(),
            type: "status",
            summary: `Finalized at ${rev} · review round ${r.round}, all stakeholders approved with no edits`,
            signOff: {
              reviewer: stakeholders.map((x) => x.name).join(", "),
              role: "Regulatory / Quality",
              rationale: `Round ${r.round}: no edits or comments; approvals by ${stakeholders.map((x) => x.name).join(", ")}.`,
              from: c.status,
              to: "green",
              revision: rev,
            },
          },
        ],
      }));
    }
  }
  return putReview(out, next);
}

/** Author marks a piece of feedback as reconciled (with how). */
export function reconcileFeedback(s: WorkflowState, cardId: string, feedbackId: string, resolution: string): WorkflowState {
  const r = getReview(s, cardId);
  return putReview(s, {
    ...r,
    feedback: r.feedback.map((f) => (f.id === feedbackId ? { ...f, reconciled: true, resolution } : f)),
  });
}

export function allReconciled(r: CardReview) {
  return feedbackForRound(r).every((f) => f.reconciled);
}

function findCardRevision(s: WorkflowState, cardId: string) {
  const c = s.mechanisms.find((m) => m.id === cardId) ?? s.features.find((f) => f.id === cardId);
  return c?.provenance.cardRevision ?? "v0";
}

/** Demo helper: wipe a card's review record (back to drafting). */
export function resetReview(s: WorkflowState, cardId: string): WorkflowState {
  const reviews = { ...(s.reviews ?? {}) };
  delete reviews[cardId];
  return { ...s, reviews };
}

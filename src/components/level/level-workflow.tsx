"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, ChevronDown, FileText, GraduationCap, Lock, RotateCcw, ShieldAlert, UserRound } from "lucide-react";
import * as A from "@/lib/actions";
import { logEdit } from "@/lib/store";
import {
  AUTHOR,
  CARD_INSTRUCTIONS,
  LEVEL,
  PERSONAS,
  STAKEHOLDERS,
  clearTraining,
  isTrained,
  personaOf,
  recordTraining,
  setPersona,
  trainingGap,
  usePersona,
  useTrainingProfiles,
  type CardType,
} from "@/lib/level";
import { addFeedback, authorApprove, canEdit, getReview, reconcileFeedback, resetReview, stakeholderApprove } from "@/lib/level-review";
import type { Feature, Signature, WorkflowState } from "@/lib/types";
import type { UserNeedCard } from "@/lib/user-needs";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Edit } from "@/components/wizard/wizard";
import { CredentialsDialog, type CredentialsRequest } from "./credentials-dialog";
import { CardInstructionsDialog, LevelInstructionsDialog } from "./instructions-dialogs";
import { CardRibbon, STATE_META, ribbonTitle } from "./card-ribbon";
import { EffectivenessEditor, FeatureEditor, MarketMapEditor, MoaEditor, type MapRow } from "./card-editors";
import { ReviewPanel } from "./review-panel";
import { buildLevelCards, needLabel, type LevelCard } from "./level-cards";

type SetState = (u: WorkflowState | ((s: WorkflowState) => WorkflowState)) => void;

/**
 * Feature Development as a guided level: ribbon of cards, one card open in
 * the window, instructions + training gates, and the author → stakeholder
 * review lifecycle on every card.
 */
export function LevelWorkflow({
  state,
  setState,
  needs,
  activeId,
  onActivate,
}: {
  state: WorkflowState;
  setState: SetState;
  needs: UserNeedCard[];
  activeId: string | null;
  onActivate: (id: string) => void;
}) {
  const personaName = usePersona();
  const persona = personaOf(personaName);
  const isAuthor = personaName === AUTHOR.name;
  const profiles = useTrainingProfiles();

  const [levelOpen, setLevelOpen] = useState(false);
  const [cardInstr, setCardInstr] = useState<CardType | null>(null);
  const [gateMsg, setGateMsg] = useState<{ gap: "level" | "card"; cardType: CardType } | null>(null);
  const [cred, setCred] = useState<CredentialsRequest | null>(null);

  /* ---------- transfer from the previous level (idempotent) ---------- */

  const transferring = useRef(false);
  useEffect(() => {
    if (transferring.current) return;
    const improve = needs.filter((n) => n.kind === "improve" && n.title.trim());
    const unlinkedNeeds = improve.filter((n) => !state.mechanisms.some((m) => m.userNeedId === n.id));
    const missingTheories = state.mechanisms.flatMap((m) => m.theories.filter((t) => !state.features.some((f) => f.moaId === m.id && f.theoryId === t.id)).map((t) => ({ m, t })));
    if (unlinkedNeeds.length === 0 && missingTheories.length === 0) return;
    transferring.current = true;
    setState((s) => {
      let next = s;
      // Mechanisms that predate the link (or were made on the canvas) adopt unlinked Improve needs in order,
      // so existing work is kept; only needs still without a mechanism get a new card.
      const orphans = next.mechanisms.filter((m) => !m.userNeedId).map((m) => m.id);
      for (const n of unlinkedNeeds) {
        if (next.mechanisms.some((m) => m.userNeedId === n.id)) continue;
        const adopt = orphans.shift();
        if (adopt) {
          next = A.editMechanism(next, adopt, (m) => ({ ...m, userNeedId: n.id, improvementConfirmed: true }));
          next = A.addHistory(next, adopt, "linked", `Linked to User Need: ${n.title.slice(0, 60)}`);
        } else {
          const { state: s2, id } = A.addMechanism(next);
          next = A.editMechanism(s2, id, (m) => ({ ...m, userNeedId: n.id, unmetNeed: n.title, improvementConfirmed: true }));
          next = A.addHistory(next, id, "linked", `Transferred from User Needs: ${n.title.slice(0, 60)}`);
        }
      }
      for (const { m, t } of missingTheories) {
        if (next.features.some((f) => f.moaId === m.id && f.theoryId === t.id)) continue;
        next = A.addFeature(next, m.id, t.id).state;
      }
      return next;
    });
    // Allow the effect to run again after the store settles (new theories added later).
    setTimeout(() => (transferring.current = false), 0);
  }, [needs, state.mechanisms, state.features, setState]);

  /* ---------- cards ---------- */

  const cards = useMemo(() => buildLevelCards(state, needs), [state, needs]);
  const active = cards.find((c) => c.id === activeId) ?? cards[0];
  useEffect(() => {
    if (active && active.id !== activeId) onActivate(active.id);
  }, [active, activeId, onActivate]);

  const reviews = useMemo(() => Object.fromEntries(cards.map((c) => [c.id, state.reviews?.[c.id]])), [cards, state.reviews]);
  const review = active ? getReview(state, active.id) : null;
  const gap = active ? trainingGap(profiles, personaName, active.kind) : null;
  const editable = !!review && canEdit(review, isAuthor) && !gap;

  const idx = active ? cards.indexOf(active) : -1;
  const nextCard = idx >= 0 ? cards[idx + 1] : undefined;

  /* ---------- edits (gated) ---------- */

  const editMoa = (id: string): Edit => (updater, summary) => {
    setState((s) => A.editMechanism(s, id, updater));
    logEdit(id, summary);
  };
  const editFeature = (id: string) => (updater: (f: Feature) => Feature, summary: string) => {
    setState((s) => A.editFeature(s, id, updater));
    logEdit(id, summary);
  };
  const featureCountByTheory = useMemo(() => {
    const out: Record<string, number> = {};
    for (const f of state.features) out[f.theoryId] = (out[f.theoryId] ?? 0) + 1;
    return out;
  }, [state.features]);

  /* ---------- training + signatures ---------- */

  const signTraining = (id: string, title: string, revision: string, after?: () => void) =>
    setCred({
      title: `Sign training · ${title}`,
      meaning: `Signing records that ${personaName} has reviewed and comprehends ${title} rev ${revision}, and updates the training profile to that revision.`,
      by: personaName,
      role: persona.role,
      confirmLabel: "Sign training",
      onSigned: (sig) => {
        recordTraining(personaName, id, { revision, at: sig.at, userId: sig.userId });
        // Reviewing the level SOP covers the first card's instructions, which it contains.
        if (id === LEVEL.id) {
          const c = CARD_INSTRUCTIONS.moa;
          recordTraining(personaName, c.id, { revision: c.revision, at: sig.at, userId: sig.userId });
        }
        after?.();
      },
    });

  const signAuthor = () =>
    active &&
    setCred({
      title: "Approve draft",
      meaning: `Your signature records author approval of ${cardName(active)} and routes it to ${STAKEHOLDERS.length} stakeholders for review.`,
      by: personaName,
      role: persona.role,
      confirmLabel: "Approve & route",
      onSigned: (sig) => setState((s) => authorApprove(s, active.id, sig, STAKEHOLDERS)),
    });

  const signStakeholder = () =>
    active &&
    review &&
    setCred({
      title: `Approve review round ${review.round}`,
      meaning: `Your signature records ${personaName}'s approval of ${cardName(active)} for round ${review.round}.`,
      by: personaName,
      role: persona.role,
      confirmLabel: "Approve",
      onSigned: (sig: Omit<Signature, "round">) => setState((s) => stakeholderApprove(s, active.id, sig, STAKEHOLDERS)),
    });

  /* ---------- completeness for author approval ---------- */

  const draftComplete = (() => {
    if (!active) return { ok: false };
    switch (active.kind) {
      case "moa": {
        const m = active.moa;
        if (m.theories.length === 0) return { ok: false, reason: "Add at least one clinical theory." };
        const bad = m.theories.find((t) => !t.title.trim() || (!t.statement.trim() && !t.file));
        if (bad) return { ok: false, reason: "Every theory needs a title and a statement or source file." };
        const unref = m.theories.find((t) => t.references.length === 0);
        if (unref) return { ok: false, reason: `'${unref.title}' has no references; an unreferenced theory cannot pass review.` };
        return { ok: true };
      }
      case "feature":
        if (!active.feature.designTheory.trim() || !active.feature.featureConcept.trim()) return { ok: false, reason: "State both the design theory and the feature concept." };
        return { ok: true };
      case "effectiveness": {
        const e = active.feature.effectiveness;
        if (!e?.evaluation.trim()) return { ok: false, reason: "Record the prototype evaluation." };
        if (e.prototypeAcceptable === undefined) return { ok: false, reason: "Designate whether the prototype is acceptable." };
        return { ok: true };
      }
      case "market-map": {
        const rows = mapRows(state, needs);
        if (rows.length === 0) return { ok: false, reason: "No viable concepts to decide on." };
        const undecided = rows.find((r) => r.selected === undefined || !r.justification.trim());
        if (undecided) return { ok: false, reason: "Every viable concept needs a selection and a justification." };
        if (!rows.some((r) => r.selected)) return { ok: false, reason: "Select at least one concept." };
        return { ok: true };
      }
    }
  })();

  /* ---------- render ---------- */

  const levelTrained = isTrained(profiles, personaName);

  return (
    <div className="flex min-h-full flex-col gap-5 px-8 py-6">
      {/* level header */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setLevelOpen(true)}
          className="group flex items-center gap-2 rounded-md px-1 py-0.5 text-left transition hover:bg-white"
          title="Open level instructions (SOP)"
        >
          <span>
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#08A9AD]">Level · {LEVEL.id} rev {LEVEL.revision}</span>
            <span className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-[#00224B] group-hover:underline">
              {LEVEL.title}
              <BookOpen className="size-4 text-neutral-400 group-hover:text-[#00224B]" />
            </span>
          </span>
        </button>

        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-medium",
            levelTrained ? "border-green-300 bg-green-50 text-green-800" : "border-amber-300 bg-amber-50 text-amber-800"
          )}
        >
          <GraduationCap className="size-3.5" />
          {levelTrained ? `Trained to rev ${LEVEL.revision}` : `Not trained to rev ${LEVEL.revision}`}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
              <UserRound className="size-3.5" />
              Acting as <span className="font-semibold">{personaName}</span>
              <ChevronDown className="size-3.5 text-neutral-400" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs">One shared login · choose who is acting</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuRadioGroup value={personaName} onValueChange={(v) => typeof v === "string" && setPersona(v)}>
                {PERSONAS.map((p) => (
                  <DropdownMenuRadioItem key={p.name} value={p.name} closeOnClick className="text-xs">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-neutral-500">· {p.role}</span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="sm" title="Demo resets" />}>
              <RotateCcw className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => clearTraining()}>Reset training profiles</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setState((s) => ({ ...s, reviews: {}, marketMap: {} }))}>Reset all card reviews</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ribbon */}
      <CardRibbon cards={cards} activeId={active?.id ?? ""} reviews={reviews} onSelect={onActivate} />

      {/* card window */}
      {active && review && (
        <div className="flex flex-col gap-4">
          <section className="relative rounded-xl border border-neutral-200 bg-[#fbfbfc] shadow-sm" data-anchor={`level-card-${active.id}`}>
            <header className="flex flex-wrap items-center gap-3 border-b border-neutral-200 px-6 py-4">
              <button type="button" onClick={() => setCardInstr(active.kind)} className="group flex items-center gap-2 text-left" title="Open card instructions">
                <span className="font-mono text-[11px] text-neutral-500">{active.label}</span>
                <span className="text-lg font-semibold text-[#00224B] group-hover:underline">{CARD_INSTRUCTIONS[active.kind].title}</span>
                <FileText className="size-4 text-neutral-400 group-hover:text-[#00224B]" />
                <span className="font-mono text-[10px] text-neutral-400">
                  {CARD_INSTRUCTIONS[active.kind].id} rev {CARD_INSTRUCTIONS[active.kind].revision}
                </span>
              </button>
              <span className={cn("inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-semibold", STATE_META[review.state].chip)}>
                {review.state === "finalized" ? <Lock className="size-3" /> : <span className={cn("size-2 rounded-full", STATE_META[review.state].dot)} />}
                {STATE_META[review.state].label}
                {review.round > 0 && review.state !== "finalized" && ` · round ${review.round}`}
              </span>
              <span className="ml-auto text-xs text-neutral-500">
                {review.state === "finalized" ? "Fields closed" : editable ? "Editing as author" : gap ? "Training required to enter data" : isAuthor ? "Read-only in this state" : "Read-only · stakeholder view"}
              </span>
            </header>

            <div className="relative px-6 py-5">
              <fieldset disabled={!editable} className={cn("min-w-0 border-0 p-0", !editable && review.state !== "finalized" && !gap && "opacity-90")}>
                {active.kind === "moa" && (
                  <MoaEditor
                    moa={active.moa}
                    need={active.need}
                    needLabel={active.label}
                    edit={editMoa(active.moa.id)}
                    featureCountByTheory={featureCountByTheory}
                    onRemoveTheory={(tid) => setState((s) => A.removeTheory(s, active.moa.id, tid))}
                  />
                )}
                {active.kind === "feature" && (
                  <FeatureEditor
                    feature={active.feature}
                    theory={active.theory}
                    theoryLabel={`${needLabel(needs.findIndex((n) => n.id === active.moa.userNeedId))} · T${active.moa.theories.findIndex((t) => t.id === active.feature.theoryId) + 1}`}
                    moaState={getReview(state, active.moa.id).state}
                    onChange={editFeature(active.feature.id)}
                  />
                )}
                {active.kind === "effectiveness" && (
                  <EffectivenessEditor feature={active.feature} featureState={getReview(state, active.feature.id).state} onChange={editFeature(active.feature.id)} />
                )}
                {active.kind === "market-map" && (
                  <MarketMapEditor
                    rows={mapRows(state, needs)}
                    final={review.state === "finalized"}
                    onSelect={(fid, p) =>
                      setState((s) => ({ ...s, marketMap: { ...(s.marketMap ?? {}), [fid]: { justification: "", ...(s.marketMap?.[fid] ?? {}), ...p } } }))
                    }
                  />
                )}
              </fieldset>
              {/* Transparent gate: any attempt to enter data raises the training error. */}
              {gap && review.state !== "finalized" && (
                <div
                  data-training-gate=""
                  role="presentation"
                  className="absolute inset-0 cursor-not-allowed"
                  onClick={() => setGateMsg({ gap, cardType: active.kind })}
                />
              )}
            </div>
          </section>

          <ReviewPanel
            review={review}
            persona={persona}
            isAuthor={isAuthor}
            stakeholders={STAKEHOLDERS}
            draftComplete={draftComplete}
            onAuthorApprove={signAuthor}
            onStakeholderApprove={signStakeholder}
            onAddFeedback={(kind, text) => setState((s) => addFeedback(s, active.id, { kind, text, by: personaName, role: persona.role }))}
            onReconcile={(fid, res) => setState((s) => reconcileFeedback(s, active.id, fid, res))}
            onReset={() => setState((s) => resetReview(s, active.id))}
          />

          {/* next card peeks below, like the carousel's post section */}
          {nextCard && (
            <button
              type="button"
              onClick={() => onActivate(nextCard.id)}
              className="group flex items-center gap-3 rounded-xl border border-dashed border-neutral-300 bg-white/50 px-6 py-3 text-left opacity-70 transition hover:border-[#08A9AD] hover:opacity-100"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Next</span>
              <span className="font-mono text-[11px] text-neutral-500">{nextCard.label}</span>
              <span className="text-sm font-semibold text-[#00224B]">{CARD_INSTRUCTIONS[nextCard.kind].title}</span>
              <span className="truncate text-sm text-neutral-600">{ribbonTitle(nextCard)}</span>
              <span className={cn("ml-auto rounded border px-1.5 py-px text-[10px]", STATE_META[reviews[nextCard.id]?.state ?? "drafting"].chip)}>{STATE_META[reviews[nextCard.id]?.state ?? "drafting"].label}</span>
            </button>
          )}
        </div>
      )}

      {/* dialogs */}
      <LevelInstructionsDialog
        open={levelOpen}
        onOpenChange={setLevelOpen}
        persona={personaName}
        training={profiles[personaName]?.[LEVEL.id]}
        onOpenCard={(t) => setCardInstr(t)}
        onSignTraining={(after) => signTraining(LEVEL.id, `${LEVEL.title} level instructions`, LEVEL.revision, after)}
      />
      <CardInstructionsDialog
        cardType={cardInstr}
        onClose={() => setCardInstr(null)}
        persona={personaName}
        training={cardInstr ? profiles[personaName]?.[CARD_INSTRUCTIONS[cardInstr].id] : undefined}
        onSignTraining={(after) => cardInstr && signTraining(CARD_INSTRUCTIONS[cardInstr].id, `${CARD_INSTRUCTIONS[cardInstr].title} card instructions`, CARD_INSTRUCTIONS[cardInstr].revision, after)}
      />
      <CredentialsDialog request={cred} onClose={() => setCred(null)} />

      <Dialog open={!!gateMsg} onOpenChange={(o) => !o && setGateMsg(null)}>
        <DialogContent className="sm:max-w-[460px]">
          {gateMsg && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-700">
                  <ShieldAlert className="size-5" />
                  Training required
                </DialogTitle>
                <DialogDescription>
                  {gateMsg.gap === "level"
                    ? `${personaName}'s approved training profile does not match the current revision of the ${LEVEL.title} level instructions (${LEVEL.id} rev ${LEVEL.revision}). Data entry is blocked until the instructions are reviewed and approved.`
                    : `${personaName} is trained to the level instructions, but not to the latest revision of the ${CARD_INSTRUCTIONS[gateMsg.cardType].title} card instructions (${CARD_INSTRUCTIONS[gateMsg.cardType].id} rev ${CARD_INSTRUCTIONS[gateMsg.cardType].revision}). Review and approve them to continue.`}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setGateMsg(null)}>
                  Close
                </Button>
                <Button
                  className="bg-[#00224B] hover:bg-[#00224B]/90"
                  onClick={() => {
                    const g = gateMsg;
                    setGateMsg(null);
                    if (g.gap === "level") setLevelOpen(true);
                    else setCardInstr(g.cardType);
                  }}
                >
                  <BookOpen className="size-4" />
                  Open {gateMsg.gap === "level" ? "level" : "card"} instructions
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- helpers ---------- */

function cardName(c: LevelCard) {
  return `${CARD_INSTRUCTIONS[c.kind].title} ${c.label}`;
}

/** Viable concepts (prototype acceptable) with their full traceability. */
function mapRows(state: WorkflowState, needs: UserNeedCard[]): MapRow[] {
  const out: MapRow[] = [];
  for (const m of state.mechanisms) {
    const ni = needs.findIndex((n) => n.id === m.userNeedId);
    for (const f of state.features.filter((x) => x.moaId === m.id)) {
      if (f.effectiveness?.prototypeAcceptable !== true) continue;
      const t = m.theories.find((x) => x.id === f.theoryId);
      const sel = state.marketMap?.[f.id];
      out.push({
        featureId: f.id,
        needLabel: needLabel(ni === -1 ? state.mechanisms.indexOf(m) : ni),
        need: needs[ni]?.title || m.unmetNeed,
        theory: t?.title ?? "—",
        designTheory: f.designTheory,
        concept: f.featureConcept || "(unnamed concept)",
        selected: sel?.selected,
        justification: sel?.justification ?? "",
      });
    }
  }
  return out;
}

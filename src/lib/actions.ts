/**
 * Pure state transitions shared by the canvas and the wizard.
 * Every function returns a new WorkflowState (or state + created id).
 */
import {
  STATUS_META,
  blankProvenance,
  blankTheory,
  event,
  makeId,
  nextRevision,
  todayISO,
  type Card,
  type Feature,
  type MechanismOfAction,
  type SignOff,
  type Status,
  type WorkflowState,
} from "./types";

export const findCard = (s: WorkflowState, id: string): Card | undefined =>
  s.mechanisms.find((m) => m.id === id) ?? s.features.find((f) => f.id === id);

export const isMechanism = (c: Card): c is MechanismOfAction => "theories" in c;

export function moaTitle(s: WorkflowState, id: string) {
  return `Clinical Mechanism of Action - Instance ${s.mechanisms.findIndex((m) => m.id === id) + 1}`;
}
export function featureTitle(s: WorkflowState, f: Feature) {
  const siblings = s.features.filter((x) => x.moaId === f.moaId);
  return `Feature Identification - Instance ${siblings.findIndex((x) => x.id === f.id) + 1}`;
}
export function cardTitle(s: WorkflowState, c: Card) {
  return isMechanism(c) ? moaTitle(s, c.id) : featureTitle(s, c);
}

export function patchCard(s: WorkflowState, id: string, fn: <T extends Card>(c: T) => T): WorkflowState {
  return {
    mechanisms: s.mechanisms.map((m) => (m.id === id ? fn(m) : m)),
    features: s.features.map((f) => (f.id === id ? fn(f) : f)),
  };
}

/** Field edit: apply updater and touch the revision date (history is logged separately, debounced). */
export function editMechanism(s: WorkflowState, id: string, updater: (m: MechanismOfAction) => MechanismOfAction) {
  return {
    ...s,
    mechanisms: s.mechanisms.map((m) =>
      m.id === id ? { ...updater(m), provenance: { ...m.provenance, revisionDate: todayISO() } } : m
    ),
  };
}
export function editFeature(s: WorkflowState, id: string, updater: (f: Feature) => Feature) {
  return {
    ...s,
    features: s.features.map((f) =>
      f.id === id ? { ...updater(f), provenance: { ...f.provenance, revisionDate: todayISO() } } : f
    ),
  };
}

export function addHistory(s: WorkflowState, id: string, type: "edited" | "linked", summary: string) {
  return patchCard(s, id, (c) => ({ ...c, history: [...c.history, event(type, summary)] }));
}

/* ---------- status / sign-off / conflicts ---------- */

export function applySignOff(s: WorkflowState, id: string, so: SignOff) {
  return patchCard(s, id, (c) => ({
    ...c,
    status: so.to,
    provenance: { ...c.provenance, cardRevision: so.revision, revisionDate: todayISO() },
    history: [
      ...c.history,
      event("status", `Status changed ${STATUS_META[so.from].label} → ${STATUS_META[so.to].label}`, so),
    ],
  }));
}

export function setConflict(s: WorkflowState, id: string, flagging: boolean, reason: string) {
  return patchCard(s, id, (c) => ({
    ...c,
    provenance: {
      ...c.provenance,
      activeConflict: flagging,
      conflictReason: flagging ? reason : undefined,
      revisionDate: todayISO(),
    },
    history: [
      ...c.history,
      event("conflict", flagging ? `Conflict flagged: ${reason}` : `Conflict resolved: ${reason}`),
    ],
  }));
}

export interface SignOffRequest {
  cardId: string;
  cardTitle: string;
  from: Status;
  to: Status;
  revision: string;
  nextRevision: string;
  activeConflict: boolean;
  conflictReason?: string;
}

export function buildSignOffRequest(s: WorkflowState, id: string, to: Status): SignOffRequest | null {
  const card = findCard(s, id);
  if (!card || card.status === to) return null;
  return {
    cardId: id,
    cardTitle: cardTitle(s, card),
    from: card.status,
    to,
    revision: card.provenance.cardRevision,
    nextRevision: nextRevision(card.provenance.cardRevision),
    activeConflict: card.provenance.activeConflict,
    conflictReason: card.provenance.conflictReason,
  };
}

/* ---------- mechanisms ---------- */

export function addMechanism(s: WorkflowState): { state: WorkflowState; id: string } {
  const id = makeId("moa");
  return {
    id,
    state: {
      ...s,
      mechanisms: [
        ...s.mechanisms,
        {
          id,
          unmetNeed: "",
          theories: [blankTheory(1)],
          status: "red",
          provenance: blankProvenance(`S-4.${s.mechanisms.length + 1}`),
          history: [event("created", "Card created")],
        },
      ],
    },
  };
}

export function duplicateMechanism(s: WorkflowState, id: string): WorkflowState {
  const src = s.mechanisms.find((m) => m.id === id);
  if (!src) return s;
  const copy: MechanismOfAction = {
    ...src,
    id: makeId("moa"),
    status: "amber",
    theories: src.theories.map((t) => ({
      ...t,
      id: makeId("thy"),
      references: t.references.map((r) => ({ ...r, id: makeId("ref") })),
    })),
    provenance: blankProvenance(src.provenance.sectionId),
    history: [event("duplicated", `Duplicated from ${moaTitle(s, id)} (${src.provenance.cardRevision})`)],
  };
  const mechanisms = [...s.mechanisms];
  mechanisms.splice(mechanisms.indexOf(src) + 1, 0, copy);
  return { ...s, mechanisms };
}

export function deleteMechanism(s: WorkflowState, id: string): WorkflowState {
  return {
    mechanisms: s.mechanisms.filter((m) => m.id !== id),
    features: s.features.filter((f) => f.moaId !== id),
  };
}

/** Remove a theory; features derived from it are re-linked to the first remaining theory. */
export function removeTheory(s: WorkflowState, moaId: string, theoryId: string): WorkflowState {
  const moa = s.mechanisms.find((m) => m.id === moaId);
  if (!moa || moa.theories.length <= 1) return s;
  const removed = moa.theories.find((t) => t.id === theoryId);
  const remaining = moa.theories.filter((t) => t.id !== theoryId);
  return {
    mechanisms: s.mechanisms.map((m) =>
      m.id === moaId
        ? { ...m, theories: remaining, history: [...m.history, event("edited", `Clinical theory '${removed?.title}' removed`)] }
        : m
    ),
    features: s.features.map((f) =>
      f.moaId === moaId && f.theoryId === theoryId
        ? {
            ...f,
            theoryId: remaining[0].id,
            history: [
              ...f.history,
              event("linked", `Re-linked to '${remaining[0].title}' after '${removed?.title}' was removed`),
            ],
          }
        : f
    ),
  };
}

/* ---------- features ---------- */

export function addFeature(s: WorkflowState, moaId: string, theoryId?: string): { state: WorkflowState; id: string } {
  const moa = s.mechanisms.find((m) => m.id === moaId);
  const tid = theoryId ?? moa?.theories[0]?.id ?? "";
  const theory = moa?.theories.find((t) => t.id === tid);
  const id = makeId("feat");
  return {
    id,
    state: {
      ...s,
      features: [
        ...s.features,
        {
          id,
          moaId,
          theoryId: tid,
          designTheory: "",
          featureConcept: "",
          supportDocuments: [],
          status: "red",
          provenance: blankProvenance(`S-5.${s.features.length + 1}`),
          history: [event("created", `Card created from theory '${theory?.title ?? "—"}'`)],
        },
      ],
    },
  };
}

export function relinkFeature(s: WorkflowState, id: string, theoryId: string): WorkflowState {
  const f = s.features.find((x) => x.id === id);
  const moa = f && s.mechanisms.find((m) => m.id === f.moaId);
  const t = moa?.theories.find((x) => x.id === theoryId);
  return {
    ...s,
    features: s.features.map((x) =>
      x.id === id
        ? { ...x, theoryId, history: [...x.history, event("linked", `Linked to clinical theory '${t?.title}'`)] }
        : x
    ),
  };
}

export function duplicateFeature(s: WorkflowState, id: string): WorkflowState {
  const src = s.features.find((f) => f.id === id);
  if (!src) return s;
  const copy: Feature = {
    ...src,
    id: makeId("feat"),
    status: "amber",
    supportDocuments: src.supportDocuments.map((d) => ({ ...d, id: makeId("doc") })),
    provenance: blankProvenance(src.provenance.sectionId),
    history: [event("duplicated", `Duplicated from ${featureTitle(s, src)} (${src.provenance.cardRevision})`)],
  };
  const features = [...s.features];
  features.splice(features.indexOf(src) + 1, 0, copy);
  return { ...s, features };
}

export function deleteFeature(s: WorkflowState, id: string): WorkflowState {
  return { ...s, features: s.features.filter((f) => f.id !== id) };
}

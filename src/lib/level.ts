"use client";

/**
 * Feature Development level: instructions (SOP), card definitions, the
 * stakeholders designated at project set-up, and per-browser training
 * profiles. In production these come from the QMS; here they are fixed.
 */
import { useSyncExternalStore } from "react";

export interface LevelInstructions {
  id: string;
  title: string;
  /** Instruction revision the user must be trained to before entering data. */
  revision: string;
  effectiveDate: string;
  definition: string;
  input: string;
  output: string;
  /** Ordered card sequence for the level; ids match CARD_INSTRUCTIONS. */
  sequence: { cardType: CardType; label: string; summary: string }[];
  guidelines: string[];
}

export type CardType = "moa" | "feature" | "effectiveness" | "market-map";

export interface CardInstructions {
  cardType: CardType;
  /** Training-matrix id for these instructions. */
  id: string;
  title: string;
  shortTitle: string;
  revision: string;
  definition: string;
  fields: { name: string; definition: string }[];
  completion: string[];
}

/** Programme framing the level sits under (shown at the top of the level instructions). */
export const CONTEXT = {
  initiative:
    "Provide a guided software solution for a medical device company in a regulated manner to develop and sustain hardware / system related medical device products.",
  epic: "Provide a guided software solution that drives the development steps for device developers to create a medical device system in a regulated manner to achieve a high safety and efficacious design for launch, and stores all documented development history in a regulated manner to achieve high quality documentation for future audits.",
  userStory:
    "As a user, I want a step by step process to select my device's novel hardware related feature designs that will realize the improvements for user needs previously identified.",
};

export const LEVEL: LevelInstructions = {
  id: "SOP-FD",
  title: "Feature Development",
  revision: "C",
  effectiveDate: "2026-10-01",
  definition:
    "Feature Development derives, for each User Need designated for improvement, the clinical mechanism(s) by which the need can be met, and from those mechanisms the candidate features and their conceptual designs.",
  input:
    "User Needs created and finalized in the previous level, each designated Maintain or Improve. Needs designated for improvement typically require novel feature designs; they are the starting point for this level.",
  output:
    "The features selected, with a conceptual design that is a solution to the user needs requiring improvement, and visible traceability of the derivation from need → mechanism → feature.",
  sequence: [
    {
      cardType: "moa",
      label: "Clinical Mechanism of Action",
      summary: "One card per Improve user need: the clinical theories that explain how the need can be met, each with its research references.",
    },
    {
      cardType: "feature",
      label: "Feature Identification",
      summary: "One card per clinical theory, pre-populated with that theory: design theory, potential feature concept and drawings / CAD.",
    },
    {
      cardType: "effectiveness",
      label: "Feature Concept Effectiveness",
      summary: "One card per feature concept: prototype evaluation or testing, and whether a successful, acceptable prototype was produced.",
    },
    {
      cardType: "market-map",
      label: "Market Design Map",
      summary: "All acceptable concepts traced need → theory → design → concept. Select which go forward, with justification. The final map is the level output.",
    },
  ],
  guidelines: [
    "Open the Level instructions and confirm your training profile is current to this revision before entering data. Entry is blocked until it is.",
    "Work the cards in sequence. Later cards may be drafted in parallel while an earlier card is in review; their pre-populated text follows the author-approved language and updates if it changes.",
    "Each card type has its own instructions revision in the training matrix. Training to the level does not cover a card whose instructions were revised later.",
    "If more than one mechanism could address the need, list each as a separate Clinical Theory on the same card. Do not create a second card for the same need.",
    "Reference or attach the research used for every theory. An unreferenced theory cannot pass review.",
    "When the draft is complete, approve it with your login credentials. This records your approval and date and routes the card to the designated stakeholders.",
    "Stakeholders add edits or comments and approve. Any feedback returns the card to you to reconcile; a round with no feedback and all approvals finalizes the card.",
    "A finalized card is locked. Changes go through the change process (separate workflow).",
  ],
};

export const CARD_INSTRUCTIONS: Record<CardType, CardInstructions> = {
  moa: {
    cardType: "moa",
    id: "WI-FD-01",
    title: "Clinical Mechanism of Action",
    shortTitle: "Mechanism",
    revision: "C",
    definition:
      "The clinical pathway(s) by which a device could change the outcome named in the User Need. Each pathway is captured as a Clinical Theory: a falsifiable statement of why an intervention at that point would improve the need, supported by cited research.",
    fields: [
      { name: "UN to Improve", definition: "Carried from the User Needs level; only needs designated Improve, not Maintain. Read-only here; it is the need this card must address." },
      { name: "Clinical Theory", definition: "One row per mechanism by which acting on the need produces a clinical effect: a short title (e.g. Biofilm suppression) and a statement of the causal chain (what the device changes, and why that changes the outcome). Add a second row if a second distinct mechanism could address the need. Features on the next card are derived from a specific theory." },
      { name: "Clinical Theory References", definition: "Journal, guideline, standard or internal sources used to derive the theory on the same row. Every theory needs at least one." },
      { name: "Record strip", definition: "Procedure ID and revision, section ID and revision, card history, card revision, revision date and active conflict. System-maintained." },
    ],
    completion: ["At least one theory with a statement or attached source.", "Every theory has at least one reference.", "Improvement confirmed (not maintenance)."],
  },
  feature: {
    cardType: "feature",
    id: "WI-FD-02",
    title: "Feature Identification",
    shortTitle: "Feature",
    revision: "D",
    definition:
      "A candidate feature derived from a specific Clinical Theory. The theory is pre-populated from the Clinical Mechanism of Action card (author-approved language) and cannot be edited here.",
    fields: [
      { name: "Clinical Theory", definition: "Pre-populated from the parent card. Follows the author-approved language until that card is finalized." },
      { name: "Design Theory", definition: "How the design produces the clinical effect described by the theory." },
      { name: "Potential Feature Concept", definition: "Name and description of the concrete feature proposed, specific enough to prototype." },
      { name: "Documents", definition: "Drawings, sketches or CAD PDFs that help understand the design of the concept." },
    ],
    completion: ["Design theory and concept both stated.", "At least one drawing or CAD document attached."],
  },
  effectiveness: {
    cardType: "effectiveness",
    id: "WI-FD-03",
    title: "Feature Concept Effectiveness",
    shortTitle: "Effectiveness",
    revision: "A",
    definition: "Evaluation of a prototype of the feature concept. Records what was built and tested, the evidence, and whether a successful, acceptable prototype was produced.",
    fields: [
      { name: "Feature Concept", definition: "Pre-populated from the Feature Identification card." },
      { name: "Evaluation", definition: "What was prototyped, how it was evaluated or tested, and the result." },
      { name: "Documents", definition: "Test reports, evaluation records, bench data for the prototype." },
      { name: "Acceptable prototype", definition: "Designation of whether a successful prototype was created and is acceptable. Only acceptable concepts flow into the Market Design Map." },
    ],
    completion: ["Evaluation recorded.", "Acceptability designated (acceptable / not acceptable)."],
  },
  "market-map": {
    cardType: "market-map",
    id: "WI-FD-04",
    title: "Market Design Map",
    shortTitle: "Market map",
    revision: "B",
    definition:
      "Every acceptable feature concept, traced User Need → Clinical Theory → Design Theory → Feature Concept. The author selects which concepts go forward in the design and justifies each selection or rejection. On stakeholder approval the map closes as the level output, showing only selected features.",
    fields: [
      { name: "Traceability columns", definition: "Pre-populated; read-only." },
      { name: "Selected", definition: "Whether this concept is included in the design going forward." },
      { name: "Justification", definition: "Factors and judgement behind selecting or not selecting." },
    ],
    completion: ["Every viable concept has a selection and a justification.", "At least one concept selected."],
  },
};

export const CARD_TYPES: CardType[] = ["moa", "feature", "effectiveness", "market-map"];

/* ---------- people ---------- */

export interface Stakeholder {
  name: string;
  role: string;
}

/** Designated at project set-up to approve Feature Development cards. */
export const STAKEHOLDERS: Stakeholder[] = [
  { name: "Dr. A. Okafor", role: "Clinical" },
  { name: "S. Lindqvist", role: "Design Engineering" },
  { name: "P. Nakamura", role: "Regulatory / Quality" },
];

export const AUTHOR: Stakeholder = { name: "M. Reyes", role: "Program Management (author)" };

/** Who the shared login is acting as. The demo has one login, so the persona is chosen in the header. */
export const PERSONAS: Stakeholder[] = [AUTHOR, ...STAKEHOLDERS];

/* ---------- per-browser state: persona + training profiles ---------- */

const PERSONA_KEY = "fw-level-persona";
const TRAINING_KEY = "fw-training-profiles";

export interface TrainingRecord {
  revision: string;
  at: string;
  userId: string;
}
type Profiles = Record<string, Record<string, TrainingRecord>>; // persona → instruction id → record

let persona: string = AUTHOR.name;
let profiles: Profiles = {};
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    persona = window.localStorage.getItem(PERSONA_KEY) ?? AUTHOR.name;
    profiles = JSON.parse(window.localStorage.getItem(TRAINING_KEY) ?? "{}") as Profiles;
  } catch {
    /* ignore */
  }
}
function emit() {
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  load();
  listeners.add(l);
  return () => listeners.delete(l);
}

export function usePersona() {
  return useSyncExternalStore(subscribe, () => persona, () => AUTHOR.name);
}
export function setPersona(name: string) {
  persona = name;
  try {
    window.localStorage.setItem(PERSONA_KEY, name);
  } catch {
    /* ignore */
  }
  emit();
}

const EMPTY: Profiles = {};
export function useTrainingProfiles() {
  return useSyncExternalStore(subscribe, () => profiles, () => EMPTY);
}
export function recordTraining(personaName: string, instructionId: string, rec: TrainingRecord) {
  profiles = { ...profiles, [personaName]: { ...(profiles[personaName] ?? {}), [instructionId]: rec } };
  try {
    window.localStorage.setItem(TRAINING_KEY, JSON.stringify(profiles));
  } catch {
    /* ignore */
  }
  emit();
}
export function clearTraining() {
  profiles = {};
  try {
    window.localStorage.removeItem(TRAINING_KEY);
  } catch {
    /* ignore */
  }
  emit();
}

/** Trained to the current revision of the level instructions? */
export function isTrained(p: Profiles, personaName: string, level: LevelInstructions = LEVEL) {
  return p[personaName]?.[level.id]?.revision === level.revision;
}
/** Trained to the current revision of one card's instructions? */
export function isTrainedForCard(p: Profiles, personaName: string, t: CardType) {
  const c = CARD_INSTRUCTIONS[t];
  return p[personaName]?.[c.id]?.revision === c.revision;
}
/** What blocks data entry on a card, if anything. */
export function trainingGap(p: Profiles, personaName: string, t: CardType): "level" | "card" | null {
  if (!isTrained(p, personaName)) return "level";
  if (!isTrainedForCard(p, personaName, t)) return "card";
  return null;
}
export function personaOf(name: string): Stakeholder {
  return PERSONAS.find((p) => p.name === name) ?? { name, role: "" };
}

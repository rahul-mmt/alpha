/**
 * The major workflow phases shown on the rolodex, in process order.
 *
 * Only "Feature Development" is backed by live data (the shared WorkflowState
 * used by the canvas and wizard). The others expand to placeholder cards that
 * mirror the whiteboard, so the rolodex shows the full shape of the process.
 */

export type PlaceholderTone = "neutral" | "green" | "violet";

export interface PlaceholderCard {
  title: string;
  tone?: PlaceholderTone;
  /** Rough footprint on the whiteboard — drives card size. */
  size?: "sm" | "md" | "lg";
}

export interface PlaceholderColumn {
  cards: PlaceholderCard[];
}

export interface Phase {
  id: string;
  title: string;
  note?: string;
  /** Live board, or placeholder columns laid out left → right. */
  board: { kind: "feature-development" } | { kind: "user-needs" } | { kind: "placeholder"; columns: PlaceholderColumn[] };
}

export const PHASES: Phase[] = [
  {
    id: "idea-initiation",
    title: "Idea Initiation",
    board: {
      kind: "placeholder",
      columns: [
        { cards: [{ title: "Idea Initiation", tone: "green", size: "md" }] },
        { cards: [{ title: "Idea Stage Gate", tone: "green", size: "md" }] },
      ],
    },
  },
  {
    id: "patient-journey-research",
    title: "Patient Journey Research",
    board: {
      kind: "placeholder",
      columns: [
        { cards: [{ title: "Clinical Phases Identification", size: "lg" }] },
        { cards: [{ title: "Clinical Phases Identification – Map", size: "lg" }] },
      ],
    },
  },
  {
    id: "clinical-phase-research",
    title: "Clinical Phase Research",
    board: {
      kind: "placeholder",
      columns: [{ cards: [{ title: "Clinical Phase Research Plan", size: "lg" }] }],
    },
  },
  {
    id: "clinical-segment-research",
    title: "Clinical Segment Research",
    board: {
      kind: "placeholder",
      columns: [
        { cards: [{ title: "Clinical Segment Map", tone: "violet", size: "md" }] },
        { cards: [{ title: "Research Plan – Instance", size: "lg" }] },
        { cards: [{ title: "Potential Need Derivation", size: "lg" }] },
        { cards: [{ title: "User Needs", tone: "violet", size: "lg" }] },
      ],
    },
  },
  {
    id: "user-needs",
    title: "User Needs",
    note: "Capture needs as cards; tag which ones Improve vs. Maintain",
    board: { kind: "user-needs" },
  },
  {
    id: "feature-development",
    title: "Feature Development",
    note: "Only Improve UNs, NOT Maintain UNs",
    board: { kind: "feature-development" },
  },
  {
    id: "mvp-development",
    title: "MVP Development",
    board: {
      kind: "placeholder",
      columns: [
        { cards: [{ title: "Procedure Map", size: "sm" }] },
        { cards: [{ title: "System Architecture", tone: "violet", size: "md" }] },
        {
          cards: [
            { title: "Market Risk 1", size: "sm" },
            { title: "Market Risk 2", size: "sm" },
            { title: "Market Risk 3", size: "sm" },
            { title: "Market Risk 4", size: "sm" },
          ],
        },
        {
          cards: [
            { title: "Device A – Section", tone: "green", size: "md" },
            { title: "Device B – Section", tone: "green", size: "md" },
          ],
        },
        { cards: [{ title: "Section Verification", size: "sm" }] },
        { cards: [{ title: "User Prototype", size: "sm" }] },
      ],
    },
  },
];

export const DEFAULT_PHASE_ID = "feature-development";

export function phaseNodeId(id: string) {
  return `phase-${id}`;
}

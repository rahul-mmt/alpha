export type Status = "red" | "amber" | "green";

export const STATUS_META: Record<Status, { label: string; hint: string; color: string }> = {
  red: { label: "Blocked", hint: "Open conflict or missing evidence", color: "#e2513a" },
  amber: { label: "In review", hint: "Drafted, awaiting clinical / design sign-off", color: "#f0b323" },
  green: { label: "Approved", hint: "Reviewed and released at current revision", color: "#6fbf46" },
};

export type ReviewerRole = "Clinical" | "Design Engineering" | "Regulatory / Quality" | "Program Management";
export const REVIEWER_ROLES: ReviewerRole[] = [
  "Clinical",
  "Design Engineering",
  "Regulatory / Quality",
  "Program Management",
];

export type ReferenceKind = "journal" | "guideline" | "standard" | "internal";
export const REFERENCE_KINDS: Record<ReferenceKind, { label: string; className: string }> = {
  journal: { label: "Journal", className: "bg-sky-100 text-sky-800" },
  guideline: { label: "Guideline", className: "bg-violet-100 text-violet-800" },
  standard: { label: "Standard", className: "bg-amber-100 text-amber-800" },
  internal: { label: "Internal", className: "bg-neutral-200 text-neutral-700" },
};

export type DocKind = "protocol" | "report" | "plan" | "review" | "spec";
export const DOC_KINDS: Record<DocKind, { label: string; className: string }> = {
  protocol: { label: "Protocol", className: "bg-sky-100 text-sky-800" },
  report: { label: "Report", className: "bg-emerald-100 text-emerald-800" },
  plan: { label: "Plan", className: "bg-violet-100 text-violet-800" },
  review: { label: "Review", className: "bg-amber-100 text-amber-800" },
  spec: { label: "Spec", className: "bg-neutral-200 text-neutral-700" },
};

export interface Reference {
  id: string;
  kind: ReferenceKind;
  citation: string;
}

export interface TheoryFile {
  name: string;
  size: number;
  type: string;
  addedAt: string;
  /** Inline copy for small files so the demo can re-download it. Omitted for large files. */
  dataUrl?: string;
  /** Extracted text for plain-text / markdown uploads. */
  text?: string;
}

export interface ClinicalTheory {
  id: string;
  title: string;
  statement: string;
  references: Reference[];
  /** Optional source document the theory is taken from (e.g. a white paper or literature review). */
  file?: TheoryFile;
}

export interface SupportDocument {
  id: string;
  kind: DocKind;
  code: string;
  title: string;
}

export interface SignOff {
  reviewer: string;
  role: ReviewerRole;
  rationale: string;
  from: Status;
  to: Status;
  revision: string;
}

export type HistoryEventType = "created" | "edited" | "status" | "conflict" | "duplicated" | "linked";

export interface HistoryEvent {
  id: string;
  at: string; // ISO timestamp
  type: HistoryEventType;
  summary: string;
  signOff?: SignOff;
}

export interface Provenance {
  procedureId: string;
  procedureRevision: string;
  sectionId: string;
  sectionRevision: string;
  cardRevision: string;
  revisionDate: string;
  activeConflict: boolean;
  conflictReason?: string;
}

export interface MechanismOfAction {
  id: string;
  /** Unmet Need (UN) this mechanism is meant to *improve* — never merely maintain. */
  unmetNeed: string;
  /** Wizard gate: the author confirmed this UN is an improvement, not maintenance. */
  improvementConfirmed?: boolean;
  theories: ClinicalTheory[];
  status: Status;
  provenance: Provenance;
  history: HistoryEvent[];
}

export interface Feature {
  id: string;
  moaId: string;
  /** Which of the parent's clinical theories this feature is derived from. */
  theoryId: string;
  designTheory: string;
  featureConcept: string;
  supportDocuments: SupportDocument[];
  status: Status;
  provenance: Provenance;
  history: HistoryEvent[];
}

export interface WorkflowState {
  mechanisms: MechanismOfAction[];
  features: Feature[];
}

export type Card = MechanismOfAction | Feature;

export function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function nowISO() {
  return new Date().toISOString();
}

export function blankProvenance(sectionId: string): Provenance {
  return {
    procedureId: "PR-0102",
    procedureRevision: "B",
    sectionId,
    sectionRevision: "1",
    cardRevision: "v1",
    revisionDate: todayISO(),
    activeConflict: false,
  };
}

export function event(type: HistoryEventType, summary: string, signOff?: SignOff): HistoryEvent {
  return { id: makeId("ev"), at: nowISO(), type, summary, signOff };
}

export function blankTheory(n: number): ClinicalTheory {
  return { id: makeId("thy"), title: `Theory ${n}`, statement: "", references: [] };
}

export function nextRevision(rev: string) {
  const n = parseInt(rev.replace(/\D/g, ""), 10) || 0;
  return `v${n + 1}`;
}

export function lastSignOff(card: Card): HistoryEvent | undefined {
  for (let i = card.history.length - 1; i >= 0; i--) {
    if (card.history[i].signOff) return card.history[i];
  }
  return undefined;
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function theoryHasContent(t: ClinicalTheory) {
  return t.statement.trim().length > 0 || !!t.file;
}

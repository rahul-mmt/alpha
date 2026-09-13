import { theoryHasContent, type Feature, type MechanismOfAction } from "@/lib/types";

export type StepId = "unmet-need" | "theories" | "features" | "review";

export const STEPS: { id: StepId; title: string; subtitle: string }[] = [
  { id: "unmet-need", title: "Unmet Need", subtitle: "What are we improving?" },
  { id: "theories", title: "Clinical Theories", subtitle: "Why will it work, and says who?" },
  { id: "features", title: "Features", subtitle: "What could we build?" },
  { id: "review", title: "Review & sign-off", subtitle: "Release this revision" },
];

export interface StepCheck {
  complete: boolean;
  /** Blocking issues — Next is disabled while any exist. */
  errors: string[];
  /** Non-blocking advice. */
  warnings: string[];
}

export function checkStep(id: StepId, moa: MechanismOfAction, features: Feature[]): StepCheck {
  const errors: string[] = [];
  const warnings: string[] = [];
  switch (id) {
    case "unmet-need":
      if (moa.unmetNeed.trim().length < 10) errors.push("Describe the unmet need in at least a sentence.");
      if (!moa.improvementConfirmed) errors.push("Confirm this need is an improvement, not maintenance.");
      break;
    case "theories":
      if (moa.theories.length === 0) errors.push("Add at least one clinical theory.");
      moa.theories.forEach((t, i) => {
        if (!t.title.trim()) errors.push(`Theory ${i + 1} needs a title.`);
        if (!theoryHasContent(t)) errors.push(`Theory ${i + 1} needs a statement or an attached source file.`);
        if (t.references.length === 0) warnings.push(`'${t.title || `Theory ${i + 1}`}' has no references.`);
        t.references.forEach((r, j) => {
          if (!r.citation.trim()) errors.push(`Reference ${j + 1} on '${t.title || `Theory ${i + 1}`}' is empty.`);
        });
      });
      break;
    case "features":
      if (features.length === 0) warnings.push("No features yet. You can add them later from the canvas.");
      features.forEach((f, i) => {
        if (!f.featureConcept.trim()) errors.push(`Feature ${i + 1} needs a concept.`);
      });
      break;
    case "review":
      if (moa.status === "red") warnings.push("Mechanism is still Blocked. Sign off to move it to In review or Approved.");
      if (moa.provenance.activeConflict) warnings.push("An active conflict is open; approval is blocked until it is resolved.");
      break;
  }
  return { complete: errors.length === 0, errors, warnings };
}

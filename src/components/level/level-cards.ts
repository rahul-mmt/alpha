/**
 * The ordered card sequence of the Feature Development level, derived from
 * the shared state. Card ids double as review-record keys.
 */
import type { ClinicalTheory, Feature, MechanismOfAction, WorkflowState } from "@/lib/types";
import type { CardType } from "@/lib/level";
import type { UserNeedCard } from "@/lib/user-needs";

export type LevelCard =
  | { kind: "moa"; id: string; label: string; moa: MechanismOfAction; need?: UserNeedCard; index: number }
  | { kind: "feature"; id: string; label: string; feature: Feature; moa: MechanismOfAction; theory?: ClinicalTheory; index: number }
  | { kind: "effectiveness"; id: string; label: string; feature: Feature; moa: MechanismOfAction; theory?: ClinicalTheory; index: number }
  | { kind: "market-map"; id: "mdm"; label: string };

export const MDM_ID = "mdm";
export const fceId = (featureId: string) => `fce:${featureId}`;

export function needLabel(i: number) {
  return `UN-${String(i + 1).padStart(2, "0")}`;
}

export function buildLevelCards(state: WorkflowState, needs: UserNeedCard[]): LevelCard[] {
  const out: LevelCard[] = [];
  const needIndex = (m: MechanismOfAction) => {
    const i = needs.findIndex((n) => n.id === m.userNeedId);
    return i === -1 ? state.mechanisms.indexOf(m) : i;
  };
  state.mechanisms.forEach((m, mi) => {
    out.push({ kind: "moa", id: m.id, label: needLabel(needIndex(m)), moa: m, need: needs.find((n) => n.id === m.userNeedId), index: mi });
  });
  const feats: { feature: Feature; moa: MechanismOfAction; theory?: ClinicalTheory }[] = [];
  for (const m of state.mechanisms) {
    // Order features by theory order within the mechanism.
    const mine = state.features.filter((f) => f.moaId === m.id);
    const ordered = [...mine].sort((a, b) => m.theories.findIndex((t) => t.id === a.theoryId) - m.theories.findIndex((t) => t.id === b.theoryId));
    for (const f of ordered) feats.push({ feature: f, moa: m, theory: m.theories.find((t) => t.id === f.theoryId) });
  }
  feats.forEach((x, i) => out.push({ kind: "feature", id: x.feature.id, label: `F-${String(i + 1).padStart(2, "0")}`, ...x, index: i }));
  feats.forEach((x, i) => out.push({ kind: "effectiveness", id: fceId(x.feature.id), label: `F-${String(i + 1).padStart(2, "0")}`, ...x, index: i }));
  out.push({ kind: "market-map", id: MDM_ID, label: "Level output" });
  return out;
}

export function cardTypeOf(c: LevelCard): CardType {
  return c.kind;
}

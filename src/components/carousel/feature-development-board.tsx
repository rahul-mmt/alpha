"use client";

import { useMemo } from "react";
import { Plus } from "lucide-react";
import * as A from "@/lib/actions";
import { logEdit } from "@/lib/store";
import type { Feature, MechanismOfAction, Status, WorkflowState } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MoaCard, type Updater } from "@/components/workflow/moa-card";
import { FeatureCard } from "@/components/workflow/feature-card";

export type SetState = (updater: WorkflowState | ((s: WorkflowState) => WorkflowState)) => void;

/**
 * The live Feature Development board — the same two-stage layout the canvas
 * uses (Clinical Mechanism of Action → Feature Identification), rendered to the
 * right of the rolodex. Edits go through the shared store, so changes made
 * here appear on the canvas and in the wizard too.
 */
export function FeatureDevelopmentBoard({
  state,
  setState,
  compact,
  onRequestStatus,
  onHistory,
  onConflict,
}: {
  state: WorkflowState;
  setState: SetState;
  compact: boolean;
  onRequestStatus: (cardId: string, to: Status) => void;
  onHistory: (cardId: string) => void;
  onConflict: (cardId: string) => void;
}) {
  const changeMoa = (id: string) => (updater: Updater<MechanismOfAction>, summary: string) => {
    setState((s) => A.editMechanism(s, id, updater));
    logEdit(id, summary);
  };
  const changeFeature = (id: string) => (updater: Updater<Feature>, summary: string) => {
    setState((s) => A.editFeature(s, id, updater));
    logEdit(id, summary);
  };

  const featureCountByTheory = useMemo(() => {
    const out: Record<string, number> = {};
    for (const f of state.features) out[f.theoryId] = (out[f.theoryId] ?? 0) + 1;
    return out;
  }, [state.features]);

  return (
    <div className="flex flex-col gap-14">
      <div className="flex gap-16">
        <StageHeading className="w-[460px]">Stage 1 · Clinical Mechanism of Action</StageHeading>
        <StageHeading className="w-[600px]">Stage 2 · Feature Identification</StageHeading>
      </div>

      {state.mechanisms.length === 0 && (
        <div className="w-[460px] rounded-md border border-dashed border-neutral-300 bg-white/70 p-6 text-sm text-neutral-500">
          No mechanisms yet. Add one to start the workflow.
        </div>
      )}

      {state.mechanisms.map((m, mi) => {
        const feats = state.features.filter((f) => f.moaId === m.id);
        return (
          <div key={m.id} className="flex items-start gap-16">
            <div className="shrink-0">
              <MoaCard
                moa={m}
                index={mi}
                compact={compact}
                featureCountByTheory={featureCountByTheory}
                onChange={changeMoa(m.id)}
                onRemoveTheory={(tid) => setState((s) => A.removeTheory(s, m.id, tid))}
                onRequestStatus={(st) => onRequestStatus(m.id, st)}
                onHistory={() => onHistory(m.id)}
                onConflict={() => onConflict(m.id)}
                onAddFeature={(tid) => setState((s) => A.addFeature(s, m.id, tid).state)}
                onDuplicate={() => setState((s) => A.duplicateMechanism(s, m.id))}
                onDelete={() => setState((s) => A.deleteMechanism(s, m.id))}
              />
            </div>

            <div className="flex flex-col gap-8">
              {feats.map((f, fi) => (
                <FeatureCard
                  key={f.id}
                  feature={f}
                  parent={m}
                  index={fi}
                  compact={compact}
                  onChange={changeFeature(f.id)}
                  onRelink={(tid) => setState((s) => A.relinkFeature(s, f.id, tid))}
                  onRequestStatus={(st) => onRequestStatus(f.id, st)}
                  onHistory={() => onHistory(f.id)}
                  onConflict={() => onConflict(f.id)}
                  onDuplicate={() => setState((s) => A.duplicateFeature(s, f.id))}
                  onDelete={() => setState((s) => A.deleteFeature(s, f.id))}
                />
              ))}
              <button
                type="button"
                onClick={() => setState((s) => A.addFeature(s, m.id).state)}
                className="flex w-[600px] items-center justify-center gap-2 rounded-md border border-dashed border-neutral-300 bg-white/60 py-3 text-xs font-medium text-neutral-500 transition hover:border-[#08A9AD] hover:text-[#08A9AD]"
              >
                <Plus className="size-3.5" />
                Add feature for mechanism {mi + 1}
                {m.theories.length > 1 && <span className="text-neutral-400">· pick the theory from the card menu</span>}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StageHeading({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("text-[11px] font-semibold uppercase tracking-wider text-neutral-500", className)}>{children}</div>;
}

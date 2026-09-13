"use client";

import { ArrowRight, Plus } from "lucide-react";
import { lastSignOff, STATUS_META, type MechanismOfAction, type WorkflowState } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TheoryFileChip } from "@/components/workflow/theory-file";

export function StepChoose({
  state,
  onPick,
  onCreate,
}: {
  state: WorkflowState;
  onPick: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight text-[#00224B]">Which mechanism are we working on?</h1>
      <p className="mt-1 text-sm text-neutral-600">
        The wizard walks one Clinical Mechanism of Action at a time: unmet need, clinical theories and their
        references, derived features, then sign-off. Everything you enter here appears on the canvas.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {state.mechanisms.map((m, i) => (
          <MechanismTile key={m.id} moa={m} index={i} featureCount={state.features.filter((f) => f.moaId === m.id).length} onPick={() => onPick(m.id)} />
        ))}
        <button
          type="button"
          onClick={onCreate}
          className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 bg-white/60 p-6 text-sm font-medium text-neutral-600 transition hover:border-[#08A9AD] hover:text-[#08A9AD]"
        >
          <Plus className="size-6" />
          Start a new mechanism
        </button>
      </div>
    </div>
  );
}

function MechanismTile({
  moa,
  index,
  featureCount,
  onPick,
}: {
  moa: MechanismOfAction;
  index: number;
  featureCount: number;
  onPick: () => void;
}) {
  const so = lastSignOff(moa);
  const file = moa.theories.find((t) => t.file)?.file;
  return (
    <button
      type="button"
      onClick={onPick}
      data-anchor={`tile-${moa.id}`}
      className={cn(
        "group flex flex-col rounded-lg border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        moa.provenance.activeConflict ? "border-red-300" : "border-neutral-200"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 rounded border border-neutral-300 border-l-[3px] border-l-[#00224B] bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-800">
          Instance {index + 1}
          <span className="font-mono text-[10px] font-normal text-neutral-500">{moa.provenance.cardRevision}</span>
        </span>
        <span className="flex items-center gap-1.5 text-xs text-neutral-600">
          <span className="size-2.5 rounded-full border border-black/30" style={{ backgroundColor: STATUS_META[moa.status].color }} />
          {STATUS_META[moa.status].label}
        </span>
      </div>
      <p className="mt-3 line-clamp-3 flex-1 text-sm text-neutral-800">
        {moa.unmetNeed || <span className="italic text-neutral-400">No unmet need written yet</span>}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
        <span>{moa.theories.length} theor{moa.theories.length === 1 ? "y" : "ies"}</span>
        <span>{moa.theories.reduce((n, t) => n + t.references.length, 0)} references</span>
        <span>{featureCount} feature{featureCount === 1 ? "" : "s"}</span>
        {file && <TheoryFileChip file={file} className="max-w-[180px]" />}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="truncate text-neutral-500">
          {so?.signOff ? `${STATUS_META[so.signOff.to].label} by ${so.signOff.reviewer}` : "No sign-off yet"}
        </span>
        <span className="flex items-center gap-1 font-medium text-[#00224B] opacity-0 transition group-hover:opacity-100">
          Continue <ArrowRight className="size-3.5" />
        </span>
      </div>
    </button>
  );
}

"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import {
  REFERENCE_KINDS,
  blankTheory,
  makeId,
  type ClinicalTheory,
  type MechanismOfAction,
  type ReferenceKind,
  type Status,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { WorkflowCard } from "./workflow-card";
import { EditableCell } from "./editable-cell";
import { EditableList } from "./editable-list";
import { AttachFileButton, TheoryFileChip } from "./theory-file";

export type Updater<T> = (prev: T) => T;

const KIND_ORDER: ReferenceKind[] = ["journal", "guideline", "standard", "internal"];

export function MoaCard({
  moa,
  index,
  compact,
  dimmed,
  featureCountByTheory,
  onChange,
  onRemoveTheory,
  onRequestStatus,
  onHistory,
  onConflict,
  onAddFeature,
  onDuplicate,
  onDelete,
}: {
  moa: MechanismOfAction;
  index: number;
  compact?: boolean;
  dimmed?: boolean;
  featureCountByTheory: Record<string, number>;
  /** Apply a functional update; `summary` is logged (debounced) to the card history. */
  onChange: (updater: Updater<MechanismOfAction>, summary: string) => void;
  onRemoveTheory: (theoryId: string) => void;
  onRequestStatus: (s: Status) => void;
  onHistory: () => void;
  onConflict: () => void;
  onAddFeature: (theoryId: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [activeId, setActiveId] = useState(moa.theories[0]?.id);
  // Falls back to the first theory if the selected one was removed.
  const active = moa.theories.find((t) => t.id === activeId) ?? moa.theories[0];

  const updateTheory = (id: string, patch: Partial<ClinicalTheory>, summary: string) =>
    onChange(
      (m) => ({ ...m, theories: m.theories.map((t) => (t.id === id ? { ...t, ...patch } : t)) }),
      summary
    );

  const addTheory = () => {
    const t = blankTheory(moa.theories.length + 1);
    onChange((m) => ({ ...m, theories: [...m.theories, t] }), `Clinical theory '${t.title}' added`);
    setActiveId(t.id);
  };

  const refs = active?.references ?? [];
  const setRefs = (next: ClinicalTheory["references"], summary: string) =>
    active && updateTheory(active.id, { references: next }, summary);

  return (
    <WorkflowCard
      nodeId={moa.id}
      title={`Clinical Mechanism of Action - Instance ${index + 1}`}
      card={moa}
      className="w-[460px]"
      accent="#00224B"
      compact={compact}
      dimmed={dimmed}
      summary={moa.unmetNeed}
      onRequestStatus={onRequestStatus}
      onHistory={onHistory}
      onConflict={onConflict}
      menu={[
        { label: `Add feature from '${active?.title ?? "theory"}'`, onSelect: () => active && onAddFeature(active.id) },
        { label: "Add clinical theory", onSelect: addTheory },
        { label: "View card history", onSelect: onHistory },
        {
          label: moa.provenance.activeConflict ? "Resolve active conflict…" : "Flag active conflict…",
          onSelect: onConflict,
        },
        { label: "Duplicate instance", onSelect: onDuplicate, separatorBefore: true },
        { label: "Delete instance", onSelect: onDelete, destructive: true },
      ]}
      columns={[
        {
          label: "UN to Improve",
          anchor: true,
          width: "1fr",
          content: (
            <EditableCell
              value={moa.unmetNeed}
              placeholder="Unmet need this mechanism improves…"
              onChange={(v) => onChange((m) => ({ ...m, unmetNeed: v }), "Unmet need edited")}
            />
          ),
        },
        {
          label: (
            <span className="flex w-full items-center justify-between">
              Clinical Theory
              <span className="rounded bg-neutral-200 px-1 font-mono text-[9px] font-normal text-neutral-600">
                {moa.theories.length}
              </span>
            </span>
          ),
          width: "1.25fr",
          content: (
            <div className="flex h-full flex-col">
              {/* Tabs */}
              <div className="flex flex-wrap items-center gap-1 border-b border-neutral-200 bg-neutral-50 px-1.5 py-1">
                {moa.theories.map((t, i) => {
                  const isActive = t.id === active?.id;
                  const n = featureCountByTheory[t.id] ?? 0;
                  return (
                    <span
                      key={t.id}
                      className={cn(
                        "inline-flex items-center rounded text-[10px] font-medium transition",
                        isActive
                          ? "bg-[#00224B] text-white shadow-sm"
                          : "bg-white text-neutral-600 ring-1 ring-neutral-200 hover:ring-[#08A9AD]"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveId(t.id)}
                        title={t.title}
                        aria-pressed={isActive}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5"
                      >
                        T{i + 1}
                        {n > 0 && (
                          <span
                            className={cn(
                              "rounded-full px-1 font-mono text-[8px]",
                              isActive ? "bg-white/20" : "bg-[#08A9AD]/15 text-[#08A9AD]"
                            )}
                            title={`${n} linked feature${n === 1 ? "" : "s"}`}
                          >
                            {n}
                          </span>
                        )}
                      </button>
                      {isActive && moa.theories.length > 1 && (
                        <button
                          type="button"
                          aria-label={`Remove theory ${t.title}`}
                          title="Remove theory (linked features move to the first remaining theory)"
                          onClick={() => onRemoveTheory(t.id)}
                          className="mr-1 rounded p-0.5 opacity-60 hover:bg-white/20 hover:opacity-100"
                        >
                          <X className="size-2.5" />
                        </button>
                      )}
                    </span>
                  );
                })}
                <button
                  type="button"
                  onClick={addTheory}
                  aria-label="Add clinical theory"
                  className="grid size-5 place-items-center rounded text-neutral-400 hover:bg-white hover:text-[#08A9AD]"
                >
                  <Plus className="size-3" />
                </button>
              </div>

              {active ? (
                <>
                  <input
                    value={active.title}
                    onChange={(e) => updateTheory(active.id, { title: e.target.value }, `Theory title edited`)}
                    placeholder="Theory title"
                    spellCheck={false}
                    className="mt-1 w-full bg-transparent px-2 text-[11px] font-semibold text-neutral-800 outline-none placeholder:text-neutral-400 focus:bg-white focus:ring-1 focus:ring-[#08A9AD]"
                  />
                  <div className="flex items-center gap-1 px-1.5 pt-1">
                    {active.file ? (
                      <TheoryFileChip
                        file={active.file}
                        className="max-w-full"
                        onRemove={() =>
                          updateTheory(active.id, { file: undefined }, `Source file removed from '${active.title}'`)
                        }
                      />
                    ) : (
                      <AttachFileButton
                        onAttach={(file) =>
                          updateTheory(active.id, { file }, `Source file '${file.name}' attached to '${active.title}'`)
                        }
                      />
                    )}
                  </div>
                  <EditableCell
                    value={active.statement}
                    placeholder={active.file ? "Summarise the theory from the attached file…" : "Why does acting on this need produce a clinical effect?"}
                    onChange={(v) =>
                      updateTheory(active.id, { statement: v }, `Clinical theory '${active.title}' revised`)
                    }
                  />
                </>
              ) : (
                <div className="p-2 text-[10px] italic text-neutral-400">No theories. Add one above.</div>
              )}
            </div>
          ),
        },
        {
          label: (
            <span className="flex w-full items-center justify-between">
              Clinical Theory References
              {active && (
                <span className="shrink-0 whitespace-nowrap font-mono text-[9px] font-normal text-neutral-500">
                  T{moa.theories.indexOf(active) + 1} · {refs.length}
                </span>
              )}
            </span>
          ),
          width: "1.25fr",
          content: active ? (
            <EditableList
              items={refs.map((r) => ({
                id: r.id,
                text: r.citation,
                chip: REFERENCE_KINDS[r.kind],
              }))}
              placeholder="Citation…"
              addLabel="Add reference"
              emptyHint={`No references yet for '${active.title}'.`}
              onChangeText={(id, v) =>
                setRefs(
                  refs.map((r) => (r.id === id ? { ...r, citation: v } : r)),
                  `Reference edited on '${active.title}'`
                )
              }
              onCycleChip={(id) =>
                setRefs(
                  refs.map((r) =>
                    r.id === id
                      ? { ...r, kind: KIND_ORDER[(KIND_ORDER.indexOf(r.kind) + 1) % KIND_ORDER.length] }
                      : r
                  ),
                  `Reference type changed on '${active.title}'`
                )
              }
              onAdd={() =>
                setRefs(
                  [...refs, { id: makeId("ref"), kind: "journal", citation: "" }],
                  `Reference added to '${active.title}'`
                )
              }
              onRemove={(id) =>
                setRefs(refs.filter((r) => r.id !== id), `Reference removed from '${active.title}'`)
              }
            />
          ) : null,
        },
      ]}
    />
  );
}

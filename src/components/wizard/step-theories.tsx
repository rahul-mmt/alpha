"use client";

import { useState } from "react";
import { FileText, Plus, Trash2 } from "lucide-react";
import {
  REFERENCE_KINDS,
  blankTheory,
  makeId,
  theoryHasContent,
  type ClinicalTheory,
  type MechanismOfAction,
  type ReferenceKind,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TheoryFileDrop } from "@/components/workflow/theory-file";
import type { Edit } from "./wizard";

export function StepTheories({
  moa,
  edit,
  featureCountByTheory,
  onRemoveTheory,
}: {
  moa: MechanismOfAction;
  edit: Edit;
  featureCountByTheory: Record<string, number>;
  onRemoveTheory: (id: string) => void;
}) {
  const [activeId, setActiveId] = useState(moa.theories[0]?.id);
  const active = moa.theories.find((t) => t.id === activeId) ?? moa.theories[0];
  const idx = active ? moa.theories.indexOf(active) : -1;

  const update = (patch: Partial<ClinicalTheory>, summary: string) =>
    active &&
    edit((m) => ({ ...m, theories: m.theories.map((t) => (t.id === active.id ? { ...t, ...patch } : t)) }), summary);

  const addTheory = () => {
    const t = blankTheory(moa.theories.length + 1);
    edit((m) => ({ ...m, theories: [...m.theories, t] }), `Clinical theory '${t.title}' added`);
    setActiveId(t.id);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-[#00224B]">Why will acting on this need produce a clinical effect?</h2>
        <p className="mt-1 text-sm text-neutral-600">
          A mechanism can rest on more than one theory. Each theory needs a statement or a source document, and should
          cite the evidence behind it. Features in the next step are derived from a specific theory.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        {/* Theory list */}
        <div className="flex flex-col gap-1">
          {moa.theories.map((t, i) => {
            const ok = t.title.trim() && theoryHasContent(t);
            const n = featureCountByTheory[t.id] ?? 0;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveId(t.id)}
                className={cn(
                  "flex items-start gap-2 rounded-md border px-3 py-2 text-left text-sm transition",
                  t.id === active?.id ? "border-[#00224B] bg-white shadow-sm" : "border-transparent hover:bg-white/70"
                )}
              >
                <span className="mt-0.5 font-mono text-[10px] text-neutral-500">T{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-neutral-800">{t.title || `Theory ${i + 1}`}</span>
                  <span className="block text-[11px] text-neutral-500">
                    {t.references.length} ref{t.references.length === 1 ? "" : "s"}
                    {n > 0 && ` · ${n} feature${n === 1 ? "" : "s"}`}
                    {t.file && (
                      <FileText className="ml-1 inline size-3 text-[#08A9AD]" aria-label="Has source file" />
                    )}
                  </span>
                </span>
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", ok ? "bg-[#6fbf46]" : "bg-[#e2513a]")} />
              </button>
            );
          })}
          <Button variant="outline" size="sm" onClick={addTheory} className="mt-2 justify-start">
            <Plus className="size-3.5" />
            Add another theory
          </Button>
        </div>

        {/* Editor */}
        {active ? (
          <div className="flex flex-col gap-5 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm" data-anchor={`theory-${active.id}`}>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-neutral-500">Theory {idx + 1} of {moa.theories.length}</span>
              <Button
                variant="ghost"
                size="sm"
                disabled={moa.theories.length <= 1}
                onClick={() => onRemoveTheory(active.id)}
                title={
                  moa.theories.length <= 1
                    ? "A mechanism needs at least one theory"
                    : "Remove this theory (linked features move to the first remaining theory)"
                }
                className="text-neutral-500 hover:text-red-600"
              >
                <Trash2 className="size-3.5" />
                Remove
              </Button>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="t-title">Title</Label>
              <Input
                id="t-title"
                value={active.title}
                onChange={(e) => update({ title: e.target.value }, "Theory title edited")}
                placeholder="Short name, e.g. Biofilm suppression"
              />
            </div>

            <div className="grid gap-2">
              <Label>Source document <span className="font-normal text-neutral-500">(optional — the theory can be a file)</span></Label>
              <TheoryFileDrop
                file={active.file}
                onAttach={(file) => update({ file }, `Source file '${file.name}' attached to '${active.title}'`)}
                onRemove={() => update({ file: undefined }, `Source file removed from '${active.title}'`)}
                onUseText={(text) => update({ statement: text.trim().slice(0, 2000) }, `Statement filled from '${active.file?.name}'`)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="t-statement">
                Statement{" "}
                {active.file && <span className="font-normal text-neutral-500">(summary of the attached file)</span>}
              </Label>
              <Textarea
                id="t-statement"
                rows={4}
                value={active.statement}
                onChange={(e) => update({ statement: e.target.value }, `Clinical theory '${active.title}' revised`)}
                placeholder="State the causal chain: what the device changes, and why that changes the outcome."
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>References</Label>
                <span className="text-xs text-neutral-500">{active.references.length} cited</span>
              </div>
              {active.references.length === 0 && (
                <p className="rounded-md border border-dashed border-neutral-300 p-3 text-xs text-neutral-500">
                  No references yet. Guidelines, journal articles, standards, or internal reviews all count.
                </p>
              )}
              <ol className="flex flex-col gap-2">
                {active.references.map((r, i) => (
                  <li key={r.id} className="flex items-start gap-2">
                    <span className="mt-2.5 w-4 text-right text-xs text-neutral-400">{i + 1}</span>
                    <Select
                      value={r.kind}
                      onValueChange={(v) =>
                        update(
                          { references: active.references.map((x) => (x.id === r.id ? { ...x, kind: v as ReferenceKind } : x)) },
                          `Reference type changed on '${active.title}'`
                        )
                      }
                    >
                      <SelectTrigger size="sm" className="w-[120px] shrink-0">
                        <SelectValue>{(v: ReferenceKind | null) => (v ? REFERENCE_KINDS[v].label : "Type")}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(REFERENCE_KINDS) as ReferenceKind[]).map((k) => (
                          <SelectItem key={k} value={k}>
                            {REFERENCE_KINDS[k].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={r.citation}
                      onChange={(e) =>
                        update(
                          { references: active.references.map((x) => (x.id === r.id ? { ...x, citation: e.target.value } : x)) },
                          `Reference edited on '${active.title}'`
                        )
                      }
                      placeholder="Author, title, journal/standard, year"
                      className="h-8 text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remove reference"
                      onClick={() =>
                        update({ references: active.references.filter((x) => x.id !== r.id) }, `Reference removed from '${active.title}'`)
                      }
                      className="text-neutral-400 hover:text-red-600"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ol>
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() =>
                  update(
                    { references: [...active.references, { id: makeId("ref"), kind: "journal", citation: "" }] },
                    `Reference added to '${active.title}'`
                  )
                }
              >
                <Plus className="size-3.5" />
                Add reference
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
            No theories yet. Add one to continue.
          </div>
        )}
      </div>
    </div>
  );
}

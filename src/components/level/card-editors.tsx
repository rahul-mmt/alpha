"use client";

import { useRef, useState } from "react";
import { Check, Link2, Paperclip, Plus, Trash2, X } from "lucide-react";
import {
  DOC_KINDS,
  REFERENCE_KINDS,
  blankTheory,
  makeId,
  type ClinicalTheory,
  type DocKind,
  type Effectiveness,
  type Feature,
  type MechanismOfAction,
  type ReferenceKind,
  type SupportDocument,
} from "@/lib/types";
import type { UserNeedCard } from "@/lib/user-needs";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HistoryDialog } from "@/components/workflow/history-dialog";
import { ProvenanceStrip } from "@/components/workflow/provenance-strip";
import type { Edit } from "@/components/wizard/wizard";
import { STATE_META } from "./card-ribbon";
import type { ReviewState } from "@/lib/types";

/* ---------- shared bits ---------- */

/** Read-only value carried in from an earlier card. */
export function Inherited({ label, state, children }: { label: string; state?: ReviewState; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-100/80 p-3">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
        <Link2 className="size-3" />
        {label}
        {state && (
          <span className={cn("ml-auto rounded border px-1 py-px text-[10px] font-normal normal-case tracking-normal", STATE_META[state].chip)}>
            {state === "finalized" ? "finalized language" : "author-approved language"}
          </span>
        )}
      </div>
      <div className="mt-1.5 text-sm text-neutral-800">{children}</div>
    </div>
  );
}

/** Typed document list with a file picker that fills in the metadata (demo keeps metadata only). */
export function DocumentsEditor({
  docs,
  onChange,
  defaultKind,
}: {
  docs: SupportDocument[];
  onChange: (next: SupportDocument[]) => void;
  defaultKind: DocKind;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const update = (id: string, p: Partial<SupportDocument>) => onChange(docs.map((d) => (d.id === id ? { ...d, ...p } : d)));
  const add = (p: Partial<SupportDocument> = {}) => onChange([...docs, { id: makeId("doc"), kind: defaultKind, code: `ATT-${docs.length + 1}`, title: "", ...p }]);
  return (
    <div className="grid gap-2">
      <Label>Documents</Label>
      <ol className="flex flex-col gap-2">
        {docs.map((d) => (
          <li key={d.id} className="flex items-center gap-2">
            <Select value={d.kind} onValueChange={(v) => update(d.id, { kind: v as DocKind })}>
              <SelectTrigger size="sm" className="w-[130px] shrink-0">
                <SelectValue>{(v: DocKind | null) => (v ? DOC_KINDS[v].label : "Type")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(DOC_KINDS) as DocKind[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {DOC_KINDS[k].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input value={d.code} onChange={(e) => update(d.id, { code: e.target.value })} placeholder="Code" className="w-[110px] shrink-0 font-mono text-xs" />
            <Input value={d.title} onChange={(e) => update(d.id, { title: e.target.value })} placeholder="Title / file name" className="min-w-0 flex-1" />
            <Button variant="ghost" size="icon-sm" aria-label="Remove document" className="text-neutral-400 hover:text-red-600" onClick={() => onChange(docs.filter((x) => x.id !== d.id))}>
              <Trash2 className="size-3.5" />
            </Button>
          </li>
        ))}
      </ol>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => add()}>
          <Plus className="size-3.5" /> Add document
        </Button>
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <Paperclip className="size-3.5" /> Attach file…
        </Button>
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) onChange([...docs, ...files.map((f, i) => ({ id: makeId("doc"), kind: defaultKind, code: `ATT-${docs.length + i + 1}`, title: f.name }))]);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

/* ---------- 1 · Clinical Mechanism of Action ---------- */

/**
 * Laid out like the Figma card: UN to Improve (read-only, spans every row) |
 * Clinical Theory | Clinical Theory References, one row per theory, with the
 * record strip underneath.
 */
export function MoaEditor({
  moa,
  need,
  needLabel,
  edit,
  onRemoveTheory,
}: {
  moa: MechanismOfAction;
  need?: UserNeedCard;
  needLabel: string;
  edit: Edit;
  onRemoveTheory: (id: string) => void;
}) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const updateTheory = (id: string, patch: Partial<ClinicalTheory>, summary: string) =>
    edit((m) => ({ ...m, theories: m.theories.map((t) => (t.id === id ? { ...t, ...patch } : t)) }), summary);
  const addTheory = () => {
    const t = blankTheory(moa.theories.length + 1);
    edit((m) => ({ ...m, theories: [...m.theories, t] }), `Clinical theory '${t.title}' added`);
  };
  const rows = Math.max(moa.theories.length, 1);

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div className="grid grid-cols-[minmax(200px,0.8fr)_1.2fr_1.2fr] text-sm">
        <div className="border-b border-neutral-200 bg-neutral-200/70 px-3 py-2 text-[13px] font-semibold text-neutral-800">UN to Improve</div>
        <div className="border-b border-l border-neutral-200 px-3 py-2 text-[13px] font-semibold text-neutral-800">Clinical Theory</div>
        <div className="border-b border-l border-neutral-200 px-3 py-2 text-[13px] font-semibold text-neutral-800">Clinical Theory References</div>

        <div className="bg-neutral-200/70 px-3 py-3" style={{ gridRow: `span ${rows + 1}` }}>
          <div className="font-mono text-[10px] font-semibold text-[#00224B]">{needLabel}</div>
          <div className="mt-1 font-semibold text-neutral-800">{need?.title || moa.unmetNeed}</div>
        </div>

        {moa.theories.map((t, i) => (
          <TheoryRow
            key={t.id}
            theory={t}
            index={i}
            canRemove={moa.theories.length > 1}
            onChange={(patch, summary) => updateTheory(t.id, patch, summary)}
            onRemove={() => onRemoveTheory(t.id)}
          />
        ))}
        {moa.theories.length === 0 && <div className="col-span-2 border-l border-neutral-200 p-3" />}

        <div className="col-span-2 border-l border-t border-neutral-200 px-3 py-2">
          <Button variant="outline" size="sm" onClick={addTheory}>
            <Plus className="size-3.5" /> Add clinical theory
          </Button>
        </div>
      </div>

      <ProvenanceStrip value={moa.provenance} historyCount={moa.history.length} onHistory={() => setHistoryOpen(true)} className="text-[11px]" />
      <HistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} title={`Clinical Mechanism of Action · ${needLabel}`} history={moa.history} />
    </div>
  );
}

function TheoryRow({
  theory,
  index,
  canRemove,
  onChange,
  onRemove,
}: {
  theory: ClinicalTheory;
  index: number;
  canRemove: boolean;
  onChange: (patch: Partial<ClinicalTheory>, summary: string) => void;
  onRemove: () => void;
}) {
  const refs = theory.references;
  const setRefs = (next: ClinicalTheory["references"], summary: string) => onChange({ references: next }, summary);
  return (
    <>
      <div className={cn("flex flex-col gap-2 border-l border-neutral-200 px-3 py-3", index > 0 && "border-t")} data-anchor={`theory-${theory.id}`}>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-neutral-500">T{index + 1}</span>
          <Input
            aria-label={`Theory ${index + 1} title`}
            value={theory.title}
            onChange={(e) => onChange({ title: e.target.value }, "Theory title edited")}
            className="h-8 font-semibold"
          />
          {canRemove && (
            <Button variant="ghost" size="icon-sm" aria-label={`Remove theory ${index + 1}`} className="text-neutral-400 hover:text-red-600" onClick={onRemove}>
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
        <Textarea
          aria-label={`Theory ${index + 1} statement`}
          rows={4}
          value={theory.statement}
          onChange={(e) => onChange({ statement: e.target.value }, `Clinical theory '${theory.title}' revised`)}
          className="text-sm"
        />
      </div>
      <div className={cn("flex flex-col gap-2 border-l border-neutral-200 px-3 py-3", index > 0 && "border-t")}>
        {refs.map((r) => (
          <div key={r.id} className="flex items-center gap-1.5">
            <Select
              value={r.kind}
              onValueChange={(v) => setRefs(refs.map((x) => (x.id === r.id ? { ...x, kind: v as ReferenceKind } : x)), `Reference type changed on '${theory.title}'`)}
            >
              <SelectTrigger size="sm" className="w-[104px] shrink-0 text-xs">
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
              aria-label="Citation"
              value={r.citation}
              onChange={(e) => setRefs(refs.map((x) => (x.id === r.id ? { ...x, citation: e.target.value } : x)), `Reference edited on '${theory.title}'`)}
              className="h-8 min-w-0 flex-1 text-xs"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Remove reference"
              className="text-neutral-400 hover:text-red-600"
              onClick={() => setRefs(refs.filter((x) => x.id !== r.id), `Reference removed from '${theory.title}'`)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => setRefs([...refs, { id: makeId("ref"), kind: "journal", citation: "" }], `Reference added to '${theory.title}'`)}
        >
          <Plus className="size-3.5" /> Add reference
        </Button>
      </div>
    </>
  );
}

/* ---------- 2 · Feature Identification ---------- */

export function FeatureEditor({
  feature,
  theory,
  theoryLabel,
  moaState,
  onChange,
}: {
  feature: Feature;
  theory?: ClinicalTheory;
  theoryLabel: string;
  moaState: ReviewState;
  onChange: (updater: (f: Feature) => Feature, summary: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Inherited label={`Clinical theory · ${theoryLabel}`} state={moaState}>
        {theory ? (
          <>
            <div className="font-semibold">{theory.title}</div>
            <div className="mt-1 text-sm text-neutral-700">{theory.statement || <span className="text-neutral-400">No statement yet</span>}</div>
            <div className="mt-1 text-[11px] text-neutral-500">
              {theory.references.length} reference{theory.references.length === 1 ? "" : "s"}
              {theory.file && ` · source ${theory.file.name}`}
            </div>
          </>
        ) : (
          <span className="text-neutral-400">Theory not found on the parent card</span>
        )}
      </Inherited>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`${feature.id}-dt`}>Design theory</Label>
          <Textarea
            id={`${feature.id}-dt`}
            rows={4}
            value={feature.designTheory}
            onChange={(e) => onChange((f) => ({ ...f, designTheory: e.target.value }), "Design theory edited")}
            placeholder="How the design produces the clinical effect the theory describes"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${feature.id}-fc`}>Potential feature concept</Label>
          <Textarea
            id={`${feature.id}-fc`}
            rows={4}
            value={feature.featureConcept}
            onChange={(e) => onChange((f) => ({ ...f, featureConcept: e.target.value }), "Feature concept edited")}
            placeholder="Name and describe the concept, specific enough to prototype"
          />
        </div>
      </div>

      <DocumentsEditor
        docs={feature.supportDocuments}
        onChange={(next) => onChange((f) => ({ ...f, supportDocuments: next }), "Documents edited")}
        defaultKind="drawing"
      />
    </div>
  );
}

/* ---------- 3 · Feature Concept Effectiveness ---------- */

const EMPTY_EFF: Effectiveness = { evaluation: "", documents: [] };

export function EffectivenessEditor({
  feature,
  featureState,
  onChange,
}: {
  feature: Feature;
  featureState: ReviewState;
  onChange: (updater: (f: Feature) => Feature, summary: string) => void;
}) {
  const eff = feature.effectiveness ?? EMPTY_EFF;
  const patch = (p: Partial<Effectiveness>, summary: string) => onChange((f) => ({ ...f, effectiveness: { ...(f.effectiveness ?? EMPTY_EFF), ...p } }), summary);
  const acc = eff.prototypeAcceptable;
  return (
    <div className="flex flex-col gap-6">
      <Inherited label="Potential feature concept" state={featureState}>
        <div className="font-semibold">{feature.featureConcept || <span className="font-normal text-neutral-400">No concept yet</span>}</div>
        {feature.designTheory && <div className="mt-1 text-xs text-neutral-600">Design theory: {feature.designTheory}</div>}
      </Inherited>

      <div className="grid gap-2">
        <Label htmlFor={`${feature.id}-ev`}>Prototype evaluation</Label>
        <Textarea
          id={`${feature.id}-ev`}
          rows={5}
          value={eff.evaluation}
          onChange={(e) => patch({ evaluation: e.target.value }, "Evaluation edited")}
          placeholder="What was prototyped, how it was evaluated or tested, and the result"
        />
      </div>

      <DocumentsEditor docs={eff.documents} onChange={(next) => patch({ documents: next }, "Evaluation documents edited")} defaultKind="report" />

      <div className="grid gap-2">
        <Label>Successful prototype created and acceptable?</Label>
        <div className="flex flex-wrap gap-2">
          {[
            { v: true, label: "Acceptable", cls: "border-green-400 bg-green-50 text-green-800", icon: <Check className="size-3.5" /> },
            { v: false, label: "Not acceptable", cls: "border-red-300 bg-red-50 text-red-700", icon: <X className="size-3.5" /> },
          ].map((o) => (
            <button
              key={String(o.v)}
              type="button"
              onClick={() => patch({ prototypeAcceptable: o.v }, `Prototype designated ${o.label.toLowerCase()}`)}
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition",
                acc === o.v ? o.cls : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
              )}
            >
              {o.icon}
              {o.label}
            </button>
          ))}
          {acc !== undefined && (
            <Button variant="ghost" size="sm" onClick={() => patch({ prototypeAcceptable: undefined }, "Prototype designation cleared")}>
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- 4 · Market Design Map ---------- */

export interface MapRow {
  featureId: string;
  needLabel: string;
  need: string;
  theory: string;
  designTheory: string;
  concept: string;
  selected?: boolean;
  justification: string;
}

export function MarketMapEditor({
  rows,
  final,
  onSelect,
}: {
  rows: MapRow[];
  /** Finalized: show only selected features, locked. */
  final: boolean;
  onSelect: (featureId: string, p: { selected?: boolean; justification?: string }) => void;
}) {
  const shown = final ? rows.filter((r) => r.selected) : rows;
  return (
    <div className="flex flex-col gap-4">
      {final && (
        <div className="self-start rounded border border-green-300 bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-900">Final Market Design Map</div>
      )}

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full min-w-[980px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-neutral-50 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              <th className="px-3 py-2">User need</th>
              <th className="px-3 py-2">Clinical theory</th>
              <th className="px-3 py-2">Design theory</th>
              <th className="px-3 py-2">Feature concept</th>
              <th className="px-3 py-2">{final ? "Decision" : "Select"}</th>
              <th className="px-3 py-2">Justification</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.featureId} className={cn("border-t border-neutral-200 align-top", r.selected === true && "bg-[#08A9AD]/5", r.selected === false && !final && "opacity-60")}>
                <td className="px-3 py-2">
                  <div className="font-mono text-[10px] text-[#00224B]">{r.needLabel}</div>
                  <div>{r.need}</div>
                </td>
                <td className="px-3 py-2">{r.theory}</td>
                <td className="px-3 py-2 text-neutral-700">{r.designTheory || <span className="text-neutral-400">—</span>}</td>
                <td className="px-3 py-2 font-medium">{r.concept}</td>
                <td className="px-3 py-2">
                  {final ? (
                    <span className="inline-flex items-center gap-1 rounded border border-green-300 bg-green-50 px-1.5 py-0.5 text-[11px] font-medium text-green-800">
                      <Check className="size-3" /> Selected
                    </span>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => onSelect(r.featureId, { selected: true })}
                        className={cn("rounded border px-2 py-0.5 text-[11px] font-medium", r.selected === true ? "border-green-400 bg-green-50 text-green-800" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50")}
                      >
                        Select
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelect(r.featureId, { selected: false })}
                        className={cn("rounded border px-2 py-0.5 text-[11px] font-medium", r.selected === false ? "border-red-300 bg-red-50 text-red-700" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50")}
                      >
                        Do not select
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-3 py-2">
                  {final ? (
                    <span className="text-neutral-700">{r.justification}</span>
                  ) : (
                    <Textarea rows={3} value={r.justification} onChange={(e) => onSelect(r.featureId, { justification: e.target.value })} placeholder="Factors and judgement" className="min-w-[220px] text-xs" />
                  )}
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-sm text-neutral-400">
                  {final ? "No features selected" : "No viable concepts"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

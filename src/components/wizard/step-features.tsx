"use client";

import { Plus, Trash2 } from "lucide-react";
import * as A from "@/lib/actions";
import { logEdit, setWorkflowState } from "@/lib/store";
import { DOC_KINDS, STATUS_META, makeId, type DocKind, type Feature, type MechanismOfAction } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function StepFeatures({ moa, features }: { moa: MechanismOfAction; features: Feature[] }) {
  const editFeature = (id: string, updater: (f: Feature) => Feature, summary: string) => {
    setWorkflowState((s) => A.editFeature(s, id, updater));
    logEdit(id, summary);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-[#00224B]">What could we build to deliver each theory?</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Features are derived from a specific clinical theory. Capture the design theory (how the design produces the
          effect), a concrete concept, and the documents that will support it. Feature status is signed off from the
          canvas.
        </p>
      </div>

      {moa.theories.map((t, ti) => {
        const feats = features.filter((f) => f.theoryId === t.id);
        return (
          <section key={t.id} className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="rounded bg-[#00224B] px-1.5 py-0.5 font-mono text-[10px] font-medium text-white">T{ti + 1}</span>
              <h3 className="text-sm font-semibold text-neutral-800">{t.title || `Theory ${ti + 1}`}</h3>
              <span className="text-xs text-neutral-500">
                · {feats.length} feature{feats.length === 1 ? "" : "s"}
              </span>
            </div>

            {feats.map((f) => (
              <div key={f.id} className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm" data-anchor={f.id}>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 rounded border border-neutral-300 border-l-[3px] border-l-[#08A9AD] bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-800">
                    Feature
                    <span className="font-mono text-[10px] font-normal text-neutral-500">{f.provenance.cardRevision}</span>
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-xs text-neutral-600">
                      <span className="size-2.5 rounded-full border border-black/30" style={{ backgroundColor: STATUS_META[f.status].color }} />
                      {STATUS_META[f.status].label}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Delete feature"
                      className="text-neutral-400 hover:text-red-600"
                      onClick={() => setWorkflowState((s) => A.deleteFeature(s, f.id))}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor={`${f.id}-concept`}>Potential feature concept</Label>
                    <Textarea
                      id={`${f.id}-concept`}
                      rows={3}
                      value={f.featureConcept}
                      onChange={(e) => editFeature(f.id, (x) => ({ ...x, featureConcept: e.target.value }), "Feature concept edited")}
                      placeholder="Concrete, buildable concept"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`${f.id}-design`}>Design theory</Label>
                    <Textarea
                      id={`${f.id}-design`}
                      rows={3}
                      value={f.designTheory}
                      onChange={(e) => editFeature(f.id, (x) => ({ ...x, designTheory: e.target.value }), "Design theory edited")}
                      placeholder="How the design produces the clinical effect"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Support documents</Label>
                  <ol className="flex flex-col gap-2">
                    {f.supportDocuments.map((d) => (
                      <li key={d.id} className="flex items-center gap-2">
                        <Select
                          value={d.kind}
                          onValueChange={(v) =>
                            editFeature(
                              f.id,
                              (x) => ({ ...x, supportDocuments: x.supportDocuments.map((y) => (y.id === d.id ? { ...y, kind: v as DocKind } : y)) }),
                              "Support document type changed"
                            )
                          }
                        >
                          <SelectTrigger size="sm" className="w-[110px] shrink-0">
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
                        <Input
                          value={d.code}
                          onChange={(e) =>
                            editFeature(
                              f.id,
                              (x) => ({ ...x, supportDocuments: x.supportDocuments.map((y) => (y.id === d.id ? { ...y, code: e.target.value } : y)) }),
                              "Support document code edited"
                            )
                          }
                          placeholder="DOC-000"
                          className="h-8 w-28 font-mono text-xs"
                        />
                        <Input
                          value={d.title}
                          onChange={(e) =>
                            editFeature(
                              f.id,
                              (x) => ({ ...x, supportDocuments: x.supportDocuments.map((y) => (y.id === d.id ? { ...y, title: e.target.value } : y)) }),
                              "Support document edited"
                            )
                          }
                          placeholder="Document title"
                          className="h-8 text-sm"
                        />
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Remove document"
                          className="text-neutral-400 hover:text-red-600"
                          onClick={() =>
                            editFeature(f.id, (x) => ({ ...x, supportDocuments: x.supportDocuments.filter((y) => y.id !== d.id) }), "Support document removed")
                          }
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
                      editFeature(
                        f.id,
                        (x) => ({ ...x, supportDocuments: [...x.supportDocuments, { id: makeId("doc"), kind: "protocol", code: "", title: "" }] }),
                        "Support document added"
                      )
                    }
                  >
                    <Plus className="size-3.5" />
                    Add document
                  </Button>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setWorkflowState((s) => A.addFeature(s, moa.id, t.id).state)}
              className="flex items-center justify-center gap-2 rounded-md border border-dashed border-neutral-300 bg-white/60 py-3 text-xs font-medium text-neutral-500 transition hover:border-[#08A9AD] hover:text-[#08A9AD]"
            >
              <Plus className="size-3.5" />
              Add a feature derived from &lsquo;{t.title || `Theory ${ti + 1}`}&rsquo;
            </button>
          </section>
        );
      })}
    </div>
  );
}

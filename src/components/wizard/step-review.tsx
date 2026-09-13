"use client";

import Link from "next/link";
import { AlertTriangle, ExternalLink, History } from "lucide-react";
import { REFERENCE_KINDS, STATUS_META, lastSignOff, type Feature, type MechanismOfAction, type Status } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusDots } from "@/components/workflow/status-dots";
import { TheoryFileChip } from "@/components/workflow/theory-file";

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function StepReview({
  moa,
  features,
  title,
  onRequestStatus,
  onConflict,
  onHistory,
}: {
  moa: MechanismOfAction;
  features: Feature[];
  title: string;
  onRequestStatus: (s: Status) => void;
  onConflict: () => void;
  onHistory: () => void;
}) {
  const so = lastSignOff(moa);
  const p = moa.provenance;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-[#00224B]">Review and sign off</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Check the mechanism as it will be released at the next revision. Changing the status requires a reviewer
          sign-off, which is recorded in the card history.
        </p>
      </div>

      {p.activeConflict && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div className="flex-1">
            <div className="font-medium">Active conflict — approval is blocked.</div>
            <div className="text-xs text-red-700">{p.conflictReason}</div>
          </div>
          <Button variant="outline" size="sm" onClick={onConflict}>
            Resolve…
          </Button>
        </div>
      )}

      {/* Summary card */}
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-3">
          <span className="inline-flex items-center gap-2 rounded border border-neutral-300 border-l-[3px] border-l-[#00224B] bg-neutral-100 px-2 py-0.5 text-sm font-semibold text-neutral-800">
            {title}
            <span className="font-mono text-[10px] font-normal text-neutral-500">{p.cardRevision}</span>
          </span>
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/" />}>
            <ExternalLink className="size-3.5" />
            Open on canvas
          </Button>
        </div>

        <dl className="grid gap-x-6 gap-y-4 px-4 py-4 text-sm md:grid-cols-[160px_1fr]">
          <dt className="font-medium text-neutral-500">Unmet need</dt>
          <dd className="text-neutral-800">{moa.unmetNeed}</dd>

          <dt className="font-medium text-neutral-500">Clinical theories</dt>
          <dd className="flex flex-col gap-3">
            {moa.theories.map((t, i) => (
              <div key={t.id} className="rounded-md border border-neutral-200 p-3" data-anchor={`review-theory-${t.id}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] text-neutral-500">T{i + 1}</span>
                  <span className="font-medium text-neutral-800">{t.title}</span>
                  {t.file && <TheoryFileChip file={t.file} className="max-w-[260px]" />}
                  <span className="ml-auto text-xs text-neutral-500">
                    {features.filter((f) => f.theoryId === t.id).length} feature(s)
                  </span>
                </div>
                {t.statement && <p className="mt-1.5 text-neutral-700">{t.statement}</p>}
                {t.references.length > 0 ? (
                  <ol className="mt-2 flex flex-col gap-1 text-xs text-neutral-600">
                    {t.references.map((r) => (
                      <li key={r.id} className="flex items-start gap-2">
                        <span className={cn("mt-px shrink-0 rounded px-1 text-[8px] font-semibold uppercase", REFERENCE_KINDS[r.kind].className)}>
                          {REFERENCE_KINDS[r.kind].label}
                        </span>
                        {r.citation}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-2 text-xs italic text-amber-700">No references cited.</p>
                )}
              </div>
            ))}
          </dd>

          <dt className="font-medium text-neutral-500">Derived features</dt>
          <dd>
            {features.length === 0 ? (
              <span className="text-xs italic text-neutral-500">None yet.</span>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {features.map((f) => (
                  <li key={f.id} className="flex items-start gap-2 text-neutral-800">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full border border-black/30" style={{ backgroundColor: STATUS_META[f.status].color }} />
                    <span>
                      {f.featureConcept || <span className="italic text-neutral-400">Untitled concept</span>}
                      <span className="ml-2 text-xs text-neutral-500">
                        {f.supportDocuments.length} doc{f.supportDocuments.length === 1 ? "" : "s"} · {f.provenance.cardRevision}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </dd>

          <dt className="font-medium text-neutral-500">Provenance</dt>
          <dd className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-neutral-700 sm:grid-cols-4">
            <span>Procedure <b>{p.procedureId}</b> rev <b>{p.procedureRevision}</b></span>
            <span>Section <b>{p.sectionId}</b> rev <b>{p.sectionRevision}</b></span>
            <span>Card revision <b>{p.cardRevision}</b></span>
            <span>Revised <b>{p.revisionDate}</b></span>
          </dd>
        </dl>
      </div>

      {/* Status + sign-off */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="text-sm">
          <div className="flex items-center gap-2 font-medium text-neutral-800">
            <span className="size-3 rounded-full border border-black/30" style={{ backgroundColor: STATUS_META[moa.status].color }} />
            {STATUS_META[moa.status].label}
          </div>
          <div className="mt-0.5 text-xs text-neutral-500">
            {so?.signOff
              ? `Last sign-off: ${so.signOff.reviewer} (${so.signOff.role}) · ${fmt(so.at)} · ${so.signOff.revision}`
              : "No sign-off recorded yet."}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onHistory}>
            <History className="size-3.5" />
            History ({moa.history.length})
          </Button>
          {!p.activeConflict && (
            <Button variant="ghost" size="sm" onClick={onConflict} className="text-neutral-500">
              Flag conflict…
            </Button>
          )}
          <div className="flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-2">
            <span className="text-xs text-neutral-500">Set status:</span>
            <StatusDots value={moa.status} onRequestChange={onRequestStatus} />
          </div>
        </div>
      </div>
    </div>
  );
}

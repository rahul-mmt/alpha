"use client";

import { AlertTriangle, History } from "lucide-react";
import type { Provenance } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProvenanceStrip({
  value,
  historyCount,
  onHistory,
  onConflict,
}: {
  value: Provenance;
  historyCount: number;
  onHistory: () => void;
  onConflict: () => void;
}) {
  const cells: { label: string; node: React.ReactNode }[] = [
    { label: "Procedure ID", node: value.procedureId },
    { label: "Procedure Revision", node: value.procedureRevision },
    { label: "Section ID", node: value.sectionId },
    { label: "Section Revision", node: value.sectionRevision },
    {
      label: "Card History",
      node: (
        <button
          type="button"
          onClick={onHistory}
          className="inline-flex items-center gap-0.5 text-[#00224B] underline-offset-2 hover:underline"
        >
          <History className="size-2.5" />
          {historyCount} event{historyCount === 1 ? "" : "s"}
        </button>
      ),
    },
    { label: "Card Revision", node: value.cardRevision },
    { label: "Revision Date", node: value.revisionDate },
    {
      label: "Active Conflict",
      node: (
        <button
          type="button"
          onClick={onConflict}
          title={value.activeConflict ? value.conflictReason ?? "Click to resolve" : "Click to flag a conflict"}
          className={cn(
            "inline-flex items-center gap-0.5 underline-offset-2 hover:underline",
            value.activeConflict ? "font-semibold text-red-600" : "text-neutral-800"
          )}
        >
          {value.activeConflict && <AlertTriangle className="size-2.5" />}
          {value.activeConflict ? "Yes" : "None"}
        </button>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_1.35fr_1fr] border-t border-neutral-200 bg-neutral-50 text-[9px] leading-tight">
      {cells.map((c) => (
        <div key={c.label} className="border-r border-neutral-200 px-1.5 py-1 last:border-r-0">
          <div className="text-neutral-500">{c.label}</div>
          <div className="mt-0.5 truncate font-medium text-neutral-800">{c.node}</div>
        </div>
      ))}
    </div>
  );
}

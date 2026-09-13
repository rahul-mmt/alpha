"use client";

import { ChevronDown, Link2 } from "lucide-react";
import {
  DOC_KINDS,
  makeId,
  type DocKind,
  type Feature,
  type MechanismOfAction,
  type Status,
} from "@/lib/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WorkflowCard } from "./workflow-card";
import { EditableCell } from "./editable-cell";
import { EditableList } from "./editable-list";
import type { Updater } from "./moa-card";

const KIND_ORDER: DocKind[] = ["protocol", "report", "plan", "review", "spec"];

export function FeatureCard({
  feature,
  parent,
  index,
  compact,
  dimmed,
  onChange,
  onRelink,
  onRequestStatus,
  onHistory,
  onConflict,
  onDuplicate,
  onDelete,
}: {
  feature: Feature;
  parent: MechanismOfAction;
  index: number;
  compact?: boolean;
  dimmed?: boolean;
  onChange: (updater: Updater<Feature>, summary: string) => void;
  onRelink: (theoryId: string) => void;
  onRequestStatus: (s: Status) => void;
  onHistory: () => void;
  onConflict: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const theory = parent.theories.find((t) => t.id === feature.theoryId) ?? parent.theories[0];
  const theoryIndex = theory ? parent.theories.indexOf(theory) : -1;
  const docs = feature.supportDocuments;
  const setDocs = (next: Feature["supportDocuments"], summary: string) =>
    onChange((f) => ({ ...f, supportDocuments: next }), summary);

  return (
    <WorkflowCard
      nodeId={feature.id}
      title={`Feature Identification - Instance ${index + 1}`}
      card={feature}
      className="w-[600px]"
      accent="#08A9AD"
      compact={compact}
      dimmed={dimmed}
      summary={feature.featureConcept}
      onRequestStatus={onRequestStatus}
      onHistory={onHistory}
      onConflict={onConflict}
      menu={[
        { label: "View card history", onSelect: onHistory },
        {
          label: feature.provenance.activeConflict ? "Resolve active conflict…" : "Flag active conflict…",
          onSelect: onConflict,
        },
        { label: "Duplicate feature", onSelect: onDuplicate, separatorBefore: true },
        { label: "Delete feature", onSelect: onDelete, destructive: true },
      ]}
      columns={[
        {
          label: "Clinical Theory",
          anchor: true,
          content: (
            <div className="flex h-full flex-col">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      type="button"
                      className="m-1.5 flex items-center gap-1 rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-left text-[10px] font-medium text-[#00224B] hover:border-[#08A9AD]"
                    />
                  }
                >
                  <Link2 className="size-3 shrink-0" />
                  <span className="truncate">
                    {theory ? `T${theoryIndex + 1} · ${theory.title}` : "No theory"}
                  </span>
                  <ChevronDown className="ml-auto size-3 shrink-0 text-neutral-400" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-xs">Derived from clinical theory</DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuRadioGroup
                    value={theory?.id}
                    onValueChange={(v) => typeof v === "string" && v !== theory?.id && onRelink(v)}
                  >
                    {parent.theories.map((t, i) => (
                      <DropdownMenuRadioItem key={t.id} value={t.id} className="text-xs">
                        <span className="font-mono text-[10px] text-neutral-500">T{i + 1}</span>
                        <span className="truncate">{t.title}</span>
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <EditableCell
                readOnly
                value={theory?.statement ?? ""}
                placeholder="Inherited from the linked theory"
                className="pt-0"
              />
            </div>
          ),
        },
        {
          label: "Design Theory",
          content: (
            <EditableCell
              value={feature.designTheory}
              placeholder="How could a design deliver the clinical theory?"
              onChange={(v) => onChange((f) => ({ ...f, designTheory: v }), "Design theory edited")}
            />
          ),
        },
        {
          label: "Potential Feature Concept",
          content: (
            <EditableCell
              value={feature.featureConcept}
              placeholder="Concrete feature concept…"
              onChange={(v) => onChange((f) => ({ ...f, featureConcept: v }), "Feature concept edited")}
            />
          ),
        },
        {
          label: (
            <span className="flex w-full items-center justify-between">
              Feature Support Documents
              <span className="rounded bg-neutral-200 px-1 font-mono text-[9px] font-normal text-neutral-600">
                {docs.length}
              </span>
            </span>
          ),
          content: (
            <EditableList
              items={docs.map((d) => ({ id: d.id, text: d.title, code: d.code, chip: DOC_KINDS[d.kind] }))}
              placeholder="Document title…"
              addLabel="Add document"
              emptyHint="No supporting documents attached."
              onChangeText={(id, v) =>
                setDocs(docs.map((d) => (d.id === id ? { ...d, title: v } : d)), "Support document edited")
              }
              onChangeCode={(id, v) =>
                setDocs(docs.map((d) => (d.id === id ? { ...d, code: v } : d)), "Support document code edited")
              }
              onCycleChip={(id) =>
                setDocs(
                  docs.map((d) =>
                    d.id === id
                      ? { ...d, kind: KIND_ORDER[(KIND_ORDER.indexOf(d.kind) + 1) % KIND_ORDER.length] }
                      : d
                  ),
                  "Support document type changed"
                )
              }
              onAdd={() =>
                setDocs(
                  [...docs, { id: makeId("doc"), kind: "protocol", code: "", title: "" }],
                  "Support document added"
                )
              }
              onRemove={(id) => setDocs(docs.filter((d) => d.id !== id), "Support document removed")}
            />
          ),
        },
      ]}
    />
  );
}

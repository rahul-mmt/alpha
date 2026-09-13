"use client";

import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditableCell } from "./editable-cell";

export interface ListItem {
  id: string;
  text: string;
  /** Optional short leading field (e.g. document code), rendered monospace. */
  code?: string;
  chip?: { label: string; className: string };
}

/**
 * A stack of editable rows with an optional kind-chip (click to cycle), an
 * optional monospace code field, and add / remove controls.
 */
export function EditableList({
  items,
  onChangeText,
  onChangeCode,
  onCycleChip,
  onAdd,
  onRemove,
  addLabel,
  placeholder,
  emptyHint,
}: {
  items: ListItem[];
  onChangeText: (id: string, v: string) => void;
  onChangeCode?: (id: string, v: string) => void;
  onCycleChip?: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  addLabel: string;
  placeholder: string;
  emptyHint?: string;
}) {
  return (
    <div className="flex flex-col">
      {items.length === 0 && emptyHint && (
        <div className="px-2 pt-2 text-[10px] italic text-neutral-400">{emptyHint}</div>
      )}
      <ol className="flex flex-col divide-y divide-neutral-100">
        {items.map((it, i) => (
          <li key={it.id} className="group/row relative flex items-start gap-1 py-0.5 pl-1.5 pr-5">
            <span className="mt-1.5 w-3 shrink-0 text-right text-[9px] tabular-nums text-neutral-400">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              {(it.chip || it.code !== undefined) && (
                <div className="mt-1 flex items-center gap-1 px-2">
                  {it.chip && (
                    <button
                      type="button"
                      onClick={() => onCycleChip?.(it.id)}
                      title="Click to change type"
                      className={cn(
                        "rounded px-1 py-px text-[8px] font-semibold uppercase tracking-wide",
                        it.chip.className
                      )}
                    >
                      {it.chip.label}
                    </button>
                  )}
                  {it.code !== undefined && (
                    <input
                      value={it.code}
                      onChange={(e) => onChangeCode?.(it.id, e.target.value)}
                      placeholder="DOC-000"
                      spellCheck={false}
                      className="w-16 rounded-sm bg-transparent font-mono text-[9px] text-neutral-700 outline-none placeholder:text-neutral-300 focus:bg-white focus:ring-1 focus:ring-[#08A9AD]"
                    />
                  )}
                </div>
              )}
              <EditableCell
                value={it.text}
                placeholder={placeholder}
                onChange={(v) => onChangeText(it.id, v)}
                className="py-1"
              />
            </div>
            <button
              type="button"
              aria-label="Remove"
              onClick={() => onRemove(it.id)}
              className="absolute right-1 top-1.5 rounded p-0.5 text-neutral-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover/row:opacity-100"
            >
              <X className="size-3" />
            </button>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={onAdd}
        className="mx-1.5 my-1.5 flex items-center gap-1 rounded border border-dashed border-neutral-300 px-2 py-1 text-[10px] text-neutral-500 transition hover:border-[#08A9AD] hover:text-[#08A9AD]"
      >
        <Plus className="size-3" />
        {addLabel}
      </button>
    </div>
  );
}

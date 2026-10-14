"use client";

import { STATUS_META, type Status } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { Phase, PlaceholderCard, PlaceholderTone } from "./phases";

const TONE: Record<PlaceholderTone, { chip: string; bg: string }> = {
  neutral: { chip: "border-neutral-300 bg-neutral-100 text-neutral-800", bg: "bg-white" },
  green: { chip: "border-green-300 bg-green-100 text-green-900", bg: "bg-green-50/70" },
  violet: { chip: "border-violet-300 bg-violet-100 text-violet-900", bg: "bg-violet-50/70" },
};

const SIZE: Record<NonNullable<PlaceholderCard["size"]>, string> = {
  sm: "w-[220px] min-h-[64px]",
  md: "w-[280px] min-h-[170px]",
  lg: "w-[340px] min-h-[210px]",
};

/**
 * Static stand-in for the whiteboard cards of phases that are not part of the
 * live demo. Same visual grammar as the live cards (title chip, grid, status
 * dots) so the rolodex reads as one system.
 */
export function PlaceholderBoard({ phase }: { phase: Phase }) {
  if (phase.board.kind !== "placeholder") return null;
  return (
    <div className="flex items-start gap-10">
      {phase.board.columns.map((col, ci) => (
        <div key={ci} className="flex shrink-0 flex-col gap-6">
          {col.cards.map((c, i) => (
            <PlaceholderCardView key={i} card={c} />
          ))}
        </div>
      ))}
    </div>
  );
}

function PlaceholderCardView({ card }: { card: PlaceholderCard }) {
  const tone = TONE[card.tone ?? "neutral"];
  const size = SIZE[card.size ?? "md"];
  return (
    <div className={cn("relative flex flex-col rounded-md border border-neutral-200 p-2.5 shadow-sm", tone.bg, size)}>
      <div className={cn("inline-flex self-start rounded border px-2.5 py-0.5 text-[15px] font-semibold", tone.chip)}>{card.title}</div>
      {card.size !== "sm" && (
        <div className="mt-3 grid flex-1 grid-cols-[72px_1fr_1fr] gap-px overflow-hidden rounded-sm border border-neutral-200/80 bg-neutral-200/60">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className={cn("min-h-[22px]", i % 3 === 0 ? "bg-neutral-200/70" : "bg-white/80")} />
          ))}
        </div>
      )}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] text-neutral-400">Not part of this demo</span>
        <span className="flex items-center gap-1">
          {(Object.keys(STATUS_META) as Status[]).map((s) => (
            <span key={s} className="size-2 rounded-full border border-black/20" style={{ backgroundColor: STATUS_META[s].color }} />
          ))}
        </span>
      </div>
    </div>
  );
}

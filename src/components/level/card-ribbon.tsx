"use client";

import { useEffect, useRef } from "react";
import { Lock } from "lucide-react";
import { CARD_INSTRUCTIONS, CARD_TYPES } from "@/lib/level";
import type { CardReview, ReviewState } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { LevelCard } from "./level-cards";

export const STATE_META: Record<ReviewState, { label: string; dot: string; chip: string }> = {
  drafting: { label: "Drafting", dot: "bg-neutral-400", chip: "bg-neutral-100 text-neutral-700 border-neutral-300" },
  review: { label: "In review", dot: "bg-amber-400", chip: "bg-amber-50 text-amber-800 border-amber-300" },
  reconcile: { label: "Reconcile", dot: "bg-orange-500", chip: "bg-orange-50 text-orange-800 border-orange-300" },
  finalized: { label: "Finalized", dot: "bg-[#6fbf46]", chip: "bg-green-50 text-green-800 border-green-300" },
};

/**
 * The ribbon above the card window: every card in the level, in sequence,
 * grouped by card type. Click to activate a card in the window.
 */
export function CardRibbon({
  cards,
  activeId,
  reviews,
  onSelect,
}: {
  cards: LevelCard[];
  activeId: string;
  reviews: Record<string, CardReview | undefined>;
  onSelect: (id: string) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.querySelector<HTMLElement>(`[data-ribbon-id="${CSS.escape(activeId)}"]`)?.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
  }, [activeId]);

  return (
    <div ref={scroller} className="flex items-stretch gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]" role="tablist" aria-label="Cards in this level">
      {CARD_TYPES.map((t, ti) => {
        const group = cards.filter((c) => c.kind === t);
        if (group.length === 0) return null;
        return (
          <div key={t} className="flex shrink-0 flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              <span className="grid size-4 place-items-center rounded-full bg-[#00224B] font-mono text-[9px] text-white">{ti + 1}</span>
              {CARD_INSTRUCTIONS[t].title}
              <span className="font-mono font-normal text-neutral-400">×{group.length}</span>
            </div>
            <div className="flex items-stretch gap-1.5">
              {group.map((c) => {
                const r = reviews[c.id];
                const st = r?.state ?? "drafting";
                const active = c.id === activeId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    data-ribbon-id={c.id}
                    onClick={() => onSelect(c.id)}
                    className={cn(
                      "flex min-w-[150px] max-w-[200px] flex-col gap-1 rounded-md border px-2.5 py-2 text-left transition",
                      active ? "border-[#08A9AD] bg-white shadow-sm ring-1 ring-[#08A9AD]/30" : "border-neutral-200 bg-white/70 hover:border-neutral-300 hover:bg-white"
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-semibold text-[#00224B]">{c.label}</span>
                      {st === "finalized" && <Lock className="size-3 text-green-700" />}
                      <span className={cn("ml-auto size-2 rounded-full", STATE_META[st].dot)} title={STATE_META[st].label} />
                    </span>
                    <span className="truncate text-[12px] font-medium text-neutral-800">{ribbonTitle(c)}</span>
                    <span className="text-[10px] text-neutral-500">
                      {STATE_META[st].label}
                      {r && r.round > 0 && st !== "finalized" && ` · round ${r.round}`}
                      {st === "finalized" && r?.finalRevision && ` · ${r.finalRevision}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ribbonTitle(c: LevelCard) {
  switch (c.kind) {
    case "moa":
      return c.need?.title || c.moa.unmetNeed || "Unmet need";
    case "feature":
      return c.feature.featureConcept || (c.theory ? `From ${c.theory.title}` : "Feature");
    case "effectiveness":
      return c.feature.featureConcept || "Feature concept";
    case "market-map":
      return "Market Design Map";
  }
}

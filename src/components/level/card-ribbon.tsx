"use client";

import { useEffect, useRef } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { CARD_INSTRUCTIONS, CARD_TYPES, type CardType } from "@/lib/level";
import type { CardReview, ReviewState } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { LevelCard } from "./level-cards";

export const STATE_META: Record<ReviewState, { label: string; dot: string; chip: string }> = {
  drafting: { label: "Drafting", dot: "bg-neutral-400", chip: "bg-neutral-100 text-neutral-700 border-neutral-300" },
  review: { label: "In review", dot: "bg-amber-400", chip: "bg-amber-50 text-amber-800 border-amber-300" },
  reconcile: { label: "Reconcile", dot: "bg-orange-500", chip: "bg-orange-50 text-orange-800 border-orange-300" },
  finalized: { label: "Finalized", dot: "bg-[#6fbf46]", chip: "bg-green-50 text-green-800 border-green-300" },
};

/**
 * The ribbon above the card window: one tab per card type, so it stays the
 * same width however many cards the level holds. Inside the active type a
 * pager (prev / list / next) steps through the individual cards.
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
  const active = cards.find((c) => c.id === activeId);
  // Last card visited per type, so switching back to a type returns to where you were.
  const lastByType = useRef<Partial<Record<CardType, string>>>({});
  useEffect(() => {
    if (active) lastByType.current[active.kind] = active.id;
  }, [active]);

  const stateOf = (c: LevelCard) => reviews[c.id]?.state ?? "drafting";
  const group = active ? cards.filter((c) => c.kind === active.kind) : [];
  const pos = active ? group.indexOf(active) : -1;

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-4" role="tablist" aria-label="Card types in this level">
        {CARD_TYPES.map((t, ti) => {
          const of = cards.filter((c) => c.kind === t);
          const finalized = of.filter((c) => stateOf(c) === "finalized").length;
          const selected = active?.kind === t;
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={selected}
              disabled={of.length === 0}
              onClick={() => {
                const target = of.find((c) => c.id === lastByType.current[t]) ?? of[0];
                if (target) onSelect(target.id);
              }}
              className={cn(
                "flex min-w-0 flex-col gap-1 rounded-md border px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-50",
                selected ? "border-[#08A9AD] bg-white shadow-sm ring-1 ring-[#08A9AD]/30" : "border-neutral-200 bg-white/70 hover:border-neutral-300 hover:bg-white"
              )}
            >
              <span className="flex items-center gap-1.5">
                <span className={cn("grid size-4 shrink-0 place-items-center rounded-full font-mono text-[9px] text-white", selected ? "bg-[#08A9AD]" : "bg-[#00224B]")}>{ti + 1}</span>
                <span className="truncate text-[12px] font-semibold text-[#00224B]">{CARD_INSTRUCTIONS[t].title}</span>
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-neutral-500">
                {of.length} card{of.length === 1 ? "" : "s"} · {finalized} finalized
                <span className="ml-auto flex gap-0.5">
                  {of.slice(0, 12).map((c) => (
                    <span key={c.id} className={cn("size-1.5 rounded-full", STATE_META[stateOf(c)].dot)} />
                  ))}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {active && group.length > 1 && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" aria-label="Previous card" disabled={pos <= 0} onClick={() => onSelect(group[pos - 1].id)}>
            <ChevronLeft className="size-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="min-w-0 max-w-[520px] justify-start" />}>
              <span className="font-mono text-[11px] font-semibold text-[#00224B]">{active.label}</span>
              <span className="truncate text-neutral-700">{ribbonTitle(active)}</span>
              <span className={cn("size-2 shrink-0 rounded-full", STATE_META[stateOf(active)].dot)} />
              <ChevronDown className="size-3.5 shrink-0 text-neutral-400" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-80 w-96 overflow-y-auto">
              {group.map((c) => (
                <DropdownMenuItem key={c.id} onClick={() => onSelect(c.id)} className={cn("gap-2 text-xs", c.id === active.id && "bg-neutral-100")}>
                  <span className="font-mono text-[10px] font-semibold text-[#00224B]">{c.label}</span>
                  <span className="min-w-0 flex-1 truncate">{ribbonTitle(c)}</span>
                  {stateOf(c) === "finalized" && <Lock className="size-3 text-green-700" />}
                  <span className="text-[10px] text-neutral-500">{STATE_META[stateOf(c)].label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="icon-sm" aria-label="Next card" disabled={pos >= group.length - 1} onClick={() => onSelect(group[pos + 1].id)}>
            <ChevronRight className="size-4" />
          </Button>
          <span className="font-mono text-[11px] text-neutral-500">
            {pos + 1} of {group.length}
          </span>
        </div>
      )}
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

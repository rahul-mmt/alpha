"use client";

import { Check, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { STEPS, type StepCheck, type StepId } from "./steps";

export function StepRail({
  current,
  checks,
  onSelect,
}: {
  current: StepId;
  checks: Record<StepId, StepCheck>;
  onSelect: (id: StepId) => void;
}) {
  const currentIdx = STEPS.findIndex((s) => s.id === current);
  return (
    <ol className="flex flex-col gap-1">
      {STEPS.map((s, i) => {
        const chk = checks[s.id];
        const active = s.id === current;
        // Reachable if every earlier step is complete.
        const reachable = STEPS.slice(0, i).every((p) => checks[p.id].complete);
        const done = chk.complete && i < currentIdx;
        return (
          <li key={s.id}>
            <button
              type="button"
              disabled={!reachable && !active}
              onClick={() => onSelect(s.id)}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition",
                active ? "bg-white shadow-sm ring-1 ring-neutral-200" : "hover:bg-white/60",
                !reachable && !active && "cursor-not-allowed opacity-50"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border text-[11px] font-semibold",
                  done
                    ? "border-[#08A9AD] bg-[#08A9AD] text-white"
                    : active
                      ? "border-[#00224B] bg-[#00224B] text-white"
                      : "border-neutral-300 bg-white text-neutral-500"
                )}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className={cn("block text-sm font-medium", active ? "text-[#00224B]" : "text-neutral-800")}>
                  {s.title}
                </span>
                <span className="block text-xs text-neutral-500">{s.subtitle}</span>
                {!chk.complete && i < currentIdx && (
                  <span className="mt-1 flex items-center gap-1 text-[11px] text-amber-700">
                    <CircleAlert className="size-3" /> needs attention
                  </span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

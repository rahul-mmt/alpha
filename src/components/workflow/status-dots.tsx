"use client";

import { STATUS_META, type Status } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const ORDER: Status[] = ["red", "amber", "green"];

export function StatusDots({
  value,
  onRequestChange,
}: {
  value: Status;
  /** Fired only when a *different* status is chosen; the caller runs the sign-off flow. */
  onRequestChange: (s: Status) => void;
}) {
  return (
    <div className="flex items-center gap-2" role="radiogroup" aria-label="Card status">
      {ORDER.map((s) => {
        const meta = STATUS_META[s];
        const active = s === value;
        return (
          <Tooltip key={s}>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={meta.label}
                  onClick={() => !active && onRequestChange(s)}
                  className={cn(
                    "size-5 rounded-full border border-black/40 transition-all",
                    active
                      ? "scale-110 ring-2 ring-offset-2 ring-offset-white ring-neutral-900/70"
                      : "opacity-35 hover:opacity-80"
                  )}
                  style={{ backgroundColor: meta.color }}
                />
              }
            />
            <TooltipContent side="bottom">
              <span className="font-medium">{meta.label}</span>
              <span className="text-background/70">
                · {active ? "current status" : `${meta.hint} — requires sign-off`}
              </span>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Phase } from "./phases";

/** Vertical distance between neighbouring cards on the drum. */
const STEP_PX = 128;
/** How many neighbours above / below the selected card stay visible. */
const VISIBLE = 3;
/** Minimum wheel travel (px) before the drum advances one notch. */
const WHEEL_NOTCH = 70;
/** Ignore further wheel input for this long after a notch, so one flick = one step. */
const WHEEL_LOCK_MS = 320;

/**
 * A rolodex: phases are cards on a drum that rotates around a horizontal axis.
 * The selected card sits flat at the front; neighbours recede above and below.
 * Mouse wheel, arrow keys, the chevrons, or clicking a card turn the drum.
 */
export function Rolodex({
  phases,
  selected,
  onSelect,
}: {
  phases: Phase[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  const drumRef = useRef<HTMLDivElement>(null);
  const wheelAcc = useRef(0);
  const wheelLockUntil = useRef(0);
  // Latest selection, readable from the native wheel listener below.
  const selectedRef = useRef(selected);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const clamp = (i: number) => Math.max(0, Math.min(phases.length - 1, i));
  const step = (delta: number) => onSelect(clamp(selectedRef.current + delta));

  // React registers wheel as passive, so preventDefault (keeping the page from
  // scrolling while the drum turns) needs a native listener.
  useEffect(() => {
    const el = drumRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const now = performance.now();
      if (now < wheelLockUntil.current) return;
      wheelAcc.current += e.deltaY;
      if (Math.abs(wheelAcc.current) >= WHEEL_NOTCH) {
        step(wheelAcc.current > 0 ? 1 : -1);
        wheelAcc.current = 0;
        wheelLockUntil.current = now + WHEEL_LOCK_MS;
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "PageDown") {
      e.preventDefault();
      step(1);
    } else if (e.key === "ArrowUp" || e.key === "PageUp") {
      e.preventDefault();
      step(-1);
    } else if (e.key === "Home") {
      e.preventDefault();
      onSelect(0);
    } else if (e.key === "End") {
      e.preventDefault();
      onSelect(phases.length - 1);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <Button variant="ghost" size="sm" onClick={() => step(-1)} disabled={selected === 0} aria-label="Previous phase" className="text-neutral-500">
        <ChevronUp className="size-4" />
      </Button>

      <div
        ref={drumRef}
        role="listbox"
        aria-label="Workflow phases"
        aria-activedescendant={`rolodex-${phases[selected]?.id}`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="relative h-[560px] w-[320px] cursor-ns-resize outline-none focus-visible:ring-2 focus-visible:ring-[#08A9AD]/50 rounded-xl"
        style={{ perspective: "1100px", perspectiveOrigin: "50% 50%" }}
      >
        {/* Axis / spine of the drum */}
        <div aria-hidden className="pointer-events-none absolute inset-y-6 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-neutral-300 to-transparent" />

        {phases.map((p, i) => {
          const d = i - selected;
          const abs = Math.abs(d);
          const hidden = abs > VISIBLE;
          const active = d === 0;
          const opacity = hidden ? 0 : active ? 1 : Math.max(0.16, 1 - abs * 0.28);
          const scale = active ? 1 : Math.max(0.7, 1 - abs * 0.09);
          const transform = `translate(-50%, -50%) translateY(${d * STEP_PX}px) translateZ(${-abs * 110}px) rotateX(${-d * 28}deg) scale(${scale})`;
          return (
            <button
              key={p.id}
              id={`rolodex-${p.id}`}
              type="button"
              role="option"
              aria-selected={active}
              tabIndex={-1}
              onClick={() => onSelect(i)}
              disabled={hidden}
              className={cn(
                "absolute left-1/2 top-1/2 block h-[172px] w-[260px] transition-[transform,opacity] duration-500 ease-[cubic-bezier(.22,1,.36,1)] will-change-transform",
                active ? "z-20 cursor-default" : "z-10 cursor-pointer hover:brightness-95"
              )}
              style={{ transform, opacity, pointerEvents: hidden ? "none" : undefined }}
            >
              <PhaseTile phase={p} active={active} />
            </button>
          );
        })}
      </div>

      <Button variant="ghost" size="sm" onClick={() => step(1)} disabled={selected === phases.length - 1} aria-label="Next phase" className="text-neutral-500">
        <ChevronDown className="size-4" />
      </Button>

      <div className="flex items-center gap-2 text-[11px] text-neutral-500">
        <span className="font-mono">
          {String(selected + 1).padStart(2, "0")} / {String(phases.length).padStart(2, "0")}
        </span>
        <span className="text-neutral-300">·</span>
        <span>scroll or ↑ ↓ to turn</span>
      </div>
    </div>
  );
}

function PhaseTile({ phase, active }: { phase: Phase; active: boolean }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <svg viewBox="0 0 330 220" className={cn("absolute inset-0 h-full w-full", active ? "drop-shadow-md" : "drop-shadow-sm")} aria-hidden>
        <polygon
          points="50,2 280,2 328,110 280,218 50,218 2,110"
          className={cn("transition-colors duration-300", active ? "fill-white stroke-[#08A9AD]" : "fill-neutral-200 stroke-neutral-400")}
          strokeWidth={active ? 3 : 1.5}
        />
      </svg>
      <div
        className={cn(
          "relative px-9 text-center text-[21px] font-medium leading-tight tracking-tight transition-colors duration-300",
          active ? "text-[#00224B]" : "text-neutral-700"
        )}
      >
        {phase.title}
      </div>
    </div>
  );
}

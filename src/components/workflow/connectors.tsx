"use client";

import { useEffect, useState, type RefObject } from "react";

export interface Edge {
  from: string;
  to: string;
  tone?: "primary" | "muted";
}

interface Path {
  d: string;
  tone: "primary" | "muted";
  key: string;
}

/**
 * Draws bezier connectors between any two elements carrying `data-node-id`
 * inside `containerRef`. Re-measures on resize, scroll-layout changes and
 * whenever `deps` change.
 */
export function Connectors({
  containerRef,
  edges,
  deps,
}: {
  containerRef: RefObject<HTMLElement | null>;
  edges: Edge[];
  deps: unknown[];
}) {
  const [paths, setPaths] = useState<Path[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // useEffect (not useLayoutEffect): the parent's ref is only attached after
  // child layout effects have run, so measuring there would see null.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const base = container.getBoundingClientRect();
      const next: Path[] = [];
      for (const e of edges) {
        const a = container.querySelector<HTMLElement>(`[data-node-id="${e.from}"]`);
        const b = container.querySelector<HTMLElement>(`[data-node-id="${e.to}"]`);
        if (!a || !b) continue;
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        const x1 = ra.right - base.left;
        const y1 = ra.top + ra.height / 2 - base.top;
        const x2 = rb.left - base.left;
        const y2 = rb.top + Math.min(rb.height / 2, 44) - base.top;
        const dx = Math.max(40, (x2 - x1) / 2);
        next.push({
          key: `${e.from}->${e.to}`,
          tone: e.tone ?? "primary",
          d: `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`,
        });
      }
      setPaths(next);
      setSize({ w: container.scrollWidth, h: container.scrollHeight });
    };

    measure();
    // Second pass once web fonts have settled (text reflow moves card edges).
    const raf = requestAnimationFrame(measure);
    document.fonts?.ready.then(measure).catch(() => {});
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    container.querySelectorAll<HTMLElement>("[data-node-id]").forEach((el) => ro.observe(el));
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, edges, ...deps]);

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0 z-0"
      width={size.w}
      height={size.h}
      aria-hidden
    >
      <defs>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" className="fill-neutral-400" />
        </marker>
      </defs>
      {paths.map((p) => (
        <path
          key={p.key}
          d={p.d}
          fill="none"
          strokeWidth={p.tone === "primary" ? 1.75 : 1.25}
          strokeDasharray={p.tone === "muted" ? "5 4" : undefined}
          className={p.tone === "primary" ? "stroke-neutral-400" : "stroke-neutral-300"}
          markerEnd="url(#arrow)"
        />
      ))}
    </svg>
  );
}

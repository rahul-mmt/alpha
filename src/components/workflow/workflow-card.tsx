"use client";

import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_META, lastSignOff, type Card, type Status } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusDots } from "./status-dots";
import { ProvenanceStrip } from "./provenance-strip";

export interface CardColumn {
  label: ReactNode;
  content: ReactNode;
  /** Shaded first column — the value inherited from the previous stage. */
  anchor?: boolean;
  width?: string;
}

export interface CardMenuItem {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
  separatorBefore?: boolean;
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function WorkflowCard({
  nodeId,
  title,
  card,
  columns,
  summary,
  compact,
  dimmed,
  onRequestStatus,
  onHistory,
  onConflict,
  menu,
  className,
  accent,
}: {
  nodeId: string;
  title: string;
  card: Card;
  columns: CardColumn[];
  /** One-line text shown instead of the grid in compact mode. */
  summary: string;
  compact?: boolean;
  dimmed?: boolean;
  onRequestStatus: (s: Status) => void;
  onHistory: () => void;
  onConflict: () => void;
  menu?: CardMenuItem[];
  className?: string;
  accent?: string;
}) {
  // minmax(0, …) stops long unbreakable content (file chips, codes) from widening a column.
  const template = columns.map((c) => `minmax(0, ${c.width ?? "1fr"})`).join(" ");
  const signed = lastSignOff(card);
  const conflict = card.provenance.activeConflict;

  return (
    <div
      data-node-id={nodeId}
      className={cn(
        "relative z-10 rounded-md border bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_24px_-12px_rgba(0,34,75,0.25)] transition-opacity",
        conflict ? "border-red-300" : "border-neutral-200",
        dimmed && "opacity-30 hover:opacity-100",
        className
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div
          className="inline-flex items-center gap-2 rounded border border-neutral-300 bg-neutral-100 px-2 py-0.5 text-[15px] font-semibold text-neutral-800"
          style={accent ? { borderLeft: `3px solid ${accent}` } : undefined}
        >
          {title}
          <span className="font-mono text-[10px] font-normal text-neutral-500">{card.provenance.cardRevision}</span>
        </div>
        {menu && menu.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-sm" aria-label="Card actions" />}
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {menu.map((m) => (
                <div key={m.label}>
                  {m.separatorBefore && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    variant={m.destructive ? "destructive" : "default"}
                    onClick={m.onSelect}
                  >
                    {m.label}
                  </DropdownMenuItem>
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {compact ? (
        <p className="line-clamp-2 rounded-sm border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[11px] leading-snug text-neutral-700">
          {summary || <span className="italic text-neutral-400">Empty card</span>}
        </p>
      ) : (
        <div className="overflow-hidden rounded-sm border border-neutral-200">
          <div className="grid" style={{ gridTemplateColumns: template }}>
            {columns.map((c, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center border-b border-r border-neutral-200 px-2 py-1.5 text-[11px] font-bold text-neutral-800 last:border-r-0",
                  c.anchor && "bg-neutral-200"
                )}
              >
                {c.label}
              </div>
            ))}
            {columns.map((c, i) => (
              <div
                key={`${i}-body`}
                className={cn(
                  "min-h-[88px] border-r border-neutral-200 last:border-r-0",
                  c.anchor && "bg-neutral-200/80"
                )}
              >
                {c.content}
              </div>
            ))}
          </div>
          <ProvenanceStrip
            value={card.provenance}
            historyCount={card.history.length}
            onHistory={onHistory}
            onConflict={onConflict}
          />
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="min-w-0 truncate text-[10px] text-neutral-500">
          {signed?.signOff ? (
            <>
              <span className="font-medium text-neutral-700">{STATUS_META[signed.signOff.to].label}</span> by{" "}
              {signed.signOff.reviewer} · {signed.signOff.role} · {shortDate(signed.at)}
            </>
          ) : (
            <span className="italic">No sign-off recorded</span>
          )}
        </div>
        <StatusDots value={card.status} onRequestChange={onRequestStatus} />
      </div>
    </div>
  );
}

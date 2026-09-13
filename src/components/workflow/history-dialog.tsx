"use client";

import { AlertTriangle, FilePen, GitBranch, Link2, PlusCircle, ShieldCheck } from "lucide-react";
import { STATUS_META, type HistoryEvent, type HistoryEventType } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const ICON: Record<HistoryEventType, React.ComponentType<{ className?: string }>> = {
  created: PlusCircle,
  edited: FilePen,
  status: ShieldCheck,
  conflict: AlertTriangle,
  duplicated: GitBranch,
  linked: Link2,
};

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HistoryDialog({
  open,
  onOpenChange,
  title,
  history,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  history: HistoryEvent[];
}) {
  const items = [...history].reverse();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Card history</DialogTitle>
          <DialogDescription>
            {title} · {history.length} event{history.length === 1 ? "" : "s"}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-3">
          <ol className="relative ml-2 border-l border-neutral-200">
            {items.map((ev) => {
              const Icon = ICON[ev.type];
              return (
                <li key={ev.id} className="relative pb-5 pl-6 last:pb-0">
                  <span
                    className={cn(
                      "absolute -left-[11px] top-0 grid size-[22px] place-items-center rounded-full border bg-white",
                      ev.type === "status" && "border-[#00224B]/40 text-[#00224B]",
                      ev.type === "conflict" && "border-red-300 text-red-600",
                      !["status", "conflict"].includes(ev.type) && "border-neutral-300 text-neutral-500"
                    )}
                  >
                    <Icon className="size-3" />
                  </span>
                  <div className="text-[11px] text-neutral-500">{fmt(ev.at)}</div>
                  <div className="text-sm text-neutral-800">{ev.summary}</div>
                  {ev.signOff && (
                    <div className="mt-1.5 rounded-md border border-neutral-200 bg-neutral-50 p-2.5 text-xs">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium text-neutral-800">{ev.signOff.reviewer}</span>
                        <span className="text-neutral-500">{ev.signOff.role}</span>
                        <span className="ml-auto flex items-center gap-1 font-mono text-[10px] text-neutral-500">
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: STATUS_META[ev.signOff.from].color }}
                          />
                          →
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: STATUS_META[ev.signOff.to].color }}
                          />
                          {ev.signOff.revision}
                        </span>
                      </div>
                      <p className="mt-1 text-neutral-700">{ev.signOff.rationale}</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

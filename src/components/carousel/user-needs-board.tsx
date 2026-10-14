"use client";

import { Plus, Trash2 } from "lucide-react";
import { NEED_KINDS, newUserNeed, type NeedKind, type UserNeedCard } from "@/lib/user-needs";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Editable User Needs cards: a need statement, free-form notes and an
 * Improve / Maintain tag. Everything saves as you type.
 */
export function UserNeedsBoard({
  cards,
  onChange,
  autoFocusId,
}: {
  cards: UserNeedCard[];
  onChange: (next: UserNeedCard[] | ((c: UserNeedCard[]) => UserNeedCard[])) => void;
  /** Newly added card to focus. */
  autoFocusId?: string | null;
}) {
  const patch = (id: string, p: Partial<UserNeedCard>) => onChange((cs) => cs.map((c) => (c.id === id ? { ...c, ...p } : c)));
  const remove = (id: string) => onChange((cs) => cs.filter((c) => c.id !== id));
  const add = () => onChange((cs) => [...cs, newUserNeed()]);

  const improve = cards.filter((c) => c.kind === "improve").length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
        <span>User Needs</span>
        <span className="font-mono font-normal normal-case tracking-normal text-neutral-400">
          {cards.length} card{cards.length === 1 ? "" : "s"} · {improve} improve · {cards.length - improve} maintain
        </span>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c, i) => (
          <NeedCard key={c.id} card={c} index={i} autoFocus={c.id === autoFocusId} onPatch={(p) => patch(c.id, p)} onRemove={() => remove(c.id)} />
        ))}

        <button
          type="button"
          onClick={add}
          className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 bg-white/60 p-6 text-sm font-medium text-neutral-500 transition hover:border-[#08A9AD] hover:text-[#08A9AD]"
        >
          <Plus className="size-5" />
          Add user need
        </button>
      </div>
    </div>
  );
}

function NeedCard({
  card,
  index,
  autoFocus,
  onPatch,
  onRemove,
}: {
  card: UserNeedCard;
  index: number;
  autoFocus?: boolean;
  onPatch: (p: Partial<UserNeedCard>) => void;
  onRemove: () => void;
}) {
  return (
    <div
      data-node-id={card.id}
      className="group relative flex flex-col gap-3 rounded-lg border border-violet-200 bg-violet-50/60 p-4 shadow-sm transition hover:border-violet-300"
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center whitespace-nowrap rounded border border-violet-300 bg-violet-100 px-2 py-0.5 text-[13px] font-semibold text-violet-900">
          UN-{String(index + 1).padStart(2, "0")}
        </span>
        <div className="ml-auto flex items-center rounded-md border border-neutral-200 bg-white p-0.5">
          {(Object.keys(NEED_KINDS) as NeedKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => onPatch({ kind: k })}
              className={cn(
                "rounded px-2 py-0.5 text-[11px] font-medium transition",
                card.kind === k ? cn("border", NEED_KINDS[k].className) : "text-neutral-500 hover:text-neutral-800"
              )}
            >
              {NEED_KINDS[k].label}
            </button>
          ))}
        </div>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={onRemove}
                className="grid size-6 place-items-center rounded text-neutral-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 group-focus-within:opacity-100"
              />
            }
          >
            <Trash2 className="size-3.5" />
          </TooltipTrigger>
          <TooltipContent side="top">Remove card</TooltipContent>
        </Tooltip>
      </div>

      <textarea
        autoFocus={autoFocus}
        value={card.title}
        onChange={(e) => onPatch({ title: e.target.value })}
        placeholder="Need statement — what must get better for whom?"
        rows={2}
        className="field-sizing-content w-full resize-none rounded-md border border-transparent bg-transparent px-1.5 py-1 text-[15px] font-semibold leading-snug text-neutral-900 outline-none transition placeholder:font-normal placeholder:text-neutral-400 hover:border-violet-200 focus:border-[#08A9AD] focus:bg-white"
      />

      <div className="flex flex-col gap-1">
        <span className="px-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Notes</span>
        <textarea
          value={card.note}
          onChange={(e) => onPatch({ note: e.target.value })}
          placeholder="Evidence, who said it, open questions…"
          rows={3}
          className="field-sizing-content w-full resize-y rounded-md border border-transparent bg-transparent px-1.5 py-1 text-[13px] leading-relaxed text-neutral-700 outline-none transition placeholder:text-neutral-400 hover:border-violet-200 focus:border-[#08A9AD] focus:bg-white"
        />
      </div>

      <div className="mt-auto flex items-center justify-between text-[10px] text-neutral-400">
        <span>Added {new Date(card.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
        {card.kind === "improve" ? <span className="text-[#0a7f82]">Eligible for Feature Development</span> : <span>Sustaining only</span>}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { ArrowUp, Check, MessageSquare, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import { initials, relativeTime, type CommentAnchor, type CommentThread } from "@/lib/comments";
import {
  createThread,
  deleteThread,
  getDisplayName,
  replyToThread,
  setCommentUi,
  setDisplayName,
  setResolved,
  useCommentUi,
  useThreads,
} from "@/lib/comments-store";
import { cn } from "@/lib/utils";

export const PURPLE = "#7B61FF";
const ANCHOR_SELECTOR = "[data-node-id],[data-anchor]";
const POPOVER_W = 340;

type Pos = { x: number; y: number };

/** Resolve a thread's anchor to container-relative pixels; null if its anchor element is gone. */
function resolve(anchor: CommentAnchor, container: HTMLElement): Pos | null {
  const c = container.getBoundingClientRect();
  if (anchor.nodeId) {
    const el =
      container.querySelector<HTMLElement>(`[data-node-id="${anchor.nodeId}"]`) ??
      container.querySelector<HTMLElement>(`[data-anchor="${anchor.nodeId}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left - c.left + (anchor.fx ?? 0) * r.width, y: r.top - c.top + (anchor.fy ?? 0) * r.height };
  }
  if (anchor.x !== undefined && anchor.y !== undefined) return { x: anchor.x, y: anchor.y };
  return null;
}

/**
 * Figma-style comment pins for one screen. Render inside a `position: relative`
 * container; pass the same element via `containerRef`.
 */
export function CommentLayer({ pageKey, containerRef }: { pageKey: string; containerRef: RefObject<HTMLElement | null> }) {
  const threads = useThreads();
  const ui = useCommentUi();
  const [positions, setPositions] = useState<Record<string, Pos>>({});
  const [containerW, setContainerW] = useState(1200);
  const [ghost, setGhost] = useState<Pos | null>(null);
  const [tick, setTick] = useState(0);

  const mine = threads.filter((t) => t.page === pageKey && (ui.showResolved || !t.resolved));
  const draft = ui.draft?.page === pageKey ? ui.draft : null;
  const active = mine.find((t) => t.id === ui.activeId) ?? null;

  /* Measure pin positions (re-run on resize, layout changes, data changes). */
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const next: Record<string, Pos> = {};
      for (const t of mine) {
        const p = resolve(t.anchor, el);
        if (p) next[t.id] = p;
      }
      if (draft) {
        const p = resolve(draft.anchor, el);
        if (p) next.__draft = p;
      }
      setPositions(next);
      setContainerW(el.clientWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    el.querySelectorAll<HTMLElement>(ANCHOR_SELECTOR).forEach((n) => ro.observe(n));
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threads, ui.showResolved, ui.draft, pageKey, tick]);

  // Re-measure shortly after mount so web fonts / lazy content settle.
  useEffect(() => {
    const id = setTimeout(() => setTick((t) => t + 1), 300);
    return () => clearTimeout(id);
  }, [pageKey]);

  /* Keyboard: C toggles comment mode, Escape backs out. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;
      if (e.key === "Escape") {
        setCommentUi((u) => (u.draft ? { draft: null } : u.activeId ? { activeId: null } : { mode: false }));
      } else if (!typing && (e.key === "c" || e.key === "C") && !e.metaKey && !e.ctrlKey) {
        setCommentUi((u) => ({ mode: !u.mode, draft: null }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const place = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    const c = el.getBoundingClientRect();
    // The overlay is on top, so look through it for an anchorable element.
    const under = document
      .elementsFromPoint(e.clientX, e.clientY)
      .find((n) => n instanceof HTMLElement && n.matches(ANCHOR_SELECTOR) && el.contains(n)) as HTMLElement | undefined;
    const anchorEl = under?.closest<HTMLElement>(ANCHOR_SELECTOR) ?? null;
    let anchor: CommentAnchor;
    if (anchorEl) {
      const r = anchorEl.getBoundingClientRect();
      anchor = {
        nodeId: anchorEl.dataset.nodeId ?? anchorEl.dataset.anchor,
        fx: (e.clientX - r.left) / r.width,
        fy: (e.clientY - r.top) / r.height,
      };
    } else {
      anchor = { x: e.clientX - c.left, y: e.clientY - c.top };
    }
    setCommentUi({ draft: { page: pageKey, anchor }, activeId: null });
  };

  const popSide = (p: Pos) => (p.x + 48 + POPOVER_W > containerW ? "left" : "right");

  return (
    <>
      {/* Click-catcher while in comment mode */}
      {ui.mode && (
        <div
          className="absolute inset-0 z-40 cursor-crosshair"
          onClick={place}
          onMouseMove={(e) => {
            const c = containerRef.current?.getBoundingClientRect();
            if (c) setGhost({ x: e.clientX - c.left, y: e.clientY - c.top });
          }}
          onMouseLeave={() => setGhost(null)}
          aria-label="Click to add a comment"
        >
          {ghost && !draft && (
            <Pin className="pointer-events-none opacity-70" style={{ left: ghost.x, top: ghost.y }}>
              <MessageSquare className="size-3.5" />
            </Pin>
          )}
        </div>
      )}

      {/* Existing pins */}
      {mine.map((t) => {
        const p = positions[t.id];
        if (!p) return null;
        const isActive = t.id === ui.activeId;
        const first = t.messages[0];
        return (
          <Pin
            key={t.id}
            id={`pin-${t.id}`}
            style={{ left: p.x, top: p.y }}
            resolved={t.resolved}
            active={isActive}
            onClick={(e) => {
              e.stopPropagation();
              setCommentUi({ activeId: isActive ? null : t.id, draft: null });
            }}
            title={`${first?.author}: ${first?.text.slice(0, 80)}`}
          >
            {t.resolved ? <Check className="size-3.5" /> : t.messages.length > 1 ? t.messages.length : initials(first?.author ?? "?")}
          </Pin>
        );
      })}

      {/* Draft pin + composer */}
      {draft && positions.__draft && (
        <>
          <Pin style={{ left: positions.__draft.x, top: positions.__draft.y }} active>
            <MessageSquare className="size-3.5" />
          </Pin>
          <Floating pos={positions.__draft} side={popSide(positions.__draft)}>
            <Composer
              autoFocus
              placeholder="Add a comment"
              onCancel={() => setCommentUi({ draft: null })}
              onSubmit={(text) => {
                const t = createThread(pageKey, draft.anchor, text);
                setCommentUi({ draft: null, activeId: t.id });
              }}
            />
          </Floating>
        </>
      )}

      {/* Open thread */}
      {active && positions[active.id] && (
        <Floating pos={positions[active.id]} side={popSide(positions[active.id])}>
          <ThreadPanel thread={active} onClose={() => setCommentUi({ activeId: null })} />
        </Floating>
      )}
    </>
  );
}

/* ---------- pieces ---------- */

function Pin({
  children,
  className,
  style,
  resolved,
  active,
  onClick,
  id,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  style: React.CSSProperties;
  resolved?: boolean;
  active?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  id?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      id={id}
      title={title}
      onClick={onClick}
      style={style}
      className={cn(
        "absolute z-50 grid size-8 -translate-y-full place-items-center rounded-full rounded-bl-[3px] border-2 border-white text-[11px] font-semibold text-white shadow-[0_2px_8px_rgba(0,0,0,0.25)] transition-transform",
        resolved ? "bg-neutral-400" : "bg-[#7B61FF]",
        active && "scale-110 ring-2 ring-[#7B61FF]/40",
        onClick && "hover:scale-110",
        className
      )}
    >
      {children}
    </button>
  );
}

function Floating({ pos, side, children }: { pos: Pos; side: "left" | "right"; children: React.ReactNode }) {
  return (
    <div
      className="absolute z-50"
      style={{
        top: pos.y - 36,
        left: side === "right" ? pos.x + 40 : undefined,
        right: side === "left" ? undefined : undefined,
        ...(side === "left" ? { left: pos.x - POPOVER_W - 12 } : {}),
        width: POPOVER_W,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

function Composer({
  onSubmit,
  onCancel,
  placeholder,
  autoFocus,
  compact,
}: {
  onSubmit: (text: string) => void;
  onCancel?: () => void;
  placeholder: string;
  autoFocus?: boolean;
  compact?: boolean;
}) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);
  const send = () => {
    const v = text.trim();
    if (!v) return;
    onSubmit(v);
    setText("");
  };
  return (
    <div
      className={cn(
        "flex items-end gap-2 rounded-2xl border-2 bg-white shadow-[0_8px_30px_-10px_rgba(0,0,0,0.35)]",
        compact ? "border-neutral-200 px-3 py-2" : "px-4 py-3"
      )}
      style={compact ? undefined : { borderColor: PURPLE }}
    >
      <textarea
        ref={ref}
        autoFocus={autoFocus}
        rows={1}
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          } else if (e.key === "Escape" && onCancel) {
            e.stopPropagation();
            onCancel();
          }
        }}
        className={cn(
          "max-h-40 flex-1 resize-none bg-transparent leading-snug text-neutral-800 outline-none placeholder:text-neutral-400",
          compact ? "text-sm" : "text-base"
        )}
      />
      <button
        type="button"
        onClick={send}
        disabled={!text.trim()}
        aria-label="Send comment"
        className={cn(
          "grid shrink-0 place-items-center rounded-full text-white transition",
          compact ? "size-7" : "size-9",
          text.trim() ? "bg-[#7B61FF] hover:brightness-110" : "bg-neutral-300"
        )}
      >
        <ArrowUp className={compact ? "size-3.5" : "size-4"} />
      </button>
    </div>
  );
}

function ThreadPanel({ thread, onClose }: { thread: CommentThread; onClose: () => void }) {
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState("");

  return (
    <div className="flex flex-col rounded-2xl border border-neutral-200 bg-white shadow-[0_8px_30px_-10px_rgba(0,0,0,0.35)]">
      <div className="flex items-center gap-1 border-b border-neutral-100 px-3 py-2">
        <span className="text-xs font-medium text-neutral-500">
          {thread.messages.length} comment{thread.messages.length === 1 ? "" : "s"}
          {thread.resolved && <span className="ml-1 rounded bg-neutral-100 px-1 text-[10px] text-neutral-600">Resolved</span>}
        </span>
        <span className="ml-auto" />
        <IconBtn
          title={thread.resolved ? "Reopen" : "Resolve"}
          onClick={() => {
            setResolved(thread.id, !thread.resolved);
            if (!thread.resolved) onClose();
          }}
        >
          {thread.resolved ? <RotateCcw className="size-3.5" /> : <Check className="size-3.5" />}
        </IconBtn>
        <IconBtn
          title="Delete thread"
          onClick={() => {
            if (confirm("Delete this comment thread?")) {
              deleteThread(thread.id);
              onClose();
            }
          }}
          danger
        >
          <Trash2 className="size-3.5" />
        </IconBtn>
        <IconBtn title="Close" onClick={onClose}>
          <X className="size-3.5" />
        </IconBtn>
      </div>

      <ol className="flex max-h-[320px] flex-col gap-3 overflow-y-auto px-3 py-3">
        {thread.messages.map((m) => (
          <li key={m.id} className="flex gap-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#7B61FF]/15 text-[10px] font-semibold text-[#5b44d6]">
              {initials(m.author)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="truncate text-xs font-semibold text-neutral-800">{m.author}</span>
                <span className="text-[10px] text-neutral-400">{relativeTime(m.at)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-snug text-neutral-700">{m.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="border-t border-neutral-100 px-3 py-2">
        <div className="mb-1.5 flex items-center gap-1 text-[10px] text-neutral-400">
          Replying as
          {editingName ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => {
                if (name.trim()) setDisplayName(name);
                setEditingName(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="w-32 rounded border border-neutral-200 px-1 text-[10px] text-neutral-700 outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setName(getDisplayName());
                setEditingName(true);
              }}
              className="inline-flex items-center gap-0.5 font-medium text-neutral-600 hover:underline"
            >
              {getDisplayName()} <Pencil className="size-2.5" />
            </button>
          )}
        </div>
        <Composer compact placeholder="Reply…" onSubmit={(t) => replyToThread(thread.id, t)} />
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn("rounded p-1 text-neutral-500 hover:bg-neutral-100", danger ? "hover:text-red-600" : "hover:text-neutral-900")}
    >
      {children}
    </button>
  );
}

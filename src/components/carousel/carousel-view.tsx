"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minimize2, Plus } from "lucide-react";
import * as A from "@/lib/actions";
import { useWorkflowStore } from "@/lib/store";
import type { SignOff, Status } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SiteNav } from "@/components/site-nav";
import { HeaderUser } from "@/components/header-user";
import { CommentLayer } from "@/components/comments/comment-layer";
import { CommentToolbar } from "@/components/comments/comment-toolbar";
import { BrandMark } from "@/components/workflow/brand-mark";
import { Connectors, type Edge } from "@/components/workflow/connectors";
import { SignOffDialog } from "@/components/workflow/sign-off-dialog";
import { HistoryDialog } from "@/components/workflow/history-dialog";
import { ReasonDialog, type ReasonRequest } from "@/components/workflow/reason-dialog";
import { DEFAULT_PHASE_ID, PHASES, phaseNodeId } from "./phases";
import { Rolodex } from "./rolodex";
import { FeatureDevelopmentBoard } from "./feature-development-board";
import { PlaceholderBoard } from "./placeholder-board";

function readPhaseFromUrl(): number {
  if (typeof window === "undefined") return -1;
  const id = new URLSearchParams(window.location.search).get("phase");
  return PHASES.findIndex((p) => p.id === id);
}

/**
 * Carousel UI: the workflow's major phases on a vertical rolodex. Turning the
 * drum to a phase expands its cards to the right. Feature Development is the
 * live board; the rest are placeholders that mirror the whiteboard.
 */
export function CarouselView() {
  const [state, setState] = useWorkflowStore();
  const [selected, setSelected] = useState(() => {
    const i = readPhaseFromUrl();
    return i === -1 ? PHASES.findIndex((p) => p.id === DEFAULT_PHASE_ID) : i;
  });
  const [compact, setCompact] = useState(false);
  const [signOffReq, setSignOffReq] = useState<A.SignOffRequest | null>(null);
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [reasonReq, setReasonReq] = useState<ReasonRequest | null>(null);
  const [scrollTick, setScrollTick] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const phase = PHASES[selected];
  const isLive = phase.board.kind === "feature-development";
  const pageKey = `carousel:${phase.id}`;

  // Shareable URL: /carousel?phase=…
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    q.set("phase", phase.id);
    window.history.replaceState(null, "", `?${q.toString()}`);
  }, [phase.id]);

  // The rolodex is sticky, so its position inside the measured container
  // changes as the board scrolls. Nudge the connectors to re-measure.
  const onScroll = () => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      setScrollTick((t) => t + 1);
    });
  };

  const bump = () => setScrollTick((t) => t + 1);

  // Turning the drum scrolls the board back to the top of the new phase.
  const select = (i: number) => {
    setSelected(i);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ---------- status, history, conflicts (same as the canvas) ---------- */

  const requestStatus = (id: string, to: Status) => setSignOffReq(A.buildSignOffRequest(state, id, to));
  const confirmSignOff = (so: SignOff) => {
    if (signOffReq) setState((s) => A.applySignOff(s, signOffReq.cardId, so));
    setSignOffReq(null);
  };
  const toggleConflict = (id: string) => {
    const card = A.findCard(state, id);
    if (!card) return;
    const flagging = !card.provenance.activeConflict;
    setReasonReq({
      title: flagging ? "Flag an active conflict" : "Resolve the active conflict",
      description: flagging
        ? "Describe the conflict. Approval is blocked until it is resolved."
        : `Currently flagged: "${card.provenance.conflictReason ?? "no reason recorded"}". Describe how it was resolved.`,
      placeholder: flagging ? "e.g. Dimensional conflict with ISO 80369-7…" : "e.g. Geometry revised per ECO-118…",
      confirmLabel: flagging ? "Flag conflict" : "Mark resolved",
      destructive: flagging,
      onConfirm: (reason) => setState((s) => A.setConflict(s, id, flagging, reason)),
    });
  };
  const historyCard = historyFor ? A.findCard(state, historyFor) : undefined;

  /* ---------- connectors ---------- */

  const edges = useMemo<Edge[]>(() => {
    if (!isLive) return [];
    const out: Edge[] = [];
    for (const m of state.mechanisms) {
      out.push({ from: phaseNodeId(phase.id), to: m.id, tone: "muted" });
      for (const f of state.features.filter((f) => f.moaId === m.id)) out.push({ from: m.id, to: f.id });
    }
    return out;
  }, [state, isLive, phase.id]);

  const conflicts = useMemo(
    () => [...state.mechanisms, ...state.features].filter((c) => c.provenance.activeConflict).length,
    [state]
  );

  return (
    <div className="flex h-screen flex-col bg-white text-neutral-900">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-neutral-200 bg-white px-5 py-3">
        <BrandMark />
        <SiteNav />
        <Separator orientation="vertical" className="h-8!" />
        <div className="flex items-center gap-2 whitespace-nowrap text-xs text-neutral-600">
          <span className="font-mono text-[11px] text-neutral-400">
            {String(selected + 1).padStart(2, "0")}/{String(PHASES.length).padStart(2, "0")}
          </span>
          <span className="font-medium text-neutral-800">{phase.title}</span>
          {isLive ? (
            <>
              <Badge variant="outline">{state.mechanisms.length} mechanisms</Badge>
              <Badge variant="outline">{state.features.length} features</Badge>
              {conflicts > 0 && (
                <Badge variant="destructive">
                  {conflicts} active conflict{conflicts === 1 ? "" : "s"}
                </Badge>
              )}
            </>
          ) : (
            <Badge variant="outline" className="text-neutral-400">
              placeholder
            </Badge>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3">
          {isLive && (
            <>
              <Button variant="outline" size="sm" onClick={() => setCompact((c) => !c)} title={compact ? "Expand cards" : "Compact view"}>
                {compact ? <Maximize2 className="size-3.5" /> : <Minimize2 className="size-3.5" />}
                <span className="hidden 2xl:inline">{compact ? "Expand" : "Compact"}</span>
              </Button>
              <Button size="sm" className="bg-[#00224B] hover:bg-[#00224B]/90" onClick={() => setState((s) => A.addMechanism(s).state)}>
                <Plus className="size-3.5" />
                Add mechanism
              </Button>
              <Separator orientation="vertical" className="h-8!" />
            </>
          )}
          <CommentToolbar pageKey={pageKey} />
          <HeaderUser />
        </div>
      </header>

      <div ref={scrollRef} onScroll={onScroll} className="dotted-canvas relative flex-1 overflow-auto">
        <div ref={containerRef} className="relative flex min-h-full min-w-full items-start">
          <Connectors containerRef={containerRef} edges={edges} deps={[state, compact, selected, scrollTick]} />
          <CommentLayer pageKey={pageKey} containerRef={containerRef} />

          {/* Rolodex column — stays put while the board scrolls */}
          <aside className="sticky top-0 z-20 flex h-[calc(100vh-57px)] w-[380px] shrink-0 items-center justify-center border-r border-neutral-200/80 bg-[#f7f7f8]">
            <Rolodex phases={PHASES} selected={selected} onSelect={select} />
            {isLive && (
              <>
                {/* Stub from the selected card to the column edge; the connectors pick up from the port. */}
                <div aria-hidden className="pointer-events-none absolute right-0 top-1/2 w-[60px] border-t border-dashed border-neutral-300" />
                <span data-node-id={phaseNodeId(phase.id)} className="absolute right-0 top-1/2 size-0" />
              </>
            )}
          </aside>

          {/* Expanded phase */}
          <section
            key={phase.id}
            className="relative z-10 flex-1 p-12 animate-in fade-in slide-in-from-left-6 duration-300"
            aria-label={`${phase.title} cards`}
            onAnimationEnd={bump}
          >
            <div className="mb-8">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#08A9AD]">
                Phase {selected + 1} of {PHASES.length}
              </div>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#00224B]">{phase.title}</h2>
              {phase.note && <p className="mt-1 text-[13px] text-neutral-600">{phase.note}</p>}
            </div>

            {phase.board.kind === "feature-development" ? (
              <div className="flex items-start gap-24">
                <FeatureDevelopmentBoard
                  state={state}
                  setState={setState}
                  compact={compact}
                  onRequestStatus={requestStatus}
                  onHistory={setHistoryFor}
                  onConflict={toggleConflict}
                />
                <div className="mt-2 shrink-0 self-start opacity-60">
                  <div className="inline-flex items-center rounded border border-green-300 bg-green-50 px-2 py-0.5 text-[15px] font-semibold text-green-800">
                    Feature Specification
                  </div>
                  <div className="mt-2 w-[220px] rounded-md border border-dashed border-neutral-300 bg-white/50 p-4 text-xs text-neutral-500">
                    Next stage — not part of this demo.
                  </div>
                </div>
              </div>
            ) : (
              <PlaceholderBoard phase={phase} />
            )}
          </section>
        </div>
      </div>

      <SignOffDialog request={signOffReq} onCancel={() => setSignOffReq(null)} onConfirm={confirmSignOff} />
      <HistoryDialog
        open={!!historyCard}
        onOpenChange={(o) => !o && setHistoryFor(null)}
        title={historyCard ? A.cardTitle(state, historyCard) : ""}
        history={historyCard?.history ?? []}
      />
      <ReasonDialog request={reasonReq} onClose={() => setReasonReq(null)} />
    </div>
  );
}

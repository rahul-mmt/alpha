"use client";

import { useMemo, useRef, useState } from "react";
import { Download, Maximize2, Minimize2, Plus, RotateCcw } from "lucide-react";
import * as A from "@/lib/actions";
import { logEdit, resetWorkflowState, useWorkflowStore } from "@/lib/store";
import { STATUS_META, todayISO, type Card, type Feature, type MechanismOfAction, type SignOff, type Status } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SiteNav } from "@/components/site-nav";
import { HeaderUser } from "@/components/header-user";
import { CommentLayer } from "@/components/comments/comment-layer";
import { CommentToolbar } from "@/components/comments/comment-toolbar";
import { BrandMark } from "./brand-mark";
import { PhaseHexagon } from "./phase-hexagon";
import { MoaCard, type Updater } from "./moa-card";
import { FeatureCard } from "./feature-card";
import { Connectors, type Edge } from "./connectors";
import { SignOffDialog } from "./sign-off-dialog";
import { HistoryDialog } from "./history-dialog";
import { ReasonDialog, type ReasonRequest } from "./reason-dialog";

const PHASE_NODE = "phase-feature-development";

export function WorkflowCanvas() {
  const [state, setState] = useWorkflowStore();
  const [signOffReq, setSignOffReq] = useState<A.SignOffRequest | null>(null);
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [reasonReq, setReasonReq] = useState<ReasonRequest | null>(null);
  const [filter, setFilter] = useState<Status | null>(null);
  const [compact, setCompact] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  /* ---------- edits ---------- */

  const changeMoa = (id: string) => (updater: Updater<MechanismOfAction>, summary: string) => {
    setState((s) => A.editMechanism(s, id, updater));
    logEdit(id, summary);
  };
  const changeFeature = (id: string) => (updater: Updater<Feature>, summary: string) => {
    setState((s) => A.editFeature(s, id, updater));
    logEdit(id, summary);
  };

  /* ---------- status + sign-off ---------- */

  const requestStatus = (id: string, to: Status) => setSignOffReq(A.buildSignOffRequest(state, id, to));
  const confirmSignOff = (so: SignOff) => {
    if (signOffReq) setState((s) => A.applySignOff(s, signOffReq.cardId, so));
    setSignOffReq(null);
  };

  /* ---------- conflicts ---------- */

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

  /* ---------- toolbar ---------- */

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `feature-workflow-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ---------- derived ---------- */

  const edges = useMemo<Edge[]>(() => {
    const out: Edge[] = [];
    for (const m of state.mechanisms) {
      out.push({ from: PHASE_NODE, to: m.id, tone: "muted" });
      for (const f of state.features.filter((f) => f.moaId === m.id)) out.push({ from: m.id, to: f.id });
    }
    return out;
  }, [state]);

  const featureCountByTheory = useMemo(() => {
    const out: Record<string, number> = {};
    for (const f of state.features) out[f.theoryId] = (out[f.theoryId] ?? 0) + 1;
    return out;
  }, [state.features]);

  const counts = useMemo(() => {
    const all: Card[] = [...state.mechanisms, ...state.features];
    return {
      byStatus: {
        red: all.filter((c) => c.status === "red").length,
        amber: all.filter((c) => c.status === "amber").length,
        green: all.filter((c) => c.status === "green").length,
      } as Record<Status, number>,
      conflicts: all.filter((c) => c.provenance.activeConflict).length,
      signOffs: all.reduce((n, c) => n + c.history.filter((h) => h.signOff).length, 0),
    };
  }, [state]);

  const historyCard = historyFor ? A.findCard(state, historyFor) : undefined;
  const dim = (c: Card) => !!filter && c.status !== filter;

  return (
    <div className="flex h-screen flex-col bg-white text-neutral-900">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-neutral-200 bg-white px-5 py-3">
        <BrandMark />
        <SiteNav />
        <Separator orientation="vertical" className="h-8!" />

        <div className="hidden items-center gap-2 whitespace-nowrap text-xs text-neutral-600 2xl:flex">
          <Badge variant="outline">{state.mechanisms.length} mechanisms</Badge>
          <Badge variant="outline">{state.features.length} features</Badge>
          <Badge variant="outline">{counts.signOffs} sign-offs</Badge>
          {counts.conflicts > 0 && (
            <Badge variant="destructive">
              {counts.conflicts} active conflict{counts.conflicts === 1 ? "" : "s"}
            </Badge>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-md border border-neutral-200 p-0.5">
            {(Object.keys(STATUS_META) as Status[]).map((s) => (
              <Tooltip key={s}>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      onClick={() => setFilter(filter === s ? null : s)}
                      className={cn(
                        "flex items-center gap-1.5 whitespace-nowrap rounded px-2 py-1 text-xs text-neutral-700 transition",
                        filter === s ? "bg-neutral-900 text-white" : "hover:bg-neutral-100"
                      )}
                    />
                  }
                >
                  <span className="size-2.5 rounded-full border border-black/30" style={{ backgroundColor: STATUS_META[s].color }} />
                  {STATUS_META[s].label}
                  <span className={cn("font-mono text-[10px]", filter === s ? "text-white/70" : "text-neutral-400")}>
                    {counts.byStatus[s]}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {filter === s ? "Clear filter" : `Highlight ${STATUS_META[s].label.toLowerCase()} cards`}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={() => setCompact((c) => !c)} title={compact ? "Expand cards" : "Compact view"}>
            {compact ? <Maximize2 className="size-3.5" /> : <Minimize2 className="size-3.5" />}
            <span className="hidden 2xl:inline">{compact ? "Expand" : "Compact"}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={exportJson} title="Export workflow as JSON">
            <Download className="size-3.5" />
            <span className="hidden 2xl:inline">Export</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => { resetWorkflowState(); setFilter(null); }} title="Reset to seed content">
            <RotateCcw className="size-3.5" />
            <span className="hidden 2xl:inline">Reset demo</span>
          </Button>
          <Button size="sm" className="bg-[#00224B] hover:bg-[#00224B]/90" onClick={() => setState((s) => A.addMechanism(s).state)}>
            <Plus className="size-3.5" />
            Add mechanism
          </Button>
          <Separator orientation="vertical" className="h-8!" />
          <CommentToolbar pageKey="canvas" />
          <HeaderUser />
        </div>
      </header>

      <div className="dotted-canvas relative flex-1 overflow-auto">
        <div ref={canvasRef} className="relative inline-block min-h-full min-w-full p-12">
          <Connectors containerRef={canvasRef} edges={edges} deps={[state, compact]} />
          <CommentLayer pageKey="canvas" containerRef={canvasRef} />

          <div className="relative z-10 flex items-start gap-24">
            <div className="sticky top-12 shrink-0 pt-2">
              <PhaseHexagon nodeId={PHASE_NODE} title="Feature Development" note="Only Improve UNs, NOT Maintain UNs" />
            </div>

            <div className="flex flex-col gap-16">
              <div className="flex gap-16">
                <StageHeading className="w-[460px]">Stage 1 · Clinical Mechanism of Action</StageHeading>
                <StageHeading className="w-[600px]">Stage 2 · Feature Identification</StageHeading>
              </div>

              {state.mechanisms.length === 0 && (
                <div className="w-[460px] rounded-md border border-dashed border-neutral-300 bg-white/70 p-6 text-sm text-neutral-500">
                  No mechanisms yet. Add one to start the workflow.
                </div>
              )}

              {state.mechanisms.map((m, mi) => {
                const feats = state.features.filter((f) => f.moaId === m.id);
                return (
                  <div key={m.id} className="flex items-start gap-16">
                    <div className="shrink-0">
                      <MoaCard
                        moa={m}
                        index={mi}
                        compact={compact}
                        dimmed={dim(m)}
                        featureCountByTheory={featureCountByTheory}
                        onChange={changeMoa(m.id)}
                        onRemoveTheory={(tid) => setState((s) => A.removeTheory(s, m.id, tid))}
                        onRequestStatus={(st) => requestStatus(m.id, st)}
                        onHistory={() => setHistoryFor(m.id)}
                        onConflict={() => toggleConflict(m.id)}
                        onAddFeature={(tid) => setState((s) => A.addFeature(s, m.id, tid).state)}
                        onDuplicate={() => setState((s) => A.duplicateMechanism(s, m.id))}
                        onDelete={() => setState((s) => A.deleteMechanism(s, m.id))}
                      />
                    </div>

                    <div className="flex flex-col gap-8">
                      {feats.map((f, fi) => (
                        <FeatureCard
                          key={f.id}
                          feature={f}
                          parent={m}
                          index={fi}
                          compact={compact}
                          dimmed={dim(f)}
                          onChange={changeFeature(f.id)}
                          onRelink={(tid) => setState((s) => A.relinkFeature(s, f.id, tid))}
                          onRequestStatus={(st) => requestStatus(f.id, st)}
                          onHistory={() => setHistoryFor(f.id)}
                          onConflict={() => toggleConflict(f.id)}
                          onDuplicate={() => setState((s) => A.duplicateFeature(s, f.id))}
                          onDelete={() => setState((s) => A.deleteFeature(s, f.id))}
                        />
                      ))}
                      <button
                        type="button"
                        onClick={() => setState((s) => A.addFeature(s, m.id).state)}
                        className="flex w-[600px] items-center justify-center gap-2 rounded-md border border-dashed border-neutral-300 bg-white/60 py-3 text-xs font-medium text-neutral-500 transition hover:border-[#08A9AD] hover:text-[#08A9AD]"
                      >
                        <Plus className="size-3.5" />
                        Add feature for mechanism {mi + 1}
                        {m.theories.length > 1 && <span className="text-neutral-400">· pick the theory from the card menu</span>}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-2 shrink-0 self-start opacity-60">
              <div className="inline-flex items-center rounded border border-green-300 bg-green-50 px-2 py-0.5 text-[15px] font-semibold text-green-800">
                Feature Specification
              </div>
              <div className="mt-2 w-[220px] rounded-md border border-dashed border-neutral-300 bg-white/50 p-4 text-xs text-neutral-500">
                Next stage — not part of this demo.
              </div>
            </div>
          </div>
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

function StageHeading({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("text-[11px] font-semibold uppercase tracking-wider text-neutral-500", className)}>{children}</div>;
}

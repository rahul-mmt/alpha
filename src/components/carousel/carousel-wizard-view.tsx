"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CircleAlert, Info } from "lucide-react";
import * as A from "@/lib/actions";
import { logEdit, useWorkflowStore } from "@/lib/store";
import { STATUS_META, type SignOff } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SiteNav } from "@/components/site-nav";
import { HeaderUser } from "@/components/header-user";
import { CommentLayer } from "@/components/comments/comment-layer";
import { CommentToolbar } from "@/components/comments/comment-toolbar";
import { BrandMark } from "@/components/workflow/brand-mark";
import { SignOffDialog } from "@/components/workflow/sign-off-dialog";
import { HistoryDialog } from "@/components/workflow/history-dialog";
import { ReasonDialog, type ReasonRequest } from "@/components/workflow/reason-dialog";
import { STEPS, checkStep, type StepCheck, type StepId } from "@/components/wizard/steps";
import type { Edit } from "@/components/wizard/wizard";
import { StepChoose } from "@/components/wizard/step-choose";
import { StepUnmetNeed } from "@/components/wizard/step-unmet-need";
import { StepTheories } from "@/components/wizard/step-theories";
import { StepFeatures } from "@/components/wizard/step-features";
import { StepReview } from "@/components/wizard/step-review";
import { DEFAULT_PHASE_ID, PHASES, type Phase } from "./phases";
import { Rolodex } from "./rolodex";
import { PlaceholderBoard } from "./placeholder-board";
import { UserNeedsBoard } from "./user-needs-board";
import { useUserNeeds } from "@/lib/user-needs";

/**
 * The wizard's four steps grouped into the two stages the canvas shows side
 * by side. Stage 1 builds the Clinical Mechanism of Action; Stage 2 derives
 * and releases the features.
 */
const STAGES: { title: string; steps: StepId[] }[] = [
  { title: "Stage 1 · Clinical Mechanism of Action", steps: ["unmet-need", "theories"] },
  { title: "Stage 2 · Feature Identification", steps: ["features", "review"] },
];

function readUrl() {
  if (typeof window === "undefined") return { phase: -1, moa: null as string | null, step: null as StepId | null, col: 0 };
  const q = new URLSearchParams(window.location.search);
  const step = q.get("step") as StepId | null;
  return {
    phase: PHASES.findIndex((p) => p.id === q.get("phase")),
    moa: q.get("moa"),
    step: STEPS.some((s) => s.id === step) ? step : null,
    col: Math.max(0, parseInt(q.get("col") ?? "0", 10) || 0),
  };
}

/**
 * Carousel → Wizard: the rolodex picks a phase, and the phase opens as a
 * guided flow instead of a tree. Feature Development runs the real wizard
 * steps; placeholder phases step through their whiteboard cards.
 */
export function CarouselWizardView() {
  const [state, setState] = useWorkflowStore();
  const [needs, setNeeds] = useUserNeeds();
  const [nav, setNav] = useState(() => {
    const u = readUrl();
    return {
      phase: u.phase === -1 ? PHASES.findIndex((p) => p.id === DEFAULT_PHASE_ID) : u.phase,
      moa: u.moa,
      step: (u.step ?? "unmet-need") as StepId,
      col: u.col,
    };
  });
  const [signOffReq, setSignOffReq] = useState<A.SignOffRequest | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reasonReq, setReasonReq] = useState<ReasonRequest | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const phase = PHASES[nav.phase];
  const isLive = phase.board.kind === "feature-development";
  const isNeeds = phase.board.kind === "user-needs";
  const moa = isLive && nav.moa ? state.mechanisms.find((m) => m.id === nav.moa) : undefined;
  const features = useMemo(() => (moa ? state.features.filter((f) => f.moaId === moa.id) : []), [state.features, moa]);

  const pageKey = isLive ? (moa ? `carousel-wizard:${phase.id}:${moa.id}:${nav.step}` : `carousel-wizard:${phase.id}:choose`) : `carousel-wizard:${phase.id}:${nav.col}`;

  // Shareable URL: /carousel-wizard?phase=…&moa=…&step=…  (or &col=… for placeholders)
  useEffect(() => {
    const q = new URLSearchParams();
    q.set("phase", phase.id);
    if (isLive && moa) {
      q.set("moa", moa.id);
      q.set("step", nav.step);
    } else if (!isLive && nav.col > 0) {
      q.set("col", String(nav.col));
    }
    window.history.replaceState(null, "", `?${q.toString()}`);
  }, [phase.id, isLive, moa, nav.step, nav.col]);

  const scrollTop = () => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  const selectPhase = (i: number) => {
    setNav((n) => ({ ...n, phase: i, col: 0, step: "unmet-need" }));
    scrollTop();
  };
  const goStep = (step: StepId) => {
    setNav((n) => ({ ...n, step }));
    scrollTop();
  };
  const pickMoa = (id: string | null, step: StepId = "unmet-need") => setNav((n) => ({ ...n, moa: id, step }));
  const createMoa = () => {
    const { state: next, id } = A.addMechanism(state);
    setState(next);
    pickMoa(id);
  };

  /* ---------- edits, sign-off, conflicts (as in the wizard) ---------- */

  const edit: Edit = (updater, summary) => {
    if (!moa) return;
    setState((s) => A.editMechanism(s, moa.id, updater));
    logEdit(moa.id, summary);
  };
  const confirmSignOff = (so: SignOff) => {
    if (signOffReq) setState((s) => A.applySignOff(s, signOffReq.cardId, so));
    setSignOffReq(null);
  };
  const toggleConflict = () => {
    if (!moa) return;
    const flagging = !moa.provenance.activeConflict;
    setReasonReq({
      title: flagging ? "Flag an active conflict" : "Resolve the active conflict",
      description: flagging
        ? "Describe the conflict. Approval is blocked until it is resolved."
        : `Currently flagged: "${moa.provenance.conflictReason ?? "no reason recorded"}". Describe how it was resolved.`,
      placeholder: flagging ? "e.g. Dimensional conflict with ISO 80369-7…" : "e.g. Geometry revised per ECO-118…",
      confirmLabel: flagging ? "Flag conflict" : "Mark resolved",
      destructive: flagging,
      onConfirm: (reason) => setState((s) => A.setConflict(s, moa.id, flagging, reason)),
    });
  };

  /* ---------- step state ---------- */

  const checks = useMemo(() => {
    const out = {} as Record<StepId, StepCheck>;
    for (const s of STEPS) out[s.id] = moa ? checkStep(s.id, moa, features) : { complete: false, errors: [], warnings: [] };
    return out;
  }, [moa, features]);
  const idx = STEPS.findIndex((s) => s.id === nav.step);
  const current = checks[nav.step];
  const isLast = idx === STEPS.length - 1;
  const featureCountByTheory = useMemo(() => {
    const out: Record<string, number> = {};
    for (const f of features) out[f.theoryId] = (out[f.theoryId] ?? 0) + 1;
    return out;
  }, [features]);

  return (
    <div className="flex h-screen flex-col bg-white text-neutral-900">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-neutral-200 bg-white px-5 py-3">
        <BrandMark />
        <SiteNav />
        <Separator orientation="vertical" className="h-8!" />
        <div className="flex items-center gap-2 whitespace-nowrap text-xs text-neutral-600">
          <span className="font-mono text-[11px] text-neutral-400">
            {String(nav.phase + 1).padStart(2, "0")}/{String(PHASES.length).padStart(2, "0")}
          </span>
          <span className="font-medium text-neutral-800">{phase.title}</span>
          {moa ? (
            <>
              <span className="inline-flex items-center gap-2 rounded border border-neutral-300 border-l-[3px] border-l-[#00224B] bg-neutral-100 px-2 py-0.5 font-semibold text-neutral-800">
                {A.moaTitle(state, moa.id)}
                <span className="font-mono text-[10px] font-normal text-neutral-500">{moa.provenance.cardRevision}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full border border-black/30" style={{ backgroundColor: STATUS_META[moa.status].color }} />
                {STATUS_META[moa.status].label}
              </span>
            </>
          ) : isLive ? (
            <Badge variant="outline">{state.mechanisms.length} mechanisms</Badge>
          ) : isNeeds ? (
            <Badge variant="outline">{needs.length} user needs</Badge>
          ) : (
            <Badge variant="outline" className="text-neutral-400">
              placeholder
            </Badge>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {moa && (
            <Button variant="ghost" size="sm" onClick={() => pickMoa(null)}>
              Switch mechanism
            </Button>
          )}
          <Separator orientation="vertical" className="h-8!" />
          <CommentToolbar pageKey={pageKey} />
          <HeaderUser />
        </div>
      </header>

      <div ref={scrollRef} className="relative flex-1 overflow-auto bg-[#f7f7f8]">
        <div ref={pageRef} className="relative flex min-h-full items-start">
          <CommentLayer pageKey={pageKey} containerRef={pageRef} />

          <aside className="sticky top-0 z-20 flex h-[calc(100vh-57px)] w-[380px] shrink-0 items-center justify-center border-r border-neutral-200/80 bg-[#f7f7f8]">
            <Rolodex phases={PHASES} selected={nav.phase} onSelect={selectPhase} />
          </aside>

          <section key={phase.id} className="relative z-10 min-w-0 flex-1 animate-in fade-in slide-in-from-left-6 duration-300" aria-label={`${phase.title} wizard`}>
            {isLive ? (
              <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-8 py-8">
                <PhaseHeading phase={phase} index={nav.phase} />
                <StageBar current={nav.step} checks={checks} enabled={!!moa} onSelect={goStep} />

                {!moa ? (
                  <div className="rounded-xl border border-neutral-200 bg-[#fbfbfc] p-6 shadow-sm">
                    <StepChoose state={state} onPick={(id) => pickMoa(id)} onCreate={createMoa} />
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border border-neutral-200 bg-[#fbfbfc] p-6 shadow-sm" data-anchor={`wizard-step-${nav.step}`}>
                      {nav.step === "unmet-need" && <StepUnmetNeed moa={moa} edit={edit} />}
                      {nav.step === "theories" && (
                        <StepTheories
                          moa={moa}
                          edit={edit}
                          featureCountByTheory={featureCountByTheory}
                          onRemoveTheory={(tid) => setState((s) => A.removeTheory(s, moa.id, tid))}
                        />
                      )}
                      {nav.step === "features" && <StepFeatures moa={moa} features={features} />}
                      {nav.step === "review" && (
                        <StepReview
                          moa={moa}
                          features={features}
                          title={A.moaTitle(state, moa.id)}
                          onRequestStatus={(to) => setSignOffReq(A.buildSignOffRequest(state, moa.id, to))}
                          onConflict={toggleConflict}
                          onHistory={() => setHistoryOpen(true)}
                        />
                      )}
                    </div>

                    {(current.errors.length > 0 || current.warnings.length > 0) && (
                      <ul className="flex flex-col gap-1 text-xs">
                        {current.errors.map((e) => (
                          <li key={e} className="flex items-center gap-1.5 text-red-700">
                            <CircleAlert className="size-3.5" /> {e}
                          </li>
                        ))}
                        {current.warnings.map((w) => (
                          <li key={w} className="flex items-center gap-1.5 text-amber-700">
                            <Info className="size-3.5" /> {w}
                          </li>
                        ))}
                      </ul>
                    )}

                    <StepFooter
                      index={idx}
                      total={STEPS.length}
                      backLabel="Back"
                      nextLabel={isLast ? "Done — back to mechanisms" : `Next: ${STEPS[idx + 1].title}`}
                      nextDisabled={!isLast && !current.complete}
                      onBack={() => goStep(STEPS[idx - 1].id)}
                      onNext={() => (isLast ? pickMoa(null) : goStep(STEPS[idx + 1].id))}
                    />
                  </>
                )}
              </div>
            ) : isNeeds ? (
              <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-8 py-8">
                <PhaseHeading phase={phase} index={nav.phase} />
                <div className="rounded-xl border border-neutral-200 bg-[#fbfbfc] p-6 shadow-sm">
                  <h3 className="text-xl font-semibold tracking-tight text-[#00224B]">What do users need that today&apos;s device does not deliver?</h3>
                  <p className="mt-1 text-sm text-neutral-600">
                    One card per need. Tag it Improve or Maintain; only Improve needs carry into Feature Development.
                  </p>
                  <div className="mt-6">
                    <UserNeedsBoard cards={needs} onChange={setNeeds} />
                  </div>
                </div>
              </div>
            ) : (
              <PlaceholderWizard phase={phase} index={nav.phase} col={nav.col} onCol={(c) => { setNav((n) => ({ ...n, col: c })); scrollTop(); }} />
            )}
          </section>
        </div>
      </div>

      <SignOffDialog request={signOffReq} onCancel={() => setSignOffReq(null)} onConfirm={confirmSignOff} />
      {moa && <HistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} title={A.moaTitle(state, moa.id)} history={moa.history} />}
      <ReasonDialog request={reasonReq} onClose={() => setReasonReq(null)} />
    </div>
  );
}

/* ---------- pieces ---------- */

function PhaseHeading({ phase, index }: { phase: Phase; index: number }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-[#08A9AD]">
        Phase {index + 1} of {PHASES.length}
      </div>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#00224B]">{phase.title}</h2>
      {phase.note && <p className="mt-1 text-[13px] text-neutral-600">{phase.note}</p>}
    </div>
  );
}

/** Horizontal rail: the four wizard steps grouped under their two stages. */
function StageBar({
  current,
  checks,
  enabled,
  onSelect,
}: {
  current: StepId;
  checks: Record<StepId, StepCheck>;
  enabled: boolean;
  onSelect: (id: StepId) => void;
}) {
  const currentIdx = STEPS.findIndex((s) => s.id === current);
  return (
    <ol className="flex flex-wrap items-stretch gap-3">
      {STAGES.map((stage, si) => {
        const stageActive = enabled && stage.steps.includes(current);
        return (
          <li
            key={stage.title}
            className={cn(
              "flex min-w-0 flex-1 flex-col gap-2 rounded-lg border p-3 transition",
              stageActive ? "border-[#08A9AD]/60 bg-white shadow-sm" : "border-neutral-200 bg-white/60"
            )}
          >
            <div className={cn("text-[11px] font-semibold uppercase tracking-wider", stageActive ? "text-[#08A9AD]" : "text-neutral-500")}>
              {stage.title}
            </div>
            <ol className="flex gap-2">
              {stage.steps.map((id) => {
                const i = STEPS.findIndex((s) => s.id === id);
                const s = STEPS[i];
                const chk = checks[id];
                const active = enabled && id === current;
                const reachable = enabled && STEPS.slice(0, i).every((p) => checks[p.id].complete);
                const done = enabled && chk.complete && i < currentIdx;
                return (
                  <li key={id} className="min-w-0 flex-1">
                    <button
                      type="button"
                      disabled={!reachable && !active}
                      onClick={() => onSelect(id)}
                      aria-current={active ? "step" : undefined}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left transition",
                        active ? "bg-[#00224B]/5 ring-1 ring-[#00224B]/20" : "hover:bg-neutral-100",
                        !reachable && !active && "cursor-not-allowed opacity-50"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-[10px] font-semibold",
                          done ? "border-[#08A9AD] bg-[#08A9AD] text-white" : active ? "border-[#00224B] bg-[#00224B] text-white" : "border-neutral-300 bg-white text-neutral-500"
                        )}
                      >
                        {done ? <Check className="size-3" /> : i + 1}
                      </span>
                      <span className="min-w-0">
                        <span className={cn("block truncate text-[13px] font-medium", active ? "text-[#00224B]" : "text-neutral-800")}>{s.title}</span>
                        <span className="block truncate text-[11px] text-neutral-500">{s.subtitle}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            {si < STAGES.length - 1 && <span className="sr-only">then</span>}
          </li>
        );
      })}
    </ol>
  );
}

function StepFooter({
  index,
  total,
  backLabel,
  nextLabel,
  nextDisabled,
  onBack,
  onNext,
}: {
  index: number;
  total: number;
  backLabel: string;
  nextLabel: string;
  nextDisabled?: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-t border-neutral-200 pt-4">
      <Button variant="outline" disabled={index === 0} onClick={onBack}>
        <ArrowLeft className="size-4" />
        {backLabel}
      </Button>
      <span className="text-xs text-neutral-500">
        Step {index + 1} of {total}
      </span>
      <Button className="bg-[#00224B] hover:bg-[#00224B]/90" disabled={nextDisabled} onClick={onNext}>
        {nextLabel}
        <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}

/** Placeholder phases step through their whiteboard columns one at a time. */
function PlaceholderWizard({ phase, index, col, onCol }: { phase: Phase; index: number; col: number; onCol: (c: number) => void }) {
  if (phase.board.kind !== "placeholder") return null;
  const cols = phase.board.columns;
  const safe = Math.min(col, cols.length - 1);
  const stepPhase: Phase = { ...phase, board: { kind: "placeholder", columns: [cols[safe]] } };
  const stepTitle = (i: number) => cols[i].cards[0]?.title ?? `Step ${i + 1}`;
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-8 py-8">
      <PhaseHeading phase={phase} index={index} />
      <ol className="flex flex-wrap gap-2">
        {cols.map((_, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => onCol(i)}
              aria-current={i === safe ? "step" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[13px] transition",
                i === safe ? "border-[#00224B]/20 bg-white text-[#00224B] shadow-sm" : "border-neutral-200 bg-white/60 text-neutral-600 hover:bg-white"
              )}
            >
              <span className={cn("grid size-5 place-items-center rounded-full border text-[10px] font-semibold", i === safe ? "border-[#00224B] bg-[#00224B] text-white" : i < safe ? "border-[#08A9AD] bg-[#08A9AD] text-white" : "border-neutral-300 bg-white text-neutral-500")}>
                {i < safe ? <Check className="size-3" /> : i + 1}
              </span>
              {stepTitle(i)}
            </button>
          </li>
        ))}
      </ol>
      <div className="rounded-xl border border-neutral-200 bg-[#fbfbfc] p-6 shadow-sm">
        <h3 className="text-xl font-semibold tracking-tight text-[#00224B]">{stepTitle(safe)}</h3>
        <p className="mt-1 text-sm text-neutral-600">This step is a placeholder; its cards mirror the whiteboard and are not editable in the demo.</p>
        <div className="mt-6">
          <PlaceholderBoard phase={stepPhase} />
        </div>
      </div>
      <StepFooter
        index={safe}
        total={cols.length}
        backLabel="Back"
        nextLabel={safe === cols.length - 1 ? "Done" : `Next: ${stepTitle(safe + 1)}`}
        nextDisabled={safe === cols.length - 1}
        onBack={() => onCol(safe - 1)}
        onNext={() => onCol(safe + 1)}
      />
    </div>
  );
}

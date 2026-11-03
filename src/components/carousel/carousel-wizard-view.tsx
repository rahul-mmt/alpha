"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useWorkflowStore } from "@/lib/store";
import { AUTHOR, clearTraining, setPersona } from "@/lib/level";
import { EMPTY, SEED } from "@/lib/seed";
import { seedUserNeeds, useUserNeeds } from "@/lib/user-needs";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SiteNav } from "@/components/site-nav";
import { HeaderUser } from "@/components/header-user";
import { CommentLayer } from "@/components/comments/comment-layer";
import { CommentToolbar } from "@/components/comments/comment-toolbar";
import { BrandMark } from "@/components/workflow/brand-mark";
import { LevelWorkflow } from "@/components/level/level-workflow";
import { DEFAULT_PHASE_ID, PHASES, type Phase } from "./phases";
import { Rolodex } from "./rolodex";
import { PlaceholderBoard } from "./placeholder-board";
import { UserNeedsBoard } from "./user-needs-board";

function readUrl() {
  if (typeof window === "undefined") return { phase: -1, card: null as string | null, col: 0 };
  const q = new URLSearchParams(window.location.search);
  return {
    phase: PHASES.findIndex((p) => p.id === q.get("phase")),
    card: q.get("card"),
    col: Math.max(0, parseInt(q.get("col") ?? "0", 10) || 0),
  };
}

/**
 * Carousel → guided level: the rolodex picks a phase and the phase opens as a
 * guided flow. Feature Development runs the full level workflow (ribbon of
 * cards, instructions and training gates, author → stakeholder review).
 * User Needs is an editable board; placeholder phases step through their cards.
 */
export function CarouselWizardView() {
  const [state, setState] = useWorkflowStore();
  const [needs, setNeeds] = useUserNeeds();
  const [nav, setNav] = useState(() => {
    const u = readUrl();
    return { phase: u.phase === -1 ? PHASES.findIndex((p) => p.id === DEFAULT_PHASE_ID) : u.phase, card: u.card, col: u.col };
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const phase = PHASES[nav.phase];
  const isLive = phase.board.kind === "feature-development";
  const isNeeds = phase.board.kind === "user-needs";
  const pageKey = isLive ? `carousel-wizard:${phase.id}:${nav.card ?? "first"}` : `carousel-wizard:${phase.id}:${nav.col}`;

  // Shareable URL: ?phase=…&card=…  (or &col=… for placeholders)
  useEffect(() => {
    const q = new URLSearchParams();
    q.set("phase", phase.id);
    if (isLive && nav.card) q.set("card", nav.card);
    else if (!isLive && !isNeeds && nav.col > 0) q.set("col", String(nav.col));
    window.history.replaceState(null, "", `?${q.toString()}`);
  }, [phase.id, isLive, isNeeds, nav.card, nav.col]);

  const scrollTop = () => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  const selectPhase = (i: number) => {
    setNav((n) => ({ ...n, phase: i, col: 0 }));
    scrollTop();
  };
  const startOver = (blank: boolean) => {
    setState(blank ? EMPTY : SEED);
    setNeeds(blank ? [] : seedUserNeeds());
    if (blank) clearTraining();
    setPersona(AUTHOR.name);
    setNav((n) => ({ ...n, card: null }));
  };
  const goToNeeds = () => selectPhase(PHASES.findIndex((p) => p.board.kind === "user-needs"));
  const activateCard = useCallback((id: string) => {
    setNav((n) => (n.card === id ? n : { ...n, card: id }));
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

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
          {isLive ? (
            <>
              <Badge variant="outline">{state.mechanisms.length} mechanisms</Badge>
              <Badge variant="outline">{state.features.length} features</Badge>
              <Badge variant="outline">{Object.values(state.reviews ?? {}).filter((r) => r?.state === "finalized").length} finalized</Badge>
            </>
          ) : isNeeds ? (
            <Badge variant="outline">{needs.length} user needs</Badge>
          ) : (
            <Badge variant="outline" className="text-neutral-400">
              placeholder
            </Badge>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Separator orientation="vertical" className="h-8!" />
          <CommentToolbar pageKey={pageKey} />
          <HeaderUser />
        </div>
      </header>

      <div ref={scrollRef} className="relative flex-1 overflow-auto bg-[#f7f7f8]">
        <div ref={pageRef} className="relative flex min-h-full items-start">
          <CommentLayer pageKey={pageKey} containerRef={pageRef} />

          {/* The rolodex shrinks when a level is open, to give the cards the room. */}
          <aside
            className={cn(
              "sticky top-0 z-20 flex h-[calc(100vh-57px)] shrink-0 items-center justify-center border-r border-neutral-200/80 bg-[#f7f7f8] transition-[width] duration-300",
              isLive ? "w-[260px]" : "w-[380px]"
            )}
          >
            <Rolodex phases={PHASES} selected={nav.phase} onSelect={selectPhase} compact={isLive} />
          </aside>

          <section key={phase.id} className="relative z-10 min-w-0 flex-1 animate-in fade-in slide-in-from-left-6 duration-300" aria-label={`${phase.title} wizard`}>
            {isLive ? (
              <LevelWorkflow
                state={state}
                setState={setState}
                needs={needs}
                activeId={nav.card}
                onActivate={activateCard}
                onStartBlank={() => startOver(true)}
                onLoadExample={() => startOver(false)}
                onGoToNeeds={goToNeeds}
              />
            ) : isNeeds ? (
              <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-8 py-8">
                <PhaseHeading phase={phase} index={nav.phase} />
                <div className="rounded-xl border border-neutral-200 bg-[#fbfbfc] p-6 shadow-sm">
                  <h3 className="text-xl font-semibold tracking-tight text-[#00224B]">What do users need that today&apos;s device does not deliver?</h3>
                  <p className="mt-1 text-sm text-neutral-600">
                    One card per need. Tag it Improve or Maintain; only Improve needs carry into Feature Development, where each becomes a Clinical Mechanism of Action card.
                  </p>
                  <div className="mt-6">
                    <UserNeedsBoard cards={needs} onChange={setNeeds} />
                  </div>
                </div>
              </div>
            ) : (
              <PlaceholderWizard
                phase={phase}
                index={nav.phase}
                col={nav.col}
                onCol={(c) => {
                  setNav((n) => ({ ...n, col: c }));
                  scrollTop();
                }}
              />
            )}
          </section>
        </div>
      </div>
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
              <span
                className={cn(
                  "grid size-5 place-items-center rounded-full border text-[10px] font-semibold",
                  i === safe ? "border-[#00224B] bg-[#00224B] text-white" : i < safe ? "border-[#08A9AD] bg-[#08A9AD] text-white" : "border-neutral-300 bg-white text-neutral-500"
                )}
              >
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
      <div className="flex items-center justify-between border-t border-neutral-200 pt-4">
        <Button variant="outline" disabled={safe === 0} onClick={() => onCol(safe - 1)}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <span className="text-xs text-neutral-500">
          Step {safe + 1} of {cols.length}
        </span>
        <Button className="bg-[#00224B] hover:bg-[#00224B]/90" disabled={safe === cols.length - 1} onClick={() => onCol(safe + 1)}>
          {safe === cols.length - 1 ? "Done" : `Next: ${stepTitle(safe + 1)}`}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CircleAlert, Info, LayoutDashboard } from "lucide-react";
import * as A from "@/lib/actions";
import { logEdit, useWorkflowStore } from "@/lib/store";
import { STATUS_META, type MechanismOfAction, type SignOff } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SiteNav } from "@/components/site-nav";
import { HeaderUser } from "@/components/header-user";
import { CommentLayer } from "@/components/comments/comment-layer";
import { CommentToolbar } from "@/components/comments/comment-toolbar";
import { BrandMark } from "@/components/workflow/brand-mark";
import { SignOffDialog } from "@/components/workflow/sign-off-dialog";
import { HistoryDialog } from "@/components/workflow/history-dialog";
import { ReasonDialog, type ReasonRequest } from "@/components/workflow/reason-dialog";
import { STEPS, checkStep, type StepCheck, type StepId } from "./steps";
import { StepRail } from "./step-rail";
import { StepChoose } from "./step-choose";
import { StepUnmetNeed } from "./step-unmet-need";
import { StepTheories } from "./step-theories";
import { StepFeatures } from "./step-features";
import { StepReview } from "./step-review";

export type Edit = (updater: (m: MechanismOfAction) => MechanismOfAction, summary: string) => void;

function readUrl(): { moa: string | null; step: StepId | null } {
  if (typeof window === "undefined") return { moa: null, step: null };
  const q = new URLSearchParams(window.location.search);
  const step = q.get("step") as StepId | null;
  return { moa: q.get("moa"), step: STEPS.some((s) => s.id === step) ? step : null };
}

export function Wizard() {
  const [state, setState] = useWorkflowStore();
  const [{ moa: moaId, step }, setNav] = useState<{ moa: string | null; step: StepId }>(() => {
    const u = readUrl();
    return { moa: u.moa, step: u.step ?? "unmet-need" };
  });
  const [signOffReq, setSignOffReq] = useState<A.SignOffRequest | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reasonReq, setReasonReq] = useState<ReasonRequest | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const moa = moaId ? state.mechanisms.find((m) => m.id === moaId) : undefined;
  const features = useMemo(() => (moa ? state.features.filter((f) => f.moaId === moa.id) : []), [state.features, moa]);

  // Keep the URL shareable: /wizard?moa=…&step=…
  useEffect(() => {
    const q = new URLSearchParams();
    if (moa) {
      q.set("moa", moa.id);
      q.set("step", step);
    }
    const qs = q.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [moa, step]);

  const edit: Edit = (updater, summary) => {
    if (!moa) return;
    setState((s) => A.editMechanism(s, moa.id, updater));
    logEdit(moa.id, summary);
  };

  const go = (id: string, s: StepId = "unmet-need") => setNav({ moa: id, step: s });
  const create = () => {
    const { state: next, id } = A.addMechanism(state);
    setState(next);
    go(id);
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

  const confirmSignOff = (so: SignOff) => {
    if (signOffReq) setState((s) => A.applySignOff(s, signOffReq.cardId, so));
    setSignOffReq(null);
  };

  /* ---------- step state ---------- */

  const checks = useMemo(() => {
    const out = {} as Record<StepId, StepCheck>;
    for (const s of STEPS) out[s.id] = moa ? checkStep(s.id, moa, features) : { complete: false, errors: [], warnings: [] };
    return out;
  }, [moa, features]);

  const idx = STEPS.findIndex((s) => s.id === step);
  const current = checks[step];
  const isLast = idx === STEPS.length - 1;
  const featureCountByTheory = useMemo(() => {
    const out: Record<string, number> = {};
    for (const f of features) out[f.theoryId] = (out[f.theoryId] ?? 0) + 1;
    return out;
  }, [features]);

  const pageKey = moa ? `wizard:${moa.id}:${step}` : "wizard:choose";

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f7f8] text-neutral-900">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-neutral-200 bg-white px-5 py-3">
        <BrandMark />
        <SiteNav />
        {moa && (
          <>
            <Separator orientation="vertical" className="h-8!" />
            <div className="flex items-center gap-2 text-xs text-neutral-600">
              <span className="inline-flex items-center gap-2 rounded border border-neutral-300 border-l-[3px] border-l-[#00224B] bg-neutral-100 px-2 py-0.5 font-semibold text-neutral-800">
                {A.moaTitle(state, moa.id)}
                <span className="font-mono text-[10px] font-normal text-neutral-500">{moa.provenance.cardRevision}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full border border-black/30" style={{ backgroundColor: STATUS_META[moa.status].color }} />
                {STATUS_META[moa.status].label}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setNav({ moa: null, step: "unmet-need" })}>
                Switch mechanism
              </Button>
              <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/" />}>
                <LayoutDashboard className="size-3.5" />
                Open on canvas
              </Button>
            </div>
          </>
        )}
        <div className={moa ? "flex items-center gap-2" : "ml-auto flex items-center gap-2"}>
          <Separator orientation="vertical" className="h-8!" />
          <CommentToolbar pageKey={pageKey} />
          <HeaderUser />
        </div>
      </header>

      <div ref={pageRef} className="relative flex flex-1 flex-col">
        <CommentLayer pageKey={pageKey} containerRef={pageRef} />

      {!moa ? (
        <main className="flex-1 px-6 py-10">
          <StepChoose state={state} onPick={(id) => go(id)} onCreate={create} />
        </main>
      ) : (
        <main className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-6 py-8 md:grid-cols-[240px_1fr]">
          <aside className="md:sticky md:top-8 md:self-start">
            <StepRail current={step} checks={checks} onSelect={(id) => setNav({ moa: moa.id, step: id })} />
            <p className="mt-4 px-3 text-[11px] leading-snug text-neutral-500">
              Steps unlock as earlier ones are complete. Everything saves as you type and is visible on the canvas.
            </p>
          </aside>

          <section className="flex min-w-0 flex-col gap-6">
            <div className="rounded-xl border border-neutral-200 bg-[#fbfbfc] p-6 shadow-sm" data-anchor={`wizard-step-${step}`}>
              {step === "unmet-need" && <StepUnmetNeed moa={moa} edit={edit} />}
              {step === "theories" && (
                <StepTheories
                  moa={moa}
                  edit={edit}
                  featureCountByTheory={featureCountByTheory}
                  onRemoveTheory={(tid) => setState((s) => A.removeTheory(s, moa.id, tid))}
                />
              )}
              {step === "features" && <StepFeatures moa={moa} features={features} />}
              {step === "review" && (
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

            <div className="flex items-center justify-between border-t border-neutral-200 pt-4">
              <Button
                variant="outline"
                disabled={idx === 0}
                onClick={() => setNav({ moa: moa.id, step: STEPS[idx - 1].id })}
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>
              <span className="text-xs text-neutral-500">
                Step {idx + 1} of {STEPS.length}
              </span>
              {isLast ? (
                <Button className="bg-[#00224B] hover:bg-[#00224B]/90" onClick={() => setNav({ moa: null, step: "unmet-need" })}>
                  Done — back to mechanisms
                </Button>
              ) : (
                <Button
                  className="bg-[#00224B] hover:bg-[#00224B]/90"
                  disabled={!current.complete}
                  onClick={() => setNav({ moa: moa.id, step: STEPS[idx + 1].id })}
                >
                  Next: {STEPS[idx + 1].title}
                  <ArrowRight className="size-4" />
                </Button>
              )}
            </div>
          </section>
        </main>
      )}
      </div>

      <SignOffDialog request={signOffReq} onCancel={() => setSignOffReq(null)} onConfirm={confirmSignOff} />
      {moa && (
        <HistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} title={A.moaTitle(state, moa.id)} history={moa.history} />
      )}
      <ReasonDialog request={reasonReq} onClose={() => setReasonReq(null)} />
    </div>
  );
}

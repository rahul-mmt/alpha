"use client";

import { useState } from "react";
import { Bell, Check, CheckCircle2, Clock, Lock, MessageSquare, PenLine, RotateCcw, Send } from "lucide-react";
import type { Stakeholder } from "@/lib/level";
import { allReconciled, feedbackForRound } from "@/lib/level-review";
import type { CardReview } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { STATE_META } from "./card-ribbon";

function when(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * Lifecycle controls under the card: author approval, stakeholder
 * notifications / feedback / approvals, reconciliation, and the finalized
 * record. What is shown depends on the card state and who is acting.
 */
export function ReviewPanel({
  review,
  persona,
  isAuthor,
  stakeholders,
  draftComplete,
  onAuthorApprove,
  onStakeholderApprove,
  onAddFeedback,
  onReconcile,
  onReset,
}: {
  review: CardReview;
  persona: Stakeholder;
  isAuthor: boolean;
  stakeholders: Stakeholder[];
  /** Author-side completeness: false disables approval with the reason. */
  draftComplete: { ok: boolean; reason?: string };
  onAuthorApprove: () => void;
  onStakeholderApprove: () => void;
  onAddFeedback: (kind: "edit" | "comment", text: string) => void;
  onReconcile: (feedbackId: string, resolution: string) => void;
  onReset: () => void;
}) {
  const r = review;
  const meta = STATE_META[r.state];
  const roundFb = feedbackForRound(r);
  const approvedCount = stakeholders.filter((s) => r.stakeholderApprovals[s.name]).length;
  const myApproval = r.stakeholderApprovals[persona.name];
  const isStakeholder = stakeholders.some((s) => s.name === persona.name);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      {/* status line */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-semibold", meta.chip)}>
          {r.state === "finalized" ? <Lock className="size-3" /> : <span className={cn("size-2 rounded-full", meta.dot)} />}
          {meta.label}
          {r.round > 0 && r.state !== "finalized" && <span className="font-normal">· round {r.round}</span>}
        </span>
        {r.authorApprovals.map((a) => (
          <span key={a.round} className="inline-flex items-center gap-1 text-[11px] text-neutral-600">
            <PenLine className="size-3 text-[#00224B]" />
            Author approved r{a.round}: {a.by} · {when(a.at)}
          </span>
        ))}
        <button type="button" onClick={onReset} className="ml-auto inline-flex items-center gap-1 text-[10px] text-neutral-400 hover:text-neutral-700" title="Demo: clear this card's review record">
          <RotateCcw className="size-3" /> reset review
        </button>
      </div>

      {/* finalized record */}
      {r.state === "finalized" && (
        <div className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-900">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="size-4" />
            Finalized {r.finalRevision && `at ${r.finalRevision}`} · {r.finalizedAt && when(r.finalizedAt)}
          </div>
          <div className="mt-1 text-xs">
            Round {r.round} · approved by {stakeholders.map((s) => s.name).join(", ")}
          </div>
        </div>
      )}

      {/* drafting */}
      {r.state === "drafting" && (
        <div className="flex flex-wrap items-center gap-3">
          {isAuthor && (
            <Button
              className="ml-auto bg-[#00224B] hover:bg-[#00224B]/90"
              disabled={!draftComplete.ok}
              title={draftComplete.reason}
              onClick={onAuthorApprove}
            >
              <Send className="size-4" />
              Approve draft &amp; route for review
            </Button>
          )}
          {isAuthor && !draftComplete.ok && draftComplete.reason && <span className="basis-full text-xs text-amber-700">{draftComplete.reason}</span>}
        </div>
      )}

      {/* review / reconcile: stakeholder table */}
      {(r.state === "review" || r.state === "reconcile") && (
        <>
          {r.notifications.filter((n) => n.round === r.round).map((n) => (
            <div key={n.round} className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <Bell className="size-3.5" />
              Round {n.round} · notification sent {when(n.at)} to {n.to.join(", ")}
            </div>
          ))}

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                <th className="py-1">Stakeholder</th>
                <th className="py-1">Role</th>
                <th className="py-1">Round {r.round}</th>
                <th className="py-1">Feedback</th>
              </tr>
            </thead>
            <tbody>
              {stakeholders.map((s) => {
                const a = r.stakeholderApprovals[s.name];
                const fb = roundFb.filter((f) => f.by === s.name);
                return (
                  <tr key={s.name} className={cn("border-t border-neutral-100", s.name === persona.name && "bg-[#08A9AD]/5")}>
                    <td className="py-1.5 font-medium">{s.name}{s.name === persona.name && <span className="ml-1 text-[10px] text-[#08A9AD]">(you)</span>}</td>
                    <td className="py-1.5 text-neutral-600">{s.role}</td>
                    <td className="py-1.5">
                      {a ? (
                        <span className="inline-flex items-center gap-1 text-green-800"><Check className="size-3.5" /> Approved {when(a.at)}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-neutral-500"><Clock className="size-3.5" /> Pending</span>
                      )}
                    </td>
                    <td className="py-1.5 text-neutral-600">{fb.length === 0 ? <span className="text-neutral-400">none</span> : `${fb.length} item${fb.length === 1 ? "" : "s"}`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {roundFb.length > 0 && (
            <ul className="flex flex-col gap-2">
              {roundFb.map((f) => (
                <li key={f.id} className={cn("rounded-md border p-3 text-sm", f.reconciled ? "border-green-200 bg-green-50/60" : "border-neutral-200 bg-neutral-50")}>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                    {f.kind === "edit" ? <PenLine className="size-3" /> : <MessageSquare className="size-3" />}
                    <span className="font-semibold text-neutral-700">{f.kind === "edit" ? "Suggested edit" : "Comment"}</span>
                    · {f.by} ({f.role}) · {when(f.at)}
                    {f.reconciled && <span className="ml-auto inline-flex items-center gap-1 text-green-700"><Check className="size-3" /> reconciled</span>}
                  </div>
                  <div className="mt-1 text-neutral-800">{f.text}</div>
                  {f.reconciled && f.resolution && <div className="mt-1 text-xs text-green-900">Author: {f.resolution}</div>}
                  {r.state === "reconcile" && isAuthor && !f.reconciled && <ReconcileRow onDone={(res) => onReconcile(f.id, res)} />}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* review: stakeholder actions */}
      {r.state === "review" && (
        <div className="flex flex-col gap-3 border-t border-neutral-200 pt-3">
          {isStakeholder && !myApproval && (
            <FeedbackComposer onAdd={onAddFeedback} />
          )}
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-neutral-600">
              {approvedCount} of {stakeholders.length} approved
            </p>
            {isStakeholder && !myApproval && (
              <Button className="ml-auto bg-[#00224B] hover:bg-[#00224B]/90" onClick={onStakeholderApprove}>
                <Check className="size-4" />
                Approve round {r.round}
              </Button>
            )}
            {isStakeholder && myApproval && <span className="ml-auto text-xs text-green-800">You approved this round {when(myApproval.at)}.</span>}
            {isAuthor && <span className="ml-auto text-xs text-neutral-500">Waiting for stakeholders</span>}
          </div>
        </div>
      )}

      {/* reconcile: author re-approval */}
      {r.state === "reconcile" && (
        <div className="flex flex-wrap items-center gap-3 border-t border-neutral-200 pt-3">
          {!isAuthor && <p className="text-sm text-neutral-600">With author · reconciling round {r.round}</p>}
          {isAuthor && (
            <Button className="ml-auto bg-[#00224B] hover:bg-[#00224B]/90" disabled={!allReconciled(r)} title={!allReconciled(r) ? "Reconcile every item first" : undefined} onClick={onAuthorApprove}>
              <Send className="size-4" />
              Approve reconciled draft &amp; route round {r.round + 1}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function FeedbackComposer({ onAdd }: { onAdd: (kind: "edit" | "comment", text: string) => void }) {
  const [kind, setKind] = useState<"edit" | "comment">("comment");
  const [text, setText] = useState("");
  return (
    <div className="flex flex-col gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-3">
      <div className="flex items-center gap-2 text-xs">
        <span className="font-semibold text-neutral-700">Feedback</span>
        {(["comment", "edit"] as const).map((k) => (
          <button key={k} type="button" onClick={() => setKind(k)} className={cn("rounded border px-2 py-0.5 font-medium", kind === k ? "border-[#00224B] bg-white text-[#00224B]" : "border-neutral-200 text-neutral-500")}>
            {k === "edit" ? "Suggested edit" : "Comment"}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder={kind === "edit" ? "What should change, and to what" : "Question or observation"} className="text-sm" />
        <Button
          variant="outline"
          size="sm"
          className="self-end"
          disabled={!text.trim()}
          onClick={() => {
            onAdd(kind, text.trim());
            setText("");
          }}
        >
          Add
        </Button>
      </div>
    </div>
  );
}

function ReconcileRow({ onDone }: { onDone: (resolution: string) => void }) {
  const [res, setRes] = useState("");
  return (
    <div className="mt-2 flex gap-2">
      <Textarea rows={1} value={res} onChange={(e) => setRes(e.target.value)} placeholder="How this was reconciled (edit made, or why not)" className="text-xs" />
      <Button variant="outline" size="sm" className="self-end" disabled={!res.trim()} onClick={() => onDone(res.trim())}>
        <Check className="size-3.5" /> Reconciled
      </Button>
    </div>
  );
}

"use client";

import { useState } from "react";
import { BookOpen, CheckCircle2, CircleAlert, FileText, GraduationCap } from "lucide-react";
import { CARD_INSTRUCTIONS, CONTEXT, LEVEL, type CardType, type TrainingRecord } from "@/lib/level";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * Level instructions (SOP): definition, input / output, the card sequence
 * (each card name opens its own instructions) and how-to guidelines. The
 * review-and-approve block at the bottom records the reader's training to
 * this revision, signed with their credentials.
 */
export function LevelInstructionsDialog({
  open,
  onOpenChange,
  persona,
  training,
  onOpenCard,
  onSignTraining,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  persona: string;
  training: TrainingRecord | undefined;
  onOpenCard: (t: CardType) => void;
  onSignTraining: (afterSigned: () => void) => void;
}) {
  const [ack, setAck] = useState(false);
  const trained = training?.revision === LEVEL.revision;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-[760px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#08A9AD]">
            <BookOpen className="size-3.5" /> Level instructions · {LEVEL.id} rev {LEVEL.revision} · effective {LEVEL.effectiveDate}
          </div>
          <DialogTitle className="text-2xl text-[#00224B]">{LEVEL.title}</DialogTitle>
          <DialogDescription>{LEVEL.definition}</DialogDescription>
        </DialogHeader>

        <details className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm">
          <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Programme context · initiative, epic, user story</summary>
          <dl className="mt-2 grid gap-2 text-sm">
            <div><dt className="font-semibold text-neutral-800">Initiative</dt><dd className="text-neutral-600">{CONTEXT.initiative}</dd></div>
            <div><dt className="font-semibold text-neutral-800">Epic</dt><dd className="text-neutral-600">{CONTEXT.epic}</dd></div>
            <div><dt className="font-semibold text-neutral-800">User story</dt><dd className="text-neutral-600">{CONTEXT.userStory}</dd></div>
          </dl>
        </details>

        <div className="grid gap-4 sm:grid-cols-2">
          <Block title="Input to this level">{LEVEL.input}</Block>
          <Block title="Output of this level">{LEVEL.output}</Block>
        </div>

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Sequence · click a card for its instructions</h3>
          <ol className="mt-2 flex flex-col gap-2">
            {LEVEL.sequence.map((s, i) => (
              <li key={s.cardType}>
                <button
                  type="button"
                  onClick={() => onOpenCard(s.cardType)}
                  className="flex w-full items-start gap-3 rounded-md border border-neutral-200 bg-white px-3 py-2.5 text-left transition hover:border-[#08A9AD] hover:bg-[#08A9AD]/5"
                >
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[#00224B] text-[11px] font-semibold text-white">{i + 1}</span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-[#00224B]">
                      <FileText className="size-3.5" />
                      {s.label}
                      <span className="font-mono text-[10px] font-normal text-neutral-400">rev {CARD_INSTRUCTIONS[s.cardType].revision}</span>
                    </span>
                    <span className="block text-xs text-neutral-600">{s.summary}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">How-to guidelines</h3>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-neutral-700">
            {LEVEL.guidelines.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ol>
        </section>

        <TrainingBlock
          persona={persona}
          training={training}
          required={LEVEL.revision}
          what={`the Feature Development level instructions rev ${LEVEL.revision}, including the card sequence and the how-to guidelines above`}
          scope="this level"
          ack={ack}
          onAck={setAck}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {!trained && (
            <Button
              disabled={!ack}
              className="bg-[#00224B] hover:bg-[#00224B]/90"
              onClick={() =>
                onSignTraining(() => {
                  setAck(false);
                })
              }
            >
              <GraduationCap className="size-4" />
              Review &amp; approve · sign training
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Training-matrix block: shows the record, or the acknowledgement needed before signing. */
function TrainingBlock({
  persona,
  training,
  required,
  what,
  scope,
  ack,
  onAck,
}: {
  persona: string;
  training: TrainingRecord | undefined;
  required: string;
  what: string;
  scope: string;
  ack: boolean;
  onAck: (v: boolean) => void;
}) {
  const trained = training?.revision === required;
  return (
    <section className={trained ? "rounded-lg border border-green-200 bg-green-50 p-4" : "rounded-lg border border-amber-200 bg-amber-50 p-4"}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <GraduationCap className="size-4" />
        Training record · {persona}
      </div>
      {trained ? (
        <p className="mt-1 flex items-center gap-1.5 text-sm text-green-900">
          <CheckCircle2 className="size-4" />
          Trained to rev {training!.revision} on {new Date(training!.at).toLocaleString()} · signed by user {training!.userId}
        </p>
      ) : (
        <>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-amber-900">
            <CircleAlert className="size-4" />
            {training ? `Trained to rev ${training.revision}; ${scope} is at rev ${required}.` : `No training on record for ${scope}.`} Data entry is blocked until you review and
            approve this revision.
          </p>
          <label className="mt-3 flex items-start gap-2 text-sm text-neutral-800">
            <Checkbox checked={ack} onCheckedChange={(c) => onAck(c === true)} className="mt-0.5" />
            <span>I have read and understood {what}.</span>
          </label>
        </>
      )}
    </section>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{title}</div>
      <p className="mt-1 text-sm leading-relaxed text-neutral-700">{children}</p>
    </div>
  );
}

/** Instructions / definitions for one card type, with its own training record. */
export function CardInstructionsDialog({
  cardType,
  onClose,
  persona,
  training,
  onSignTraining,
}: {
  cardType: CardType | null;
  onClose: () => void;
  persona: string;
  training: TrainingRecord | undefined;
  onSignTraining: (afterSigned: () => void) => void;
}) {
  const c = cardType ? CARD_INSTRUCTIONS[cardType] : null;
  const [ack, setAck] = useState(false);
  const trained = !!c && training?.revision === c.revision;
  return (
    <Dialog open={!!c} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        {c && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#08A9AD]">
                <FileText className="size-3.5" /> Card instructions · {c.id} rev {c.revision}
              </div>
              <DialogTitle className="text-xl text-[#00224B]">{c.title}</DialogTitle>
              <DialogDescription>{c.definition}</DialogDescription>
            </DialogHeader>
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Fields</h3>
              <dl className="mt-2 divide-y divide-neutral-200 rounded-md border border-neutral-200">
                {c.fields.map((f) => (
                  <div key={f.name} className="grid gap-1 px-3 py-2 sm:grid-cols-[170px_1fr]">
                    <dt className="text-sm font-semibold text-neutral-800">{f.name}</dt>
                    <dd className="text-sm text-neutral-600">{f.definition}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Complete when</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-700">
                {c.completion.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </section>
            <TrainingBlock
              persona={persona}
              training={training}
              required={c.revision}
              what={`the ${c.title} card instructions ${c.id} rev ${c.revision}`}
              scope="this card"
              ack={ack}
              onAck={setAck}
            />
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              {!trained && (
                <Button disabled={!ack} className="bg-[#00224B] hover:bg-[#00224B]/90" onClick={() => onSignTraining(() => setAck(false))}>
                  <GraduationCap className="size-4" />
                  Review &amp; approve · sign training
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

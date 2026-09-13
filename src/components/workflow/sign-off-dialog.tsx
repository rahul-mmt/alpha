"use client";

import { useState } from "react";
import { AlertTriangle, ArrowRight, ShieldCheck } from "lucide-react";
import {
  REVIEWER_ROLES,
  STATUS_META,
  type ReviewerRole,
  type SignOff,
  type Status,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type { SignOffRequest } from "@/lib/actions";
import type { SignOffRequest } from "@/lib/actions";

function Dot({ s }: { s: Status }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium">
      <span
        className="size-3 rounded-full border border-black/30"
        style={{ backgroundColor: STATUS_META[s].color }}
      />
      {STATUS_META[s].label}
    </span>
  );
}

export function SignOffDialog({
  request,
  onCancel,
  onConfirm,
}: {
  request: SignOffRequest | null;
  onCancel: () => void;
  onConfirm: (s: SignOff) => void;
}) {
  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-[520px]">
        {request && (
          // Keyed so a new request always mounts a fresh, empty form.
          <SignOffForm
            key={`${request.cardId}-${request.to}-${request.revision}`}
            request={request}
            onCancel={onCancel}
            onConfirm={onConfirm}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SignOffForm({
  request,
  onCancel,
  onConfirm,
}: {
  request: SignOffRequest;
  onCancel: () => void;
  onConfirm: (s: SignOff) => void;
}) {
  const [reviewer, setReviewer] = useState("");
  const [role, setRole] = useState<ReviewerRole | null>(null);
  const [rationale, setRationale] = useState("");
  const [attest, setAttest] = useState(false);

  const blocked = request.to === "green" && request.activeConflict;
  const valid =
    !blocked &&
    reviewer.trim().length > 1 &&
    !!role &&
    rationale.trim().length > 4 &&
    attest;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-[#00224B]" />
          Status change requires sign-off
        </DialogTitle>
        <DialogDescription>
          {request.cardTitle} · revision {request.revision}
        </DialogDescription>
      </DialogHeader>

      <div className="flex items-center gap-3 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
        <Dot s={request.from} />
        <ArrowRight className="size-4 text-neutral-400" />
        <Dot s={request.to} />
        <span className="ml-auto text-xs text-neutral-500">
          will release as{" "}
          <span className="font-mono">{request.nextRevision}</span>
        </span>
      </div>

      {blocked && (
        <div className="flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            <div className="font-medium">
              Cannot approve while a conflict is active.
            </div>
            <div className="mt-0.5 text-xs text-red-700">
              {request.conflictReason ??
                "Resolve the active conflict from the card menu first."}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="reviewer">Reviewer</Label>
          <Input
            id="reviewer"
            value={reviewer}
            onChange={(e) => setReviewer(e.target.value)}
            placeholder="Full name"
            disabled={blocked}
            autoFocus
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Role</Label>
          <Select
            value={role}
            onValueChange={(v) => setRole(v as ReviewerRole)}
            disabled={blocked}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {REVIEWER_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="rationale">Rationale</Label>
        <Textarea
          id="rationale"
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          placeholder="What evidence supports this change? Reference documents where possible."
          rows={3}
          disabled={blocked}
        />
      </div>

      <label className="flex items-start gap-2 rounded-md border border-neutral-200 p-3 text-xs text-neutral-700">
        <Checkbox
          checked={attest}
          onCheckedChange={(c) => setAttest(c === true)}
          disabled={blocked}
          className="mt-0.5"
        />
        <span>
          I have reviewed the content of this card at revision{" "}
          <span className="font-mono">{request.revision}</span> and attest that
          this status change is accurate. This entry will be recorded in the
          card history with my name and timestamp.
        </span>
      </label>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          disabled={!valid}
          className="bg-[#00224B] hover:bg-[#00224B]/90"
          onClick={() =>
            role &&
            onConfirm({
              reviewer: reviewer.trim(),
              role,
              rationale: rationale.trim(),
              from: request.from,
              to: request.to,
              revision: request.nextRevision,
            })
          }
        >
          Sign off &amp; change status
        </Button>
      </DialogFooter>
    </>
  );
}

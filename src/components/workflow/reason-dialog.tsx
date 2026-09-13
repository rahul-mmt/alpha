"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export interface ReasonRequest {
  title: string;
  description: string;
  placeholder: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: (reason: string) => void;
}

export function ReasonDialog({
  request,
  onClose,
}: {
  request: ReasonRequest | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        {request && (
          <ReasonForm key={request.title} request={request} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReasonForm({
  request,
  onClose,
}: {
  request: ReasonRequest;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <>
      <DialogHeader>
        <DialogTitle>{request.title}</DialogTitle>
        <DialogDescription>{request.description}</DialogDescription>
      </DialogHeader>
      <Textarea
        autoFocus
        rows={3}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={request.placeholder}
      />
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant={request.destructive ? "destructive" : "default"}
          disabled={reason.trim().length < 4}
          onClick={() => {
            request.onConfirm(reason.trim());
            onClose();
          }}
        >
          {request.confirmLabel}
        </Button>
      </DialogFooter>
    </>
  );
}

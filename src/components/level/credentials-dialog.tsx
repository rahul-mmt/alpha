"use client";

import { useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { nowISO, type Signature } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface CredentialsRequest {
  title: string;
  /** What the signature means, shown above the fields. */
  meaning: string;
  /** Who is signing (the active persona). */
  by: string;
  role: string;
  confirmLabel?: string;
  onSigned: (sig: Omit<Signature, "round">) => void;
}

/**
 * Electronic-signature step: the user re-enters their login credentials to
 * sign an action. Verified against the same /api/login the session uses,
 * so a wrong password is rejected server-side.
 */
export function CredentialsDialog({ request, onClose }: { request: CredentialsRequest | null; onClose: () => void }) {
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setUser("");
    setPassword("");
    setError(null);
    setBusy(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ user, password }) });
      const json = (await res.json().catch(() => ({}))) as { error?: string; user?: string };
      if (!res.ok) {
        setError(json.error ?? "Signature rejected.");
        setBusy(false);
        return;
      }
      request.onSigned({ by: request.by, role: request.role, userId: json.user ?? user, at: nowISO() });
      reset();
      onClose();
    } catch {
      setError("Could not reach the server to verify your credentials.");
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={!!request}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-[440px]">
        {request && (
          <form onSubmit={submit} className="flex flex-col gap-5">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-[#08A9AD]" />
                {request.title}
              </DialogTitle>
              <DialogDescription>{request.meaning}</DialogDescription>
            </DialogHeader>

            <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-700">
              Signing as <span className="font-semibold text-neutral-900">{request.by}</span>
              {request.role && <span className="text-neutral-500"> · {request.role}</span>}
              <div className="mt-0.5 text-[11px] text-neutral-500">Your login credentials are your electronic signature. The signature, your user ID and the time are recorded.</div>
            </div>

            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="sig-user">User ID</Label>
                <Input id="sig-user" autoComplete="username" value={user} onChange={(e) => setUser(e.target.value)} autoFocus required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="sig-pass">Password</Label>
                <Input id="sig-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              {error && <p className="text-xs text-red-700">{error}</p>}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy} className="bg-[#00224B] hover:bg-[#00224B]/90">
                <KeyRound className="size-4" />
                {busy ? "Verifying…" : request.confirmLabel ?? "Sign"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

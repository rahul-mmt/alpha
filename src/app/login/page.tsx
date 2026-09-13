"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/workflow/brand-mark";

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ user, password }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Sign-in failed.");
        return;
      }
      window.location.assign(new URL(next.startsWith("/") ? next : "/", window.location.origin).toString());
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-5 rounded-xl border border-neutral-200 bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_12px_40px_-16px_rgba(0,34,75,0.35)]">
      <BrandMark hideSubtitleBelowXl={false} />
      <div className="flex items-center gap-2 text-sm text-neutral-600">
        <LockKeyhole className="size-4 text-[#08A9AD]" />
        This preview is private. Sign in with the shared team credentials.
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="user">User ID</Label>
        <Input id="user" autoComplete="username" value={user} onChange={(e) => setUser(e.target.value)} autoFocus required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <Button type="submit" disabled={busy} className="bg-[#00224B] hover:bg-[#00224B]/90">
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="dotted-canvas flex min-h-screen items-center justify-center p-6">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}

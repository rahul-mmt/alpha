"use client";

/** Shared sync-status store: "saving" | "synced" | "offline" | "idle". */
import { useSyncExternalStore } from "react";

export type SyncStatus = "idle" | "saving" | "synced" | "offline";
let status: SyncStatus = "idle";
const listeners = new Set<() => void>();

export function setSyncStatus(s: SyncStatus) {
  if (s === status) return;
  status = s;
  listeners.forEach((l) => l());
}
export function useSyncStatus() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
    () => "idle" as SyncStatus
  );
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  if (res.status === 401) {
    // Session expired — bounce to login, preserving the current location.
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      const dest = new URL("/login", window.location.origin);
      dest.searchParams.set("next", window.location.pathname + window.location.search);
      window.location.assign(dest.toString());
    }
    throw new Error("unauthorized");
  }
  if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${url} → ${res.status}`);
  return (await res.json()) as T;
}

"use client";

/**
 * Comment threads (shared, server-backed) + comment UI mode (per browser).
 */
import { useSyncExternalStore } from "react";
import { api } from "./sync";
import { makeId, nowISO } from "./types";
import type { CommentAnchor, CommentThread } from "./comments";

const LOCAL_KEY = "fw-comments-cache";
const NAME_KEY = "fw-display-name";
const POLL_MS = 5000;

/* ---------- threads ---------- */

let threads: CommentThread[] = [];
let loaded = false;
let updatedAt: string | null = null;
const listeners = new Set<() => void>();
let poll: ReturnType<typeof setInterval> | null = null;

function emit() {
  listeners.forEach((l) => l());
}
function cache() {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(threads));
  } catch {
    /* ignore */
  }
}

async function pull() {
  try {
    const env = await api<{ data: CommentThread[]; updatedAt: string | null }>("/api/comments", { cache: "no-store" });
    if (env.updatedAt !== updatedAt || !loaded) {
      updatedAt = env.updatedAt;
      threads = env.data ?? [];
      loaded = true;
      cache();
      emit();
    }
  } catch {
    if (!loaded) {
      try {
        const raw = localStorage.getItem(LOCAL_KEY);
        if (raw) threads = JSON.parse(raw) as CommentThread[];
      } catch {
        /* ignore */
      }
      loaded = true;
      emit();
    }
  }
}

function subscribe(l: () => void) {
  listeners.add(l);
  if (!poll) {
    pull();
    poll = setInterval(pull, POLL_MS);
  }
  return () => {
    listeners.delete(l);
    if (listeners.size === 0 && poll) {
      clearInterval(poll);
      poll = null;
    }
  };
}

const EMPTY: CommentThread[] = [];
export function useThreads() {
  return useSyncExternalStore(subscribe, () => threads, () => EMPTY);
}

async function send(op: { op: "upsert"; thread: CommentThread } | { op: "delete"; id: string }) {
  try {
    const res = await api<{ updatedAt: string; threads: CommentThread[] }>("/api/comments", { method: "POST", body: JSON.stringify(op) });
    updatedAt = res.updatedAt;
    threads = res.threads;
    cache();
    emit();
  } catch {
    /* optimistic state stays; next successful pull reconciles */
  }
}

export function upsertThread(t: CommentThread) {
  const i = threads.findIndex((x) => x.id === t.id);
  threads = i === -1 ? [...threads, t] : threads.map((x) => (x.id === t.id ? t : x));
  cache();
  emit();
  send({ op: "upsert", thread: t });
}

export function deleteThread(id: string) {
  threads = threads.filter((t) => t.id !== id);
  cache();
  emit();
  send({ op: "delete", id });
}

export function createThread(page: string, anchor: CommentAnchor, text: string): CommentThread {
  const t: CommentThread = {
    id: makeId("cmt"),
    page,
    anchor,
    createdAt: nowISO(),
    resolved: false,
    messages: [{ id: makeId("msg"), author: getDisplayName(), text, at: nowISO() }],
  };
  upsertThread(t);
  return t;
}

export function replyToThread(id: string, text: string) {
  const t = threads.find((x) => x.id === id);
  if (!t) return;
  upsertThread({ ...t, resolved: false, messages: [...t.messages, { id: makeId("msg"), author: getDisplayName(), text, at: nowISO() }] });
}

export function setResolved(id: string, resolved: boolean) {
  const t = threads.find((x) => x.id === id);
  if (t) upsertThread({ ...t, resolved });
}

/* ---------- display name ---------- */

export function getDisplayName(): string {
  try {
    const stored = localStorage.getItem(NAME_KEY);
    if (stored) return stored;
    const m = document.cookie.match(/(?:^|;\s*)fw_user=([^;]+)/);
    if (m) return decodeURIComponent(m[1]);
  } catch {
    /* ignore */
  }
  return "Guest";
}
export function setDisplayName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name.trim());
  } catch {
    /* ignore */
  }
  emitUi();
}

/* ---------- UI mode (per browser) ---------- */

export interface CommentUi {
  mode: boolean;
  showResolved: boolean;
  activeId: string | null;
  draft: { page: string; anchor: CommentAnchor } | null;
}
let ui: CommentUi = { mode: false, showResolved: false, activeId: null, draft: null };
const uiListeners = new Set<() => void>();
function emitUi() {
  uiListeners.forEach((l) => l());
}
export function setCommentUi(patch: Partial<CommentUi> | ((u: CommentUi) => Partial<CommentUi>)) {
  ui = { ...ui, ...(typeof patch === "function" ? patch(ui) : patch) };
  emitUi();
}
const SERVER_UI: CommentUi = { mode: false, showResolved: false, activeId: null, draft: null };
export function useCommentUi() {
  return useSyncExternalStore(
    (l) => {
      uiListeners.add(l);
      return () => uiListeners.delete(l);
    },
    () => ui,
    () => SERVER_UI
  );
}

"use client";

/**
 * Shared WorkflowState store used by the canvas and the wizard.
 *  - localStorage keeps a local copy for instant loads / offline fallback
 *  - the server (/api/state) is the source of truth so everyone sees the same data
 *  - other tabs sync via the `storage` event; other users via polling
 */
import { useSyncExternalStore } from "react";
import { SEED } from "./seed";
import { addHistory } from "./actions";
import { api, setSyncStatus } from "./sync";
import type { WorkflowState } from "./types";

export const STORAGE_KEY = "mosaic-feature-workflow-v2";
const EDIT_LOG_DEBOUNCE_MS = 1500;
const PUSH_DEBOUNCE_MS = 700;
const POLL_MS = 8000;

let state: WorkflowState | null = null;
const listeners = new Set<() => void>();

let serverUpdatedAt: string | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pushing = false;
let dirty = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let booted = false;

function loadLocal(): WorkflowState {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as WorkflowState;
  } catch {
    /* ignore */
  }
  return SEED;
}

function persistLocal(s: WorkflowState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* quota exceeded or private mode — keep going in memory */
  }
}

function getSnapshot(): WorkflowState {
  if (!state) state = loadLocal();
  return state;
}
const getServerSnapshot = () => SEED;

function emit() {
  listeners.forEach((l) => l());
}

/* ---------- server sync ---------- */

type Envelope = { data: WorkflowState | null; updatedAt: string | null };

async function pullFromServer(initial = false) {
  try {
    const env = await api<Envelope>("/api/state", { cache: "no-store" });
    if (env.data && env.updatedAt !== serverUpdatedAt && !dirty && !pushing) {
      serverUpdatedAt = env.updatedAt;
      state = env.data;
      persistLocal(env.data);
      emit();
    } else if (initial && !env.data) {
      // Fresh server: seed it with whatever this browser has.
      schedulePush(0);
    }
    setSyncStatus(dirty ? "saving" : "synced");
  } catch (e) {
    if ((e as Error).message !== "unauthorized") setSyncStatus("offline");
  }
}

async function pushToServer() {
  if (!state) return;
  pushing = true;
  dirty = false;
  setSyncStatus("saving");
  try {
    const res = await api<{ updatedAt: string }>("/api/state", { method: "PUT", body: JSON.stringify({ state }) });
    serverUpdatedAt = res.updatedAt;
    setSyncStatus(dirty ? "saving" : "synced");
  } catch (e) {
    dirty = true;
    if ((e as Error).message !== "unauthorized") setSyncStatus("offline");
  } finally {
    pushing = false;
    if (dirty) schedulePush();
  }
}

function schedulePush(delay = PUSH_DEBOUNCE_MS) {
  dirty = true;
  setSyncStatus("saving");
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(pushToServer, delay);
}

function boot() {
  if (booted || typeof window === "undefined") return;
  booted = true;
  pullFromServer(true);
  pollTimer = setInterval(() => pullFromServer(false), POLL_MS);
  window.addEventListener("focus", () => pullFromServer(false));
}

function subscribe(l: () => void) {
  listeners.add(l);
  boot();
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      state = loadLocal();
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
    if (listeners.size === 0 && pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
      booted = false;
    }
  };
}

/* ---------- public API ---------- */

export type Updater = WorkflowState | ((s: WorkflowState) => WorkflowState);

export function setWorkflowState(updater: Updater) {
  const next = typeof updater === "function" ? updater(getSnapshot()) : updater;
  if (next === state) return;
  state = next;
  persistLocal(next);
  emit();
  schedulePush();
}

export function getWorkflowState() {
  return getSnapshot();
}

export function resetWorkflowState() {
  setWorkflowState(SEED);
}

/** Log an "edited" history event, debounced per card + summary so typing doesn't spam the log. */
const editTimers = new Map<string, ReturnType<typeof setTimeout>>();
export function logEdit(cardId: string, summary: string) {
  const key = `${cardId}|${summary}`;
  const existing = editTimers.get(key);
  if (existing) clearTimeout(existing);
  editTimers.set(
    key,
    setTimeout(() => {
      editTimers.delete(key);
      setWorkflowState((s) => addHistory(s, cardId, "edited", summary));
    }, EDIT_LOG_DEBOUNCE_MS)
  );
}

export function useWorkflowStore() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return [s, setWorkflowState] as const;
}

import { promises as fs } from "fs";
import path from "path";

/**
 * Minimal JSON document store on the local filesystem.
 * DATA_DIR defaults to ./data locally; on Render it points at the mounted persistent disk.
 */
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");

interface Envelope<T> {
  data: T;
  updatedAt: string;
}

const queues = new Map<string, Promise<unknown>>();

/** Serialise operations per document so concurrent writes don't interleave. */
function enqueue<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const prev = queues.get(name) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  queues.set(name, next.catch(() => undefined));
  return next;
}

function file(name: string) {
  return path.join(DATA_DIR, `${name}.json`);
}

export async function readDoc<T>(name: string): Promise<Envelope<T> | null> {
  try {
    const raw = await fs.readFile(file(name), "utf8");
    return JSON.parse(raw) as Envelope<T>;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

export function writeDoc<T>(name: string, data: T): Promise<Envelope<T>> {
  return enqueue(name, async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const env: Envelope<T> = { data, updatedAt: new Date().toISOString() };
    const target = file(name);
    const tmp = `${target}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(env), "utf8");
    await fs.rename(tmp, target);
    return env;
  });
}

/** Read-modify-write under the per-document lock. */
export function updateDoc<T>(name: string, fallback: T, fn: (current: T) => T): Promise<Envelope<T>> {
  return enqueue(name, async () => {
    const cur = (await readDoc<T>(name))?.data ?? fallback;
    const next = fn(cur);
    await fs.mkdir(DATA_DIR, { recursive: true });
    const env: Envelope<T> = { data: next, updatedAt: new Date().toISOString() };
    const target = file(name);
    const tmp = `${target}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(env), "utf8");
    await fs.rename(tmp, target);
    return env;
  });
}

export function dataDir() {
  return DATA_DIR;
}

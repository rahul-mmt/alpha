import { NextResponse, type NextRequest } from "next/server";
import { readDoc, updateDoc } from "@/lib/server/file-store";
import type { CommentThread } from "@/lib/comments";

const DOC = "comments";
type Op = { op: "upsert"; thread: CommentThread } | { op: "delete"; id: string };

export async function GET() {
  const env = await readDoc<CommentThread[]>(DOC);
  return NextResponse.json(env ?? { data: [], updatedAt: null }, { headers: { "cache-control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Op | null;
  if (!body) return NextResponse.json({ error: "invalid op" }, { status: 400 });
  const env = await updateDoc<CommentThread[]>(DOC, [], (threads) => {
    if (body.op === "delete") return threads.filter((t) => t.id !== body.id);
    if (body.op === "upsert" && body.thread?.id) {
      const i = threads.findIndex((t) => t.id === body.thread.id);
      if (i === -1) return [...threads, body.thread];
      const next = [...threads];
      next[i] = body.thread;
      return next;
    }
    return threads;
  });
  return NextResponse.json({ updatedAt: env.updatedAt, threads: env.data });
}

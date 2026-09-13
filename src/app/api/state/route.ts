import { NextResponse, type NextRequest } from "next/server";
import { readDoc, writeDoc } from "@/lib/server/file-store";
import type { WorkflowState } from "@/lib/types";

const DOC = "workflow-state";

export async function GET() {
  const env = await readDoc<WorkflowState>(DOC);
  return NextResponse.json(env ?? { data: null, updatedAt: null }, { headers: { "cache-control": "no-store" } });
}

export async function PUT(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { state?: WorkflowState } | null;
  if (!body?.state || !Array.isArray(body.state.mechanisms) || !Array.isArray(body.state.features)) {
    return NextResponse.json({ error: "invalid state" }, { status: 400 });
  }
  const env = await writeDoc(DOC, body.state);
  return NextResponse.json({ updatedAt: env.updatedAt });
}

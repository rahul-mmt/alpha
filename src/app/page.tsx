"use client";

import dynamic from "next/dynamic";

// Client-only: the canvas reads localStorage and measures DOM for connectors.
const WorkflowCanvas = dynamic(
  () => import("@/components/workflow/workflow-canvas").then((m) => m.WorkflowCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center text-sm text-neutral-500">
        Loading workflow…
      </div>
    ),
  }
);

export default function Page() {
  return <WorkflowCanvas />;
}

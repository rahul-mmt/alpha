"use client";

import dynamic from "next/dynamic";

// Client-only: reads localStorage and measures DOM for connectors / comment pins.
const ArchitectureView = dynamic(() => import("@/components/architecture/architecture-view").then((m) => m.ArchitectureView), {
  ssr: false,
  loading: () => <div className="flex h-screen items-center justify-center text-sm text-neutral-500">Loading architecture…</div>,
});

export default function Page() {
  return <ArchitectureView />;
}

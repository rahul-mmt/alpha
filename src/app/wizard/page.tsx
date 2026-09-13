"use client";

import dynamic from "next/dynamic";

const Wizard = dynamic(() => import("@/components/wizard/wizard").then((m) => m.Wizard), {
  ssr: false,
  loading: () => <div className="flex h-screen items-center justify-center text-sm text-neutral-500">Loading wizard…</div>,
});

export default function Page() {
  return <Wizard />;
}

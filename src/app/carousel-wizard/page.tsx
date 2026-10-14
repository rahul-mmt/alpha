"use client";

import dynamic from "next/dynamic";

// Client-only: reads localStorage and measures DOM for comment pins.
const CarouselWizardView = dynamic(() => import("@/components/carousel/carousel-wizard-view").then((m) => m.CarouselWizardView), {
  ssr: false,
  loading: () => <div className="flex h-screen items-center justify-center text-sm text-neutral-500">Loading carousel…</div>,
});

export default function Page() {
  return <CarouselWizardView />;
}

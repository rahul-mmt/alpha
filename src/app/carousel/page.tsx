"use client";

import dynamic from "next/dynamic";

// Client-only: reads localStorage and measures DOM for connectors / comment pins.
const CarouselView = dynamic(() => import("@/components/carousel/carousel-view").then((m) => m.CarouselView), {
  ssr: false,
  loading: () => <div className="flex h-screen items-center justify-center text-sm text-neutral-500">Loading carousel…</div>,
});

export default function Page() {
  return <CarouselView />;
}

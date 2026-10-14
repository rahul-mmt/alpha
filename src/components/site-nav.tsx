"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GalleryVerticalEnd, LayoutDashboard, ListChecks, ListOrdered, Network } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Canvas", icon: LayoutDashboard },
  { href: "/wizard", label: "Wizard", icon: ListChecks },
  { href: "/carousel", label: "Carousel UI", icon: GalleryVerticalEnd },
  { href: "/carousel-wizard", label: "Carousel + Wizard", icon: ListOrdered },
  { href: "/architecture", label: "Architecture", icon: Network },
];

export function SiteNav() {
  const path = usePathname();
  return (
    <nav className="flex items-center rounded-md border border-neutral-200 bg-neutral-50 p-0.5" aria-label="View">
      {LINKS.map((l) => {
        const active = l.href === "/" ? path === "/" : path === l.href || path.startsWith(l.href + "/");
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap rounded px-2.5 py-1 text-xs font-medium transition",
              active ? "bg-white text-[#00224B] shadow-sm ring-1 ring-neutral-200" : "text-neutral-600 hover:text-neutral-900"
            )}
          >
            <l.icon className="size-3.5" />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

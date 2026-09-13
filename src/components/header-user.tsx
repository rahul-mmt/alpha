"use client";

import { useState } from "react";
import { Cloud, CloudOff, LogOut, RefreshCw } from "lucide-react";
import { useSyncStatus } from "@/lib/sync";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function HeaderUser() {
  const status = useSyncStatus();
  // Rendered client-only (pages are ssr:false), so reading the cookie in the initializer is safe.
  const [user] = useState<string | null>(() => {
    if (typeof document === "undefined") return null;
    const m = document.cookie.match(/(?:^|;\s*)fw_user=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  });

  const logout = async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.assign(new URL("/login", window.location.origin).toString());
  };

  const meta = {
    idle: { icon: Cloud, label: "Connecting…", cls: "text-neutral-400" },
    saving: { icon: RefreshCw, label: "Saving…", cls: "text-amber-500 animate-spin" },
    synced: { icon: Cloud, label: "All changes saved to the shared workspace", cls: "text-[#08A9AD]" },
    offline: { icon: CloudOff, label: "Offline — changes kept locally until the server is reachable", cls: "text-red-500" },
  }[status];

  return (
    <div className="flex items-center gap-1.5">
      <Tooltip>
        <TooltipTrigger render={<span className="grid size-7 place-items-center" />}>
          <meta.icon className={cn("size-4", meta.cls)} />
        </TooltipTrigger>
        <TooltipContent side="bottom">{meta.label}</TooltipContent>
      </Tooltip>
      {user && (
        <Button variant="ghost" size="sm" onClick={logout} title={`Signed in as ${user} · sign out`} className="text-neutral-600">
          <LogOut className="size-3.5" />
          <span className="hidden 2xl:inline">{user}</span>
        </Button>
      )}
    </div>
  );
}

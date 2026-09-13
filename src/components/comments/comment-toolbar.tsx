"use client";

import { MessageSquarePlus } from "lucide-react";
import { setCommentUi, useCommentUi, useThreads } from "@/lib/comments-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function CommentToolbar({ pageKey }: { pageKey: string }) {
  const threads = useThreads();
  const ui = useCommentUi();
  const here = threads.filter((t) => t.page === pageKey);
  const open = here.filter((t) => !t.resolved);

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant={ui.mode ? "default" : "outline"}
              size="sm"
              onClick={() => setCommentUi((u) => ({ mode: !u.mode, draft: null }))}
              className={cn(ui.mode && "bg-[#7B61FF] text-white hover:bg-[#6a50f0]")}
              aria-pressed={ui.mode}
            />
          }
        >
          <MessageSquarePlus className="size-3.5" />
          <span className="hidden 2xl:inline">{ui.mode ? "Commenting…" : "Comment"}</span>
          {open.length > 0 && (
            <span className={cn("rounded-full px-1.5 font-mono text-[10px]", ui.mode ? "bg-white/25" : "bg-[#7B61FF]/15 text-[#5b44d6]")}>
              {open.length}
            </span>
          )}
        </TooltipTrigger>
        <TooltipContent side="bottom">{ui.mode ? "Click anywhere to place a comment · Esc to exit" : "Add a comment (C)"}</TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="icon-sm" aria-label="Comment list" />}>
          <span className="text-[10px]">▾</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs">Comments on this screen</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuCheckboxItem checked={ui.showResolved} onCheckedChange={(v) => setCommentUi({ showResolved: !!v })} className="text-xs">
            Show resolved
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          {here.length === 0 && <div className="px-2 py-3 text-xs text-neutral-500">No comments yet. Press C and click anywhere.</div>}
          {here
            .filter((t) => ui.showResolved || !t.resolved)
            .map((t) => (
              <DropdownMenuItem
                key={t.id}
                className="items-start gap-2 text-xs"
                onClick={() => {
                  setCommentUi({ activeId: t.id, draft: null });
                  setTimeout(() => document.getElementById(`pin-${t.id}`)?.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" }), 50);
                }}
              >
                <span className={cn("mt-1 size-2 shrink-0 rounded-full", t.resolved ? "bg-neutral-400" : "bg-[#7B61FF]")} />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-neutral-800">{t.messages[0]?.author}</span>
                  <span className="line-clamp-2 text-neutral-600">{t.messages[0]?.text}</span>
                </span>
                <span className="ml-auto shrink-0 font-mono text-[10px] text-neutral-400">{t.messages.length}</span>
              </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

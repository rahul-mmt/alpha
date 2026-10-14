"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, CornerDownRight, Plus, Trash2 } from "lucide-react";
import { DISCIPLINES, countNodes, levelName, type ArchNode, type Discipline } from "@/lib/architecture";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Fixed column geometry so the level headers line up with the tree. */
export const NODE_W = 212;
export const COL_GAP = 56;
const ROW_GAP = 12;

export interface TreeHandlers {
  collapsed: Set<string>;
  editing: string | null;
  onEditing: (id: string | null) => void;
  onRename: (id: string, name: string) => void;
  onDiscipline: (id: string, d?: Discipline) => void;
  onAddChild: (parent: ArchNode, depth: number) => void;
  onAddSibling: (node: ArchNode, depth: number) => void;
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
}

/** One node and, to its right, the stack of its children (recursive). */
export function TreeBranch({ node, depth, isRoot, ...h }: { node: ArchNode; depth: number; isRoot?: boolean } & TreeHandlers) {
  const isCollapsed = h.collapsed.has(node.id);
  const showChildren = node.children.length > 0 && !isCollapsed;
  return (
    <div className="flex items-start" style={{ gap: COL_GAP }}>
      <div className="shrink-0 self-center" style={{ width: NODE_W }}>
        <NodeBox node={node} depth={depth} isRoot={isRoot} {...h} />
      </div>
      {showChildren && (
        <div className="flex flex-col" style={{ gap: ROW_GAP }}>
          {node.children.map((c) => (
            <TreeBranch key={c.id} node={c} depth={depth + 1} {...h} />
          ))}
        </div>
      )}
    </div>
  );
}

function NodeBox({ node, depth, isRoot, ...h }: { node: ArchNode; depth: number; isRoot?: boolean } & TreeHandlers) {
  const editing = h.editing === node.id;
  const isCollapsed = h.collapsed.has(node.id);
  const disc = node.discipline ? DISCIPLINES[node.discipline] : null;
  const accent = isRoot ? "#00224B" : disc?.color ?? "#9ca3af";
  const descendants = countNodes(node) - 1;

  return (
    <div
      data-node-id={node.id}
      className={cn(
        "group relative rounded-md border bg-white shadow-sm transition",
        isRoot ? "border-[#00224B]/40 ring-1 ring-[#00224B]/10" : "border-neutral-200 hover:border-neutral-300",
        node.children.length > 0 && isCollapsed && "border-dashed"
      )}
      style={{ borderLeft: `4px solid ${accent}` }}
    >
      <div className="flex items-center gap-1 px-2 pt-1.5">
        <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-400">
          L{depth} · {levelName(depth)}
        </span>
        <span className="ml-auto" />
        {/* Discipline dot + picker */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                title={disc ? disc.label : "Set discipline"}
                className="grid size-4 place-items-center rounded-full border border-neutral-300 bg-white transition hover:scale-110"
              />
            }
          >
            <span className="size-2.5 rounded-full" style={{ backgroundColor: disc?.color ?? "#e5e7eb" }} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {(Object.keys(DISCIPLINES) as Discipline[]).map((d) => (
              <DropdownMenuItem key={d} onClick={() => h.onDiscipline(node.id, d)}>
                <span className="size-2.5 rounded-full" style={{ backgroundColor: DISCIPLINES[d].color }} />
                {DISCIPLINES[d].label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => h.onDiscipline(node.id, undefined)}>
              <span className="size-2.5 rounded-full bg-neutral-200" />
              None
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-1 px-2 pb-2 pt-0.5">
        {editing ? (
          <NameInput
            initial={node.name}
            onCommit={(name) => {
              if (name && name !== node.name) h.onRename(node.id, name);
              h.onEditing(null);
            }}
            onCancel={() => h.onEditing(null)}
          />
        ) : (
          <button
            type="button"
            onClick={() => h.onEditing(node.id)}
            title="Rename"
            className={cn(
              "min-w-0 flex-1 truncate rounded px-1.5 py-0.5 text-left text-[13px] hover:bg-neutral-100",
              isRoot ? "font-semibold text-[#00224B]" : "font-medium text-neutral-900"
            )}
          >
            {node.name}
          </button>
        )}

        {node.children.length > 0 && (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={() => h.onToggle(node.id)}
                  className="flex shrink-0 items-center gap-0.5 rounded px-1 py-0.5 font-mono text-[10px] text-neutral-500 hover:bg-neutral-100"
                />
              }
            >
              {isCollapsed ? <ChevronRight className="size-3" /> : <ChevronDown className="size-3" />}
              {descendants}
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isCollapsed ? `Expand ${descendants} descendant${descendants === 1 ? "" : "s"}` : "Collapse"}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Hover actions */}
      <div className="absolute -right-2 -top-2 flex items-center gap-0.5 rounded-md border border-neutral-200 bg-white p-0.5 opacity-0 shadow-sm transition group-hover:opacity-100 group-focus-within:opacity-100">
        <Tooltip>
          <TooltipTrigger
            render={<button type="button" onClick={() => h.onAddChild(node, depth)} className="grid size-5 place-items-center rounded text-[#08A9AD] hover:bg-[#08A9AD]/10" />}
          >
            <Plus className="size-3.5" />
          </TooltipTrigger>
          <TooltipContent side="top">Add {levelName(depth + 1).toLowerCase()}</TooltipContent>
        </Tooltip>
        {!isRoot && (
          <>
            <Tooltip>
              <TooltipTrigger
                render={<button type="button" onClick={() => h.onAddSibling(node, depth)} className="grid size-5 place-items-center rounded text-neutral-600 hover:bg-neutral-100" />}
              >
                <CornerDownRight className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent side="top">Add sibling {levelName(depth).toLowerCase()}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={<button type="button" onClick={() => h.onRemove(node.id)} className="grid size-5 place-items-center rounded text-red-600 hover:bg-red-50" />}
              >
                <Trash2 className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent side="top">
                Remove{descendants > 0 ? ` (and ${descendants} below it)` : ""}
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    </div>
  );
}

/** Mounted only while editing, so its state starts from the current name and the field autofocuses. */
function NameInput({ initial, onCommit, onCancel }: { initial: string; onCommit: (name: string) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(initial);
  return (
    <input
      autoFocus
      value={draft}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onCommit(draft.trim())}
      onKeyDown={(e) => {
        if (e.key === "Enter") onCommit(draft.trim());
        if (e.key === "Escape") onCancel();
      }}
      className="w-full rounded border border-[#08A9AD] bg-white px-1.5 py-0.5 text-[13px] font-medium text-neutral-900 outline-none"
    />
  );
}

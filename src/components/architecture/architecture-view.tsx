"use client";

import { useMemo, useRef, useState } from "react";
import { Download, FoldVertical, Plus, RotateCcw, UnfoldVertical } from "lucide-react";
import {
  DISCIPLINES,
  addChild,
  allIds,
  countNodes,
  levelName,
  maxDepth,
  newNode,
  removeNode,
  addSibling,
  updateNode,
  useArchitecture,
  type ArchNode,
  type Discipline,
} from "@/lib/architecture";
import { useWorkflowStore } from "@/lib/store";
import { todayISO } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SiteNav } from "@/components/site-nav";
import { HeaderUser } from "@/components/header-user";
import { CommentLayer } from "@/components/comments/comment-layer";
import { CommentToolbar } from "@/components/comments/comment-toolbar";
import { BrandMark } from "@/components/workflow/brand-mark";
import { Connectors, type Edge } from "@/components/workflow/connectors";
import { TreeBranch, NODE_W, COL_GAP } from "./tree-node";

/**
 * System Architecture: the design hierarchy as an editable tree diagram.
 * Root → devices → subsystems → … Every node can be renamed, given a
 * discipline, collapsed, or extended with children and siblings.
 */
export function ArchitectureView() {
  const [root, setRoot, reset] = useArchitecture();
  // Subscribing boots the shared-store sync so the header's cloud icon reflects the workspace, as on other tabs.
  useWorkflowStore();
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const depth = useMemo(() => maxDepth(root), [root]);
  const total = useMemo(() => countNodes(root), [root]);

  /* ---------- edits ---------- */

  const rename = (id: string, name: string) => setRoot((r) => updateNode(r, id, { name }));
  const setDiscipline = (id: string, discipline?: Discipline) => setRoot((r) => updateNode(r, id, { discipline }));
  const child = (parent: ArchNode, parentDepth: number) => {
    const node = newNode(parentDepth + 1, parent.discipline);
    setRoot((r) => addChild(r, parent.id, node));
    setCollapsed((s) => {
      const next = new Set(s);
      next.delete(parent.id);
      return next;
    });
    setEditing(node.id);
  };
  const sibling = (node: ArchNode, nodeDepth: number) => {
    const sib = newNode(nodeDepth, node.discipline);
    setRoot((r) => addSibling(r, node.id, sib));
    setEditing(sib.id);
  };
  const remove = (id: string) => setRoot((r) => removeNode(r, id));
  const toggle = (id: string) =>
    setCollapsed((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const collapseAll = () => setCollapsed(new Set(allIds(root).filter((id) => id !== root.id)));
  const expandAll = () => setCollapsed(new Set());

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(root, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `system-architecture-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ---------- connectors: parent → each visible child ---------- */

  const edges = useMemo<Edge[]>(() => {
    const out: Edge[] = [];
    const walk = (nd: ArchNode) => {
      if (collapsed.has(nd.id)) return;
      for (const c of nd.children) {
        out.push({ from: nd.id, to: c.id });
        walk(c);
      }
    };
    walk(root);
    return out;
  }, [root, collapsed]);

  return (
    <div className="flex h-screen flex-col bg-white text-neutral-900">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-neutral-200 bg-white px-5 py-3">
        <BrandMark />
        <SiteNav />
        <Separator orientation="vertical" className="h-8!" />
        <div className="hidden items-center gap-2 whitespace-nowrap text-xs text-neutral-600 xl:flex">
          <span className="inline-flex items-center rounded border border-violet-300 bg-violet-100 px-2 py-0.5 text-[13px] font-semibold text-violet-900">
            System Architecture
          </span>
          <Badge variant="outline">{total} nodes</Badge>
          <Badge variant="outline">{depth + 1} levels</Badge>
          <Badge variant="outline">{root.children.length} devices</Badge>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden items-center gap-3 text-[11px] text-neutral-600 2xl:flex">
            {(Object.keys(DISCIPLINES) as Discipline[]).map((d) => (
              <span key={d} className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: DISCIPLINES[d].color }} />
                {DISCIPLINES[d].label}
              </span>
            ))}
          </div>
          <Separator orientation="vertical" className="hidden h-8! 2xl:block" />
          <Button variant="outline" size="sm" onClick={collapseAll} title="Collapse to devices">
            <FoldVertical className="size-3.5" />
            <span className="hidden 2xl:inline">Collapse</span>
          </Button>
          <Button variant="outline" size="sm" onClick={expandAll} title="Expand everything">
            <UnfoldVertical className="size-3.5" />
            <span className="hidden 2xl:inline">Expand</span>
          </Button>
          <Button variant="outline" size="sm" onClick={exportJson} title="Export tree as JSON">
            <Download className="size-3.5" />
            <span className="hidden 2xl:inline">Export</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => { reset(); setCollapsed(new Set()); }} title="Reset to seed content">
            <RotateCcw className="size-3.5" />
            <span className="hidden 2xl:inline">Reset demo</span>
          </Button>
          <Button size="sm" className="bg-[#00224B] hover:bg-[#00224B]/90" onClick={() => child(root, 0)}>
            <Plus className="size-3.5" />
            Add device
          </Button>
          <Separator orientation="vertical" className="h-8!" />
          <CommentToolbar pageKey="architecture" />
          <HeaderUser />
        </div>
      </header>

      <div className="dotted-canvas relative flex-1 overflow-auto">
        <div ref={canvasRef} className="relative inline-block min-h-full min-w-full p-12 pt-8">
          <Connectors containerRef={canvasRef} edges={edges} deps={[root, collapsed, editing]} />
          <CommentLayer pageKey="architecture" containerRef={canvasRef} />

          {/* Level headers, aligned with the tree columns */}
          <div className="relative z-10 mb-6 flex" style={{ gap: COL_GAP }}>
            {Array.from({ length: depth + 1 }).map((_, i) => (
              <div key={i} className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-neutral-500" style={{ width: NODE_W }}>
                <span className="mr-1.5 font-mono text-neutral-400">L{i}</span>
                {levelName(i)}
              </div>
            ))}
          </div>

          <div className="relative z-10">
            <TreeBranch
              node={root}
              depth={0}
              isRoot
              collapsed={collapsed}
              editing={editing}
              onEditing={setEditing}
              onRename={rename}
              onDiscipline={setDiscipline}
              onAddChild={child}
              onAddSibling={sibling}
              onRemove={remove}
              onToggle={toggle}
            />
          </div>

          <p className="relative z-10 mt-10 max-w-md text-[11px] leading-snug text-neutral-500">
            Click a name to rename it. Hover a node for add / remove. Children inherit the parent&apos;s discipline colour; change it from the
            dot on the node. This tree is kept in this browser only.
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

/**
 * System Architecture hierarchy — a tree of design elements under one root.
 * Levels follow the DHF breakdown: System → Device → Design Section → Design
 * Element → Design Part. Kept per browser (localStorage); not part of the
 * shared workflow state.
 */
import { useCallback, useEffect, useState } from "react";
import { makeId } from "./types";

export type Discipline = "mechanical" | "electrical" | "software";

export const DISCIPLINES: Record<Discipline, { label: string; color: string; soft: string }> = {
  mechanical: { label: "Mechanical", color: "#2563eb", soft: "#dbeafe" },
  electrical: { label: "Electrical", color: "#d97706", soft: "#fef3c7" },
  software: { label: "Software", color: "#059669", soft: "#d1fae5" },
};

/** Level names by depth; deeper levels fall back to "Level n". */
export const LEVELS = ["System", "Device", "Design Section", "Design Element", "Design Part"];
export function levelName(depth: number) {
  return LEVELS[depth] ?? `Level ${depth + 1}`;
}

export interface ArchNode {
  id: string;
  name: string;
  discipline?: Discipline;
  children: ArchNode[];
}

const n = (name: string, children: ArchNode[] = [], discipline?: Discipline): ArchNode => ({ id: makeId("n"), name, discipline, children });

function device(name: string): ArchNode {
  return n(name, [
    n("Mechanical Subsystem", [n("Subassembly", [n("Component", [], "mechanical")], "mechanical")], "mechanical"),
    n("Electrical Subsystem", [n("Electrical Module", [n("Electrical Component", [], "electrical")], "electrical")], "electrical"),
    n("Software Subsystem", [n("Software Item", [n("Software Unit", [], "software")], "software")], "software"),
  ]);
}

export function seedArchitecture(): ArchNode {
  return n("System Name", [device("Device A Name"), device("Device B Name")]);
}

/* ---------- pure tree ops ---------- */

export function mapTree(node: ArchNode, fn: (node: ArchNode) => ArchNode): ArchNode {
  return fn({ ...node, children: node.children.map((c) => mapTree(c, fn)) });
}

export function updateNode(root: ArchNode, id: string, patch: Partial<ArchNode>): ArchNode {
  return mapTree(root, (nd) => (nd.id === id ? { ...nd, ...patch } : nd));
}

export function addChild(root: ArchNode, parentId: string, child: ArchNode): ArchNode {
  return mapTree(root, (nd) => (nd.id === parentId ? { ...nd, children: [...nd.children, child] } : nd));
}

export function addSibling(root: ArchNode, siblingId: string, node: ArchNode): ArchNode {
  return mapTree(root, (nd) => {
    const i = nd.children.findIndex((c) => c.id === siblingId);
    if (i === -1) return nd;
    const children = [...nd.children];
    children.splice(i + 1, 0, node);
    return { ...nd, children };
  });
}

export function removeNode(root: ArchNode, id: string): ArchNode {
  return mapTree(root, (nd) => ({ ...nd, children: nd.children.filter((c) => c.id !== id) }));
}

export function findNode(root: ArchNode, id: string): ArchNode | undefined {
  if (root.id === id) return root;
  for (const c of root.children) {
    const hit = findNode(c, id);
    if (hit) return hit;
  }
  return undefined;
}

export function countNodes(node: ArchNode): number {
  return 1 + node.children.reduce((s, c) => s + countNodes(c), 0);
}

export function maxDepth(node: ArchNode, depth = 0): number {
  return node.children.length === 0 ? depth : Math.max(...node.children.map((c) => maxDepth(c, depth + 1)));
}

export function allIds(node: ArchNode, out: string[] = []): string[] {
  out.push(node.id);
  node.children.forEach((c) => allIds(c, out));
  return out;
}

/** Inherit the parent's discipline for a new child so the colour carries down the branch. */
export function newNode(depth: number, discipline?: Discipline): ArchNode {
  return n(`New ${levelName(depth).toLowerCase()}`, [], discipline);
}

/* ---------- persistence ---------- */

const KEY = "mosaic-system-architecture-v1";

export function useArchitecture() {
  const [root, setRoot] = useState<ArchNode>(() => {
    if (typeof window === "undefined") return seedArchitecture();
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw) as ArchNode;
    } catch {
      /* ignore */
    }
    return seedArchitecture();
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(root));
    } catch {
      /* ignore */
    }
  }, [root]);
  const reset = useCallback(() => setRoot(seedArchitecture()), []);
  return [root, setRoot, reset] as const;
}

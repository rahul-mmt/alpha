/** Shared comment types (used by both client store and API route). */
export interface CommentAnchor {
  /** Element id (data-node-id / data-anchor) the pin is attached to, with fractional offsets. */
  nodeId?: string;
  fx?: number;
  fy?: number;
  /** Fallback: absolute position inside the page's comment container. */
  x?: number;
  y?: number;
}

export interface CommentMessage {
  id: string;
  author: string;
  text: string;
  at: string;
}

export interface CommentThread {
  id: string;
  /** Which screen the pin lives on, e.g. "canvas" or "wizard:moa-1:review". */
  page: string;
  anchor: CommentAnchor;
  createdAt: string;
  resolved: boolean;
  messages: CommentMessage[];
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

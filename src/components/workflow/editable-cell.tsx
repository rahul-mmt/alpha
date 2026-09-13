"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Borderless, auto-growing textarea used for every table cell.
 * Commits on every keystroke so the canvas connectors can re-measure.
 */
export function EditableCell({
  value,
  onChange,
  placeholder,
  readOnly,
  className,
  mono,
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  mono?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      readOnly={readOnly}
      placeholder={placeholder}
      onChange={(e) => onChange?.(e.target.value)}
      rows={1}
      spellCheck={false}
      className={cn(
        "block w-full resize-none overflow-hidden bg-transparent px-2 py-1.5 text-[11px] leading-snug text-neutral-800 outline-none placeholder:text-neutral-400",
        !readOnly && "rounded-sm focus:bg-white focus:ring-1 focus:ring-[#08A9AD]",
        readOnly && "cursor-default text-neutral-700",
        mono && "font-mono text-[10px]",
        className
      )}
    />
  );
}

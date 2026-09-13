"use client";

import { useRef, useState } from "react";
import { Download, FileText, Paperclip, Upload, X } from "lucide-react";
import { formatBytes, nowISO, type TheoryFile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const INLINE_LIMIT = 1_500_000; // keep localStorage comfortable
const TEXT_TYPES = /^(text\/|application\/(json|xml))/;
const TEXT_EXT = /\.(txt|md|markdown|csv|json)$/i;

/** Read a File into our serialisable TheoryFile shape. */
export function readTheoryFile(file: File): Promise<TheoryFile> {
  return new Promise((resolve, reject) => {
    const base: TheoryFile = { name: file.name, size: file.size, type: file.type || "application/octet-stream", addedAt: nowISO() };
    const isText = TEXT_TYPES.test(file.type) || TEXT_EXT.test(file.name);
    const tasks: Promise<Partial<TheoryFile>>[] = [];
    if (file.size <= INLINE_LIMIT) {
      tasks.push(
        new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res({ dataUrl: String(r.result) });
          r.onerror = () => rej(r.error);
          r.readAsDataURL(file);
        })
      );
    }
    if (isText) {
      tasks.push(
        new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res({ text: String(r.result).slice(0, 20_000) });
          r.onerror = () => rej(r.error);
          r.readAsText(file);
        })
      );
    }
    Promise.all(tasks)
      .then((parts) => resolve(Object.assign(base, ...parts)))
      .catch(reject);
  });
}

/** Compact chip shown wherever a theory has a file attached. */
export function TheoryFileChip({
  file,
  onRemove,
  className,
}: {
  file: TheoryFile;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded border border-[#08A9AD]/40 bg-[#08A9AD]/10 px-1.5 py-0.5 text-[10px] text-[#00224B]",
        className
      )}
      title={`${file.name} · ${formatBytes(file.size)}`}
    >
      <FileText className="size-3 shrink-0 text-[#08A9AD]" />
      <span className="truncate">{file.name}</span>
      <span className="shrink-0 text-neutral-500">{formatBytes(file.size)}</span>
      {file.dataUrl && (
        <a
          href={file.dataUrl}
          download={file.name}
          className="shrink-0 rounded p-0.5 hover:bg-white"
          aria-label="Download file"
          onClick={(e) => e.stopPropagation()}
        >
          <Download className="size-3" />
        </a>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="shrink-0 rounded p-0.5 text-neutral-500 hover:bg-white hover:text-red-600"
          aria-label="Remove file"
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}

/** Small paperclip button that opens a file picker — used inside the canvas card. */
export function AttachFileButton({ onAttach, className }: { onAttach: (f: TheoryFile) => void; className?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) onAttach(await readTheoryFile(f));
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={cn(
          "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-neutral-500 hover:bg-neutral-100 hover:text-[#08A9AD]",
          className
        )}
        title="Attach the source document for this theory"
      >
        <Paperclip className="size-3" />
        Attach file
      </button>
    </>
  );
}

/** Large drag-and-drop zone — used in the wizard. */
export function TheoryFileDrop({
  file,
  onAttach,
  onRemove,
  onUseText,
}: {
  file?: TheoryFile;
  onAttach: (f: TheoryFile) => void;
  onRemove: () => void;
  onUseText?: (text: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);

  const handle = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    try {
      onAttach(await readTheoryFile(f));
    } finally {
      setBusy(false);
    }
  };

  if (file) {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-[#08A9AD]/40 bg-[#08A9AD]/5 p-3">
        <div className="flex items-center gap-3">
          <FileText className="size-8 shrink-0 text-[#08A9AD]" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-neutral-800">{file.name}</div>
            <div className="text-xs text-neutral-500">
              {formatBytes(file.size)} · {file.type || "unknown type"} · added{" "}
              {new Date(file.addedAt).toLocaleDateString()}
              {!file.dataUrl && " · metadata only (file too large to store inline)"}
            </div>
          </div>
          {file.dataUrl && (
            <Button variant="outline" size="sm" nativeButton={false} render={<a href={file.dataUrl} download={file.name} />}>
              <Download className="size-3.5" />
              Download
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onRemove}>
            <X className="size-3.5" />
            Remove
          </Button>
        </div>
        {file.text && onUseText && (
          <div className="flex items-center justify-between gap-3 rounded border border-neutral-200 bg-white p-2 text-xs text-neutral-600">
            <span className="line-clamp-2 flex-1 font-mono text-[11px]">{file.text.slice(0, 240)}</span>
            <Button variant="outline" size="sm" onClick={() => onUseText(file.text!)}>
              Use as statement
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        handle(e.dataTransfer.files?.[0]);
      }}
      onClick={() => ref.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && ref.current?.click()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed p-5 text-center text-xs transition",
        over ? "border-[#08A9AD] bg-[#08A9AD]/10" : "border-neutral-300 bg-neutral-50 hover:border-[#08A9AD]"
      )}
    >
      <input ref={ref} type="file" className="hidden" onChange={(e) => handle(e.target.files?.[0])} />
      <Upload className="size-5 text-neutral-400" />
      <div className="font-medium text-neutral-700">{busy ? "Reading file…" : "Drop the source document here, or click to browse"}</div>
      <div className="text-neutral-500">PDF, Word, or text. Text files can pre-fill the statement.</div>
    </div>
  );
}

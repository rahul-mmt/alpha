export function PhaseHexagon({
  title,
  note,
  nodeId,
}: {
  title: string;
  note?: string;
  nodeId: string;
}) {
  return (
    <div className="flex flex-col items-start gap-6">
      <div
        data-node-id={nodeId}
        className="relative flex h-[220px] w-[330px] items-center justify-center"
      >
        <svg
          viewBox="0 0 330 220"
          className="absolute inset-0 h-full w-full drop-shadow-sm"
          aria-hidden
        >
          <polygon
            points="50,2 280,2 328,110 280,218 50,218 2,110"
            className="fill-neutral-200 stroke-neutral-400"
            strokeWidth="1.5"
          />
        </svg>
        <div className="relative px-10 text-center text-[34px] font-medium leading-tight tracking-tight text-neutral-800">
          {title}
        </div>
      </div>
      {note && (
        <p className="max-w-[200px] text-[13px] leading-snug text-neutral-700">{note}</p>
      )}
    </div>
  );
}

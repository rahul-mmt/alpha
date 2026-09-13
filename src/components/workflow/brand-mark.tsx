export function BrandMark({ subtitle, hideSubtitleBelowXl = true }: { subtitle?: string; hideSubtitleBelowXl?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-8 grid-cols-2 gap-[2px] rounded-sm bg-[#00224B] p-[5px]">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="rounded-[1px] bg-[#08A9AD]" />
        ))}
      </span>
      <div className="leading-tight">
        <div className="whitespace-nowrap text-[15px] font-semibold text-[#00224B]">Feature Development Workflow</div>
        <div className={`whitespace-nowrap text-xs text-neutral-500 ${hideSubtitleBelowXl ? "hidden xl:block" : ""}`}>
          {subtitle ?? "Mosaic MedTech · Design History File · PR-0102 rev B"}
        </div>
      </div>
    </div>
  );
}

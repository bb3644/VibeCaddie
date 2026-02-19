interface InfoBannerProps {
  children: React.ReactNode;
}

/** 信息说明横幅 — 视觉上明确是只读说明，不可编辑 */
export function InfoBanner({ children }: InfoBannerProps) {
  return (
    <div className="flex gap-3 items-start rounded-lg bg-accent/5 border-l-4 border-accent/40 px-4 py-3">
      <span className="text-accent/60 text-[0.875rem] font-semibold mt-0.5 shrink-0">
        i
      </span>
      <p className="text-[0.8125rem] leading-[1.4rem] text-secondary">
        {children}
      </p>
    </div>
  );
}

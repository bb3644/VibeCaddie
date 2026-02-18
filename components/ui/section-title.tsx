"use client";

interface SectionTitleProps {
  children: React.ReactNode;
  className?: string;
  showDivider?: boolean;
}

/** 段落标题，可选底部分割线 */
export function SectionTitle({
  children,
  className = "",
  showDivider = false,
}: SectionTitleProps) {
  return (
    <div className={className}>
      <h2 className="text-[1.25rem] font-semibold leading-[1.75rem] text-text">
        {children}
      </h2>
      {showDivider && (
        <div className="mt-2 h-px bg-divider" />
      )}
    </div>
  );
}

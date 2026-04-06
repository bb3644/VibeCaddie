"use client";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

/** 圆角卡片容器 */
export function Card({ children, className = "", style, onClick }: CardProps) {
  return (
    <div
      className={`bg-card rounded-[12px] shadow-card p-5 ${className}`}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

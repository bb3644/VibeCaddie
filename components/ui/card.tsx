"use client";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

/** 圆角卡片容器 */
export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`bg-card rounded-[12px] shadow-card p-5 ${className}`}>
      {children}
    </div>
  );
}

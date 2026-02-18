"use client";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

/** 页面居中容器，最大宽度 720px */
export function PageContainer({ children, className = "" }: PageContainerProps) {
  return (
    <div className={`max-w-[720px] mx-auto px-4 sm:px-6 py-6 ${className}`}>
      {children}
    </div>
  );
}

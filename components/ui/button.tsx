"use client";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent-hover active:bg-accent-hover",
  secondary:
    "border border-divider text-text hover:bg-bg active:bg-bg",
  ghost:
    "text-secondary hover:text-text hover:bg-bg active:bg-bg",
};

/** 通用按钮，支持 primary / secondary / ghost 三种变体 */
export function Button({
  children,
  variant = "primary",
  onClick,
  disabled = false,
  className = "",
  type = "button",
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center
        min-h-[44px] rounded-lg px-4 py-2.5
        font-medium text-[0.9375rem] leading-[1.5rem]
        transition-colors duration-150
        disabled:opacity-50 disabled:pointer-events-none
        cursor-pointer
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </button>
  );
}

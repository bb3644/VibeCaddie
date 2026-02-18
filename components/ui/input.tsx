"use client";

interface InputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  error?: string;
  className?: string;
}

/** 带标签的文本输入框 */
export function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  error,
  className = "",
}: InputProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-[0.875rem] font-medium text-text">
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`
          w-full rounded-lg px-3 py-2.5
          text-[0.9375rem] leading-[1.5rem] text-text
          border bg-white
          placeholder:text-secondary
          transition-colors duration-150
          outline-none
          ${
            error
              ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
              : "border-divider focus:border-accent focus:ring-1 focus:ring-accent"
          }
        `}
      />
      {error && (
        <span className="text-[0.8125rem] text-red-500">{error}</span>
      )}
    </div>
  );
}

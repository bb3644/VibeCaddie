"use client";

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
}

/** 数值加减步进器，用于记分/推杆数输入 */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  label,
}: StepperProps) {
  const decrement = () => {
    if (value > min) onChange(value - 1);
  };

  const increment = () => {
    if (value < max) onChange(value + 1);
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      {label && (
        <span className="text-[0.875rem] font-medium text-text">
          {label}
        </span>
      )}
      <div className="flex items-center gap-3">
        {/* 减少按钮 */}
        <button
          type="button"
          onClick={decrement}
          disabled={value <= min}
          className="
            min-w-[44px] min-h-[44px]
            flex items-center justify-center
            rounded-lg border border-divider
            text-text text-xl font-medium
            hover:bg-bg active:bg-bg
            transition-colors duration-150
            disabled:opacity-30 disabled:pointer-events-none
            cursor-pointer
          "
          aria-label="减少"
        >
          &minus;
        </button>

        {/* 当前值 */}
        <span className="min-w-[40px] text-center text-[1.25rem] font-semibold text-text tabular-nums">
          {value}
        </span>

        {/* 增加按钮 */}
        <button
          type="button"
          onClick={increment}
          disabled={value >= max}
          className="
            min-w-[44px] min-h-[44px]
            flex items-center justify-center
            rounded-lg border border-divider
            text-text text-xl font-medium
            hover:bg-bg active:bg-bg
            transition-colors duration-150
            disabled:opacity-30 disabled:pointer-events-none
            cursor-pointer
          "
          aria-label="增加"
        >
          +
        </button>
      </div>
    </div>
  );
}

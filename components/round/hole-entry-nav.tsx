"use client";

import { Button } from "@/components/ui/button";

interface HoleEntryNavProps {
  currentHole: number;
  totalHoles: number;
  /** 每个洞是否有数据（数组索引 0 = Hole 1） */
  holesWithData: boolean[];
  onPrev: () => void;
  onNext: () => void;
  onFinish: () => void;
}

/** 洞导航组件 — 上一洞/下一洞 + 圆点指示器 */
export function HoleEntryNav({
  currentHole,
  totalHoles,
  holesWithData,
  onPrev,
  onNext,
  onFinish,
}: HoleEntryNavProps) {
  const isFirst = currentHole === 1;
  const isLast = currentHole === totalHoles;

  return (
    <div className="flex flex-col gap-4">
      {/* 洞号圆点指示器 */}
      <div className="flex justify-center gap-1.5 flex-wrap">
        {Array.from({ length: totalHoles }, (_, i) => {
          const holeNum = i + 1;
          const hasData = holesWithData[i] ?? false;
          const isCurrent = holeNum === currentHole;

          return (
            <div
              key={holeNum}
              className={`
                w-6 h-6 rounded-full flex items-center justify-center
                text-[0.6875rem] font-medium transition-colors duration-150
                ${
                  isCurrent
                    ? "bg-accent text-white"
                    : hasData
                    ? "bg-accent/20 text-accent"
                    : "bg-gray-200 text-secondary"
                }
              `}
            >
              {holeNum}
            </div>
          );
        })}
      </div>

      {/* 当前洞号 / 总洞数 */}
      <p className="text-center text-[0.875rem] text-secondary">
        {currentHole} / {totalHoles}
      </p>

      {/* 导航按钮 */}
      <div className="flex gap-3">
        <Button
          variant="secondary"
          onClick={onPrev}
          disabled={isFirst}
          className="flex-1"
        >
          &larr; Prev
        </Button>

        {isLast ? (
          <Button
            variant="primary"
            onClick={onFinish}
            className="flex-1"
          >
            Finish Round
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={onNext}
            className="flex-1"
          >
            Next &rarr;
          </Button>
        )}
      </div>
    </div>
  );
}

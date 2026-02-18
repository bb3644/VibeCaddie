"use client";

import { useState } from "react";
import { HazardEditor } from "./hazard-editor";
import type { HoleHazard } from "@/lib/db/types";

interface HoleRowProps {
  holeNumber: number;
  par: number;
  yardage: number;
  holeNote: string;
  /** 数据库中的洞 ID，未保存时为 null */
  holeId: string | null;
  hazards: HoleHazard[];
  onChange: (data: {
    par: number;
    yardage: number;
    holeNote: string;
  }) => void;
  onHazardsChange: (hazards: HoleHazard[]) => void;
}

const PAR_OPTIONS = [3, 4, 5];

/** 单个球洞行：Par 切换 + 码数输入 + 备注 + 障碍物 */
export function HoleRow({
  holeNumber,
  par,
  yardage,
  holeNote,
  holeId,
  hazards,
  onChange,
  onHazardsChange,
}: HoleRowProps) {
  const [showNote, setShowNote] = useState(!!holeNote);

  return (
    <div className="flex flex-col gap-2 py-3 border-b border-divider last:border-b-0">
      {/* 主行：Hole# | Par toggles | Yardage | Note toggle */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* 洞号 */}
        <span className="text-[0.9375rem] font-semibold text-text w-12 shrink-0">
          #{holeNumber}
        </span>

        {/* Par 选择 */}
        <div className="flex items-center gap-1">
          <span className="text-[0.8125rem] text-secondary mr-1">Par</span>
          {PAR_OPTIONS.map((p) => (
            <button
              key={p}
              onClick={() => onChange({ par: p, yardage, holeNote })}
              className={`
                min-w-[44px] min-h-[44px] rounded-md
                text-[0.9375rem] font-medium transition-colors cursor-pointer
                ${
                  par === p
                    ? "bg-accent text-white"
                    : "bg-white border border-divider text-text hover:bg-gray-50"
                }
              `}
            >
              {p}
            </button>
          ))}
        </div>

        {/* 码数输入 */}
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={yardage || ""}
            onChange={(e) =>
              onChange({
                par,
                yardage: parseInt(e.target.value, 10) || 0,
                holeNote,
              })
            }
            placeholder="yds"
            className="w-20 rounded-md border border-divider px-2.5 py-2.5 text-[0.9375rem] text-text placeholder:text-secondary outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>

        {/* 备注切换按钮 */}
        <button
          onClick={() => setShowNote(!showNote)}
          className={`
            min-w-[44px] min-h-[44px] rounded-md flex items-center justify-center
            transition-colors cursor-pointer
            ${showNote ? "text-accent" : "text-secondary hover:text-text"}
          `}
          title={showNote ? "Hide note" : "Add note"}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M3 13.5V15H4.5L12.06 7.44L10.56 5.94L3 13.5ZM14.46 5.04C14.61 4.89 14.61 4.64 14.46 4.49L13.01 3.04C12.86 2.89 12.61 2.89 12.46 3.04L11.69 3.81L13.19 5.31L14.46 5.04Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>

      {/* 备注输入 */}
      {showNote && (
        <div className="ml-12">
          <input
            type="text"
            value={holeNote}
            onChange={(e) =>
              onChange({ par, yardage, holeNote: e.target.value })
            }
            placeholder="Hole note..."
            className="w-full rounded-md border border-divider px-2.5 py-2 text-[0.8125rem] text-text placeholder:text-secondary outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>
      )}

      {/* 障碍物编辑器 */}
      <div className="ml-12">
        <HazardEditor
          holeId={holeId}
          hazards={hazards}
          onHazardsChange={onHazardsChange}
        />
      </div>
    </div>
  );
}

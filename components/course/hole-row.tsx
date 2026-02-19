"use client";

import { useState } from "react";
import { HazardEditor } from "./hazard-editor";
import type { HoleHazard } from "@/lib/db/types";

interface HoleRowProps {
  holeNumber: number;
  par: number;
  yardage: number;
  si: number;
  holeNote: string;
  /** 数据库中的洞 ID，未保存时为 null */
  holeId: string | null;
  hazards: HoleHazard[];
  onChange: (data: {
    par: number;
    yardage: number;
    si: number;
    holeNote: string;
  }) => void;
  onHazardsChange: (hazards: HoleHazard[]) => void;
}

const PAR_OPTIONS = [3, 4, 5];

/** 单个球洞行：Hole# → Par → Yards → SI → Note → Hazards */
export function HoleRow({
  holeNumber,
  par,
  yardage,
  si,
  holeNote,
  holeId,
  hazards,
  onChange,
  onHazardsChange,
}: HoleRowProps) {
  const [showNote, setShowNote] = useState(!!holeNote);

  return (
    <div className="flex flex-col gap-2 py-3 border-b border-divider last:border-b-0">
      {/* 主行：Hole# | Par toggles | Yardage | SI | Note toggle */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* 洞号 */}
        <span className="text-[0.9375rem] font-semibold text-text w-10 shrink-0">
          #{holeNumber}
        </span>

        {/* Par 选择 */}
        <div className="flex items-center gap-1">
          <span className="text-[0.75rem] text-secondary mr-0.5">Par</span>
          {PAR_OPTIONS.map((p) => (
            <button
              key={p}
              onClick={() => onChange({ par: p, yardage, si, holeNote })}
              className={`
                w-9 h-9 rounded-md
                text-[0.875rem] font-medium transition-colors cursor-pointer
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
          <span className="text-[0.75rem] text-secondary">Yds</span>
          <input
            type="number"
            value={yardage || ""}
            onChange={(e) =>
              onChange({
                par,
                yardage: parseInt(e.target.value, 10) || 0,
                si,
                holeNote,
              })
            }
            placeholder="—"
            className="w-16 rounded-md border border-divider px-2 py-2 text-[0.875rem] text-text text-center placeholder:text-secondary outline-none focus:border-accent focus:ring-1 focus:ring-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        {/* Stroke Index 输入 */}
        <div className="flex items-center gap-1">
          <span className="text-[0.75rem] text-secondary">SI</span>
          <input
            type="number"
            min={1}
            max={18}
            value={si || ""}
            onChange={(e) =>
              onChange({
                par,
                yardage,
                si: parseInt(e.target.value, 10) || 0,
                holeNote,
              })
            }
            placeholder="—"
            className="w-14 rounded-md border border-divider px-2 py-2 text-[0.875rem] text-text text-center placeholder:text-secondary outline-none focus:border-accent focus:ring-1 focus:ring-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        {/* 备注切换按钮 */}
        <button
          onClick={() => setShowNote(!showNote)}
          className={`
            w-9 h-9 rounded-md flex items-center justify-center
            transition-colors cursor-pointer
            ${showNote ? "text-accent" : "text-secondary hover:text-text"}
          `}
          title={showNote ? "Hide note" : "Add note"}
        >
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
            <path
              d="M3 13.5V15H4.5L12.06 7.44L10.56 5.94L3 13.5ZM14.46 5.04C14.61 4.89 14.61 4.64 14.46 4.49L13.01 3.04C12.86 2.89 12.61 2.89 12.46 3.04L11.69 3.81L13.19 5.31L14.46 5.04Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>

      {/* 备注输入 */}
      {showNote && (
        <div className="ml-10">
          <input
            type="text"
            value={holeNote}
            onChange={(e) =>
              onChange({ par, yardage, si, holeNote: e.target.value })
            }
            placeholder="Hole note..."
            className="w-full rounded-md border border-divider px-2.5 py-2 text-[0.8125rem] text-text placeholder:text-secondary outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>
      )}

      {/* 障碍物 — Save 后解锁 */}
      <div className="ml-10">
        <HazardEditor
          holeId={holeId}
          hazards={hazards}
          onHazardsChange={onHazardsChange}
        />
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  HAZARD_SIDES,
  HAZARD_TYPES,
  type HazardSide,
  type HazardType,
} from "@/lib/constants/clubs";
import type { HoleHazard } from "@/lib/db/types";

/** 障碍方向展示标签 */
const SIDE_LABELS: Record<HazardSide, string> = {
  L: "Left",
  R: "Right",
  C: "Center",
};

/** 障碍类型展示标签 */
const TYPE_LABELS: Record<HazardType, string> = {
  water: "Water",
  bunker: "Bunker",
  trees: "Trees",
  OOB: "OOB",
};

/* ============================
 * 显示模式：展示已有障碍物
 * ============================ */

interface HazardDisplayProps {
  hazard: HoleHazard;
  onDelete: (id: string) => void;
}

export function HazardDisplay({ hazard, onDelete }: HazardDisplayProps) {
  const label = `${TYPE_LABELS[hazard.type]} ${SIDE_LABELS[hazard.side]}`;
  const yards =
    hazard.start_yards != null && hazard.end_yards != null
      ? ` ${hazard.start_yards}–${hazard.end_yards}`
      : hazard.start_yards != null
        ? ` ${hazard.start_yards}+`
        : "";

  return (
    <span className="inline-flex items-center gap-1.5 text-[0.8125rem] text-secondary bg-bg rounded px-2 py-1">
      <span>
        {label}
        {yards}
      </span>
      {hazard.note && (
        <span className="text-secondary/70" title={hazard.note}>
          ({hazard.note})
        </span>
      )}
      <button
        onClick={() => onDelete(hazard.id)}
        className="ml-1 text-secondary hover:text-red-500 transition-colors cursor-pointer"
        title="Delete hazard"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M4 4L10 10M10 4L4 10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </span>
  );
}

/* ============================
 * 添加模式：内联新增表单
 * ============================ */

interface HazardAddFormProps {
  onAdd: (data: {
    side: HazardSide;
    type: HazardType;
    start_yards?: number;
    end_yards?: number;
    note?: string;
  }) => void;
  onCancel: () => void;
}

export function HazardAddForm({ onAdd, onCancel }: HazardAddFormProps) {
  const [side, setSide] = useState<HazardSide>("L");
  const [type, setType] = useState<HazardType>("water");
  const [startYards, setStartYards] = useState("");
  const [endYards, setEndYards] = useState("");
  const [note, setNote] = useState("");

  function handleSubmit() {
    onAdd({
      side,
      type,
      start_yards: startYards ? parseInt(startYards, 10) : undefined,
      end_yards: endYards ? parseInt(endYards, 10) : undefined,
      note: note.trim() || undefined,
    });
  }

  return (
    <div className="flex flex-col gap-2 p-3 bg-bg rounded-lg border border-divider">
      {/* Side 选择 */}
      <div className="flex items-center gap-2">
        <span className="text-[0.8125rem] text-secondary w-10 shrink-0">
          Side
        </span>
        <div className="flex gap-1">
          {HAZARD_SIDES.map((s) => (
            <button
              key={s}
              onClick={() => setSide(s)}
              className={`
                min-w-[44px] min-h-[36px] rounded-md px-2.5 py-1.5
                text-[0.8125rem] font-medium transition-colors cursor-pointer
                ${
                  side === s
                    ? "bg-accent text-white"
                    : "bg-white border border-divider text-text hover:bg-gray-50"
                }
              `}
            >
              {SIDE_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Type 选择 */}
      <div className="flex items-center gap-2">
        <span className="text-[0.8125rem] text-secondary w-10 shrink-0">
          Type
        </span>
        <div className="flex gap-1 flex-wrap">
          {HAZARD_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`
                min-w-[44px] min-h-[36px] rounded-md px-2.5 py-1.5
                text-[0.8125rem] font-medium transition-colors cursor-pointer
                ${
                  type === t
                    ? "bg-accent text-white"
                    : "bg-white border border-divider text-text hover:bg-gray-50"
                }
              `}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Yards + Note */}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="number"
          value={startYards}
          onChange={(e) => setStartYards(e.target.value)}
          placeholder="from yds"
          className="w-20 rounded-md border border-divider px-2 py-1.5 text-[0.8125rem] text-text placeholder:text-secondary outline-none focus:border-accent"
        />
        <span className="text-secondary text-[0.8125rem]">–</span>
        <input
          type="number"
          value={endYards}
          onChange={(e) => setEndYards(e.target.value)}
          placeholder="to yds"
          className="w-20 rounded-md border border-divider px-2 py-1.5 text-[0.8125rem] text-text placeholder:text-secondary outline-none focus:border-accent"
        />
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="flex-1 min-w-[100px] rounded-md border border-divider px-2 py-1.5 text-[0.8125rem] text-text placeholder:text-secondary outline-none focus:border-accent"
        />
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2 mt-1">
        <Button onClick={handleSubmit} className="text-[0.8125rem] !min-h-[36px] !py-1.5">
          Add
        </Button>
        <Button
          variant="ghost"
          onClick={onCancel}
          className="text-[0.8125rem] !min-h-[36px] !py-1.5"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

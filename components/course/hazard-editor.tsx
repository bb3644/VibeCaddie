"use client";

import { useState } from "react";
import { HazardDisplay, HazardAddForm } from "./hazard-row";
import type { HoleHazard } from "@/lib/db/types";
import type { HazardSide, HazardType } from "@/lib/constants/clubs";

interface HazardEditorProps {
  /** 球洞在数据库的 ID（已保存的洞才有） */
  holeId: string | null;
  hazards: HoleHazard[];
  onHazardsChange: (hazards: HoleHazard[]) => void;
}

/** 单个球洞的障碍物编辑器：展示列表 + 内联新增表单 */
export function HazardEditor({
  holeId,
  hazards,
  onHazardsChange,
}: HazardEditorProps) {
  const [showForm, setShowForm] = useState(false);

  async function handleAdd(data: {
    side: HazardSide;
    type: HazardType;
    start_yards?: number;
    end_yards?: number;
    note?: string;
  }) {
    if (!holeId) return;

    try {
      const res = await fetch(`/api/courses/holes/${holeId}/hazards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const newHazard = (await res.json()) as HoleHazard;
        onHazardsChange([...hazards, newHazard]);
        setShowForm(false);
      }
    } catch {
      // 网络错误静默处理
    }
  }

  async function handleDelete(hazardId: string) {
    if (!holeId) return;

    try {
      const res = await fetch(
        `/api/courses/holes/${holeId}/hazards?id=${hazardId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        onHazardsChange(hazards.filter((h) => h.id !== hazardId));
      }
    } catch {
      // 网络错误静默处理
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* 已有障碍物列表 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[0.8125rem] text-secondary">Hazards:</span>
        {hazards.length === 0 && !showForm && (
          <span className="text-[0.8125rem] text-secondary/60">none</span>
        )}
        {hazards.map((h) => (
          <HazardDisplay key={h.id} hazard={h} onDelete={handleDelete} />
        ))}

        {/* 添加按钮 */}
        {!showForm && holeId && (
          <button
            onClick={() => setShowForm(true)}
            className="text-[0.8125rem] text-accent font-medium hover:underline cursor-pointer"
          >
            + Add Hazard
          </button>
        )}

        {/* 未保存洞的提示 */}
        {!holeId && (
          <span className="text-[0.75rem] text-secondary/60 italic">
            Add hazards after saving.
          </span>
        )}
      </div>

      {/* 内联新增表单 */}
      {showForm && (
        <HazardAddForm onAdd={handleAdd} onCancel={() => setShowForm(false)} />
      )}
    </div>
  );
}

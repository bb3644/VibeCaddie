"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HoleRow } from "./hole-row";
import type { CourseHole, HoleHazard } from "@/lib/db/types";

const TOTAL_HOLES = 18;

interface HoleState {
  par: number;
  yardage: number;
  holeNote: string;
  /** 数据库中的 ID，未保存时为 null */
  holeId: string | null;
  hazards: HoleHazard[];
}

function defaultHoles(): HoleState[] {
  return Array.from({ length: TOTAL_HOLES }, () => ({
    par: 4,
    yardage: 0,
    holeNote: "",
    holeId: null,
    hazards: [],
  }));
}

interface HoleEditorProps {
  courseId: string;
  teeId: string;
}

/** 球洞编辑器：18洞列表 + Quick Fill + Save All */
export function HoleEditor({ courseId, teeId }: HoleEditorProps) {
  const [holes, setHoles] = useState<HoleState[]>(defaultHoles);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quickFill, setQuickFill] = useState("");
  const [feedback, setFeedback] = useState("");

  // 加载已有球洞数据
  const loadHoles = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/courses/${courseId}/tees/${teeId}/holes`
      );
      if (!res.ok) return;

      const dbHoles = (await res.json()) as CourseHole[];
      if (dbHoles.length === 0) return;

      // 合并数据库数据到本地状态
      const merged = defaultHoles();
      for (const dh of dbHoles) {
        const idx = dh.hole_number - 1;
        if (idx >= 0 && idx < TOTAL_HOLES) {
          merged[idx] = {
            par: dh.par,
            yardage: dh.yardage,
            holeNote: dh.hole_note ?? "",
            holeId: dh.id,
            hazards: [],
          };
        }
      }

      // 并行加载所有球洞的障碍物
      const hazardPromises = merged.map(async (h) => {
        if (!h.holeId) return [];
        try {
          const hRes = await fetch(
            `/api/courses/holes/${h.holeId}/hazards`
          );
          if (hRes.ok) return (await hRes.json()) as HoleHazard[];
        } catch {
          // 加载失败返回空
        }
        return [];
      });

      const allHazards = await Promise.all(hazardPromises);
      for (let i = 0; i < merged.length; i++) {
        merged[i].hazards = allHazards[i];
      }

      setHoles(merged);
    } catch {
      // 加载失败保持默认
    } finally {
      setLoading(false);
    }
  }, [courseId, teeId]);

  useEffect(() => {
    loadHoles();
  }, [loadHoles]);

  // Quick Fill：粘贴逗号分隔的 par 值
  function handleQuickFill() {
    const pars = quickFill
      .split(/[,，\s]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));

    if (pars.length === 0) return;

    setHoles((prev) => {
      const next = [...prev];
      for (let i = 0; i < Math.min(pars.length, TOTAL_HOLES); i++) {
        next[i] = { ...next[i], par: pars[i] };
      }
      return next;
    });
    setQuickFill("");
    setFeedback(`Filled ${Math.min(pars.length, TOTAL_HOLES)} holes pars.`);
    setTimeout(() => setFeedback(""), 2000);
  }

  // Save All：批量 upsert
  async function handleSave() {
    setSaving(true);
    setFeedback("");

    try {
      const payload = holes.map((h, i) => ({
        hole_number: i + 1,
        par: h.par,
        yardage: h.yardage,
        hole_note: h.holeNote || undefined,
      }));

      const res = await fetch(
        `/api/courses/${courseId}/tees/${teeId}/holes`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ holes: payload }),
        }
      );

      if (res.ok) {
        const saved = (await res.json()) as CourseHole[];
        // 更新本地 holeId（用于后续添加障碍物）
        setHoles((prev) => {
          const next = [...prev];
          for (const s of saved) {
            const idx = s.hole_number - 1;
            if (idx >= 0 && idx < TOTAL_HOLES) {
              next[idx] = { ...next[idx], holeId: s.id };
            }
          }
          return next;
        });
        setFeedback("All holes saved successfully!");
      } else {
        setFeedback("Failed to save. Please try again.");
      }
    } catch {
      setFeedback("Network error. Please try again.");
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(""), 3000);
    }
  }

  // 更新单个洞
  function handleHoleChange(
    index: number,
    data: { par: number; yardage: number; holeNote: string }
  ) {
    setHoles((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...data };
      return next;
    });
  }

  // 更新单个洞的障碍物
  function handleHazardsChange(index: number, hazards: HoleHazard[]) {
    setHoles((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], hazards };
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-secondary text-[0.9375rem]">Loading holes...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Quick Fill + Save All */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={quickFill}
              onChange={(e) => setQuickFill(e.target.value)}
              placeholder="Quick fill pars: 4,3,4,5,4,4,3,4,4..."
              className="flex-1 rounded-md border border-divider px-3 py-2.5 text-[0.9375rem] text-text placeholder:text-secondary outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
            <Button
              variant="secondary"
              onClick={handleQuickFill}
              disabled={!quickFill.trim()}
            >
              Fill
            </Button>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save All"}
          </Button>
        </div>

        {/* 反馈消息 */}
        {feedback && (
          <p
            className={`mt-2 text-[0.8125rem] ${
              feedback.includes("success") || feedback.includes("Filled")
                ? "text-accent"
                : "text-red-500"
            }`}
          >
            {feedback}
          </p>
        )}
      </Card>

      {/* 球洞列表 */}
      <Card className="!p-3">
        {holes.map((hole, i) => (
          <HoleRow
            key={i}
            holeNumber={i + 1}
            par={hole.par}
            yardage={hole.yardage}
            holeNote={hole.holeNote}
            holeId={hole.holeId}
            hazards={hole.hazards}
            onChange={(data) => handleHoleChange(i, data)}
            onHazardsChange={(hazards) => handleHazardsChange(i, hazards)}
          />
        ))}
      </Card>

      {/* 底部 Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save All"}
        </Button>
      </div>
    </div>
  );
}

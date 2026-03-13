"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HoleRow } from "./hole-row";
import { Scorecard } from "./scorecard";
import type { CourseHole, OfficialHoleNote } from "@/lib/db/types";

const TOTAL_HOLES = 18;

interface HoleState {
  par: number;
  yardage: number;
  si: number;
  holeNote: string;
  holeId: string | null;
}

function defaultHoles(): HoleState[] {
  return Array.from({ length: TOTAL_HOLES }, () => ({
    par: 4,
    yardage: 0,
    si: 0,
    holeNote: "",
    holeId: null,
  }));
}

interface OcrHole {
  hole_number: number;
  par: number;
  yardage: number;
  si?: number;
  hole_note?: string;
}

interface HoleEditorProps {
  courseId: string;
  teeId: string;
  onFinish?: () => void;
  fillFromOcr?: OcrHole[] | null;
}

/** 球洞编辑器：18洞列表 + Save All */
export function HoleEditor({ courseId, teeId, onFinish, fillFromOcr }: HoleEditorProps) {
  const [holes, setHoles] = useState<HoleState[]>(defaultHoles);
  const [officialNotes, setOfficialNotes] = useState<Record<number, OfficialHoleNote>>({});
  const prevFillRef = useRef<OcrHole[] | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  // Merge OCR data into holes whenever fillFromOcr changes
  useEffect(() => {
    if (!fillFromOcr || fillFromOcr === prevFillRef.current) return;
    prevFillRef.current = fillFromOcr;
    setHoles((prev) => {
      const next = [...prev];
      for (const ocrHole of fillFromOcr) {
        const idx = ocrHole.hole_number - 1;
        if (idx < 0 || idx >= TOTAL_HOLES) continue;
        next[idx] = {
          ...next[idx],
          par: ocrHole.par,
          yardage: ocrHole.yardage,
          si: ocrHole.si ?? next[idx].si,
          holeNote: ocrHole.hole_note ?? next[idx].holeNote,
        };
      }
      return next;
    });
  }, [fillFromOcr]);

  const loadHoles = useCallback(async () => {
    try {
      const [holesRes, notesRes] = await Promise.all([
        fetch(`/api/courses/${courseId}/tees/${teeId}/holes`),
        fetch(`/api/courses/${courseId}/official-notes`),
      ]);

      if (notesRes.ok) {
        const notes = (await notesRes.json()) as Record<number, OfficialHoleNote>;
        setOfficialNotes(notes);
      }

      if (!holesRes.ok) return;
      const dbHoles = (await holesRes.json()) as CourseHole[];
      if (dbHoles.length === 0) return;

      const merged = defaultHoles();
      for (const dh of dbHoles) {
        const idx = dh.hole_number - 1;
        if (idx >= 0 && idx < TOTAL_HOLES) {
          merged[idx] = {
            par: dh.par,
            yardage: dh.yardage,
            si: (dh as CourseHole & { si?: number }).si ?? 0,
            holeNote: dh.hole_note ?? "",
            holeId: dh.id,
          };
        }
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

  async function handleSave(): Promise<boolean> {
    setSaving(true);
    setFeedback("");

    try {
      const payload = holes.map((h, i) => ({
        hole_number: i + 1,
        par: h.par,
        yardage: h.yardage,
        si: h.si || undefined,
        hole_note: h.holeNote || undefined,
      }));

      const res = await fetch(`/api/courses/${courseId}/tees/${teeId}/holes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holes: payload }),
      });

      if (res.ok) {
        setFeedback("Saved!");
        // Reload to get holeIds assigned
        await loadHoles();
        return true;
      } else {
        setFeedback("Failed to save. Please try again.");
        return false;
      }
    } catch {
      setFeedback("Network error. Please try again.");
      return false;
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(""), 3000);
    }
  }

  async function handleFinish() {
    const success = await handleSave();
    if (success) onFinish?.();
  }

  function handleHoleChange(
    index: number,
    data: { par: number; yardage: number; si: number; holeNote: string }
  ) {
    setHoles((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...data };
      return next;
    });
  }

  function handleOfficialNoteSave(holeNumber: number, note: OfficialHoleNote | null) {
    setOfficialNotes((prev) => {
      const next = { ...prev };
      if (note) {
        next[holeNumber] = note;
      } else {
        delete next[holeNumber];
      }
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
      {/* 记分卡汇总 */}
      <Scorecard holes={holes} />

      {/* 反馈消息 */}
      {feedback && (
        <p
          className={`text-[0.8125rem] ${
            feedback.includes("Saved") ? "text-accent" : "text-red-500"
          }`}
        >
          {feedback}
        </p>
      )}

      {/* 球洞列表 */}
      <Card className="!p-3">
        {holes.map((hole, i) => (
          <HoleRow
            key={i}
            holeNumber={i + 1}
            par={hole.par}
            yardage={hole.yardage}
            si={hole.si}
            holeNote={hole.holeNote}
            holeId={hole.holeId}
            courseId={courseId}
            officialNote={officialNotes[i + 1] ?? null}
            onChange={(data) => handleHoleChange(i, data)}
            onOfficialNoteSave={(note) => handleOfficialNoteSave(i + 1, note)}
          />
        ))}
      </Card>

      {/* 底部操作 */}
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
        {onFinish && (
          <Button onClick={handleFinish} disabled={saving}>
            Finish
          </Button>
        )}
      </div>
    </div>
  );
}

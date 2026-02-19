"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PlannedRoundPicker } from "@/components/round/planned-round-picker";
import { RoundSetup } from "@/components/round/round-setup";
import { HoleEntry } from "@/components/round/hole-entry";
import { HoleEntryNav } from "@/components/round/hole-entry-nav";
import { Card } from "@/components/ui/card";
import type { CourseHole, RoundHole, PlayerBagClub } from "@/lib/db/types";

type RecapMode = "pick" | "manual" | "entry";

export default function NewRoundPage() {
  const router = useRouter();

  // 选择模式：pick（从 plan 中选）、manual（手动选球场）、entry（洞录入）
  const [mode, setMode] = useState<RecapMode>("pick");

  // 轮次创建后的状态
  const [roundId, setRoundId] = useState<string | null>(null);
  const [courseTeeId, setCourseTeeId] = useState<string | null>(null);

  // 洞录入阶段
  const [courseHoles, setCourseHoles] = useState<CourseHole[]>([]);
  const [bagClubs, setBagClubs] = useState<string[]>([]);
  const [currentHole, setCurrentHole] = useState(1);
  const [holesData, setHolesData] = useState<Map<number, RoundHole>>(new Map());
  const [loadingHoles, setLoadingHoles] = useState(false);

  // 创建轮次的状态（用于 planned round 路径）
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // 轮次创建后，加载球洞配置和球包
  useEffect(() => {
    if (!courseTeeId || !roundId) return;

    setLoadingHoles(true);

    fetch("/api/profile/bag")
      .then((res) => (res.ok ? res.json() : []))
      .then((clubs) => {
        const enabledClubs = (clubs as PlayerBagClub[])
          .filter((c) => c.enabled)
          .map((c) => c.club_code);
        setBagClubs(enabledClubs);
      });

    fetch(`/api/rounds/${roundId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.course_holes) {
          setCourseHoles(data.course_holes as CourseHole[]);
        }
      })
      .finally(() => setLoadingHoles(false));
  }, [courseTeeId, roundId]);

  // 从 planned round 选择后，创建 round 并进入录入
  const handleSelectPlanned = useCallback(
    async (briefing: { course_tee_id: string; play_date: string }) => {
      setCreating(true);
      setCreateError("");

      try {
        const res = await fetch("/api/rounds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            course_tee_id: briefing.course_tee_id,
            played_date: briefing.play_date,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setRoundId(data.id);
          setCourseTeeId(briefing.course_tee_id);
          setCurrentHole(1);
          setMode("entry");
        } else {
          const errData = await res.json().catch(() => null);
          setCreateError(errData?.error ?? "Failed to create round.");
        }
      } catch {
        setCreateError("Something went wrong. Please try again.");
      } finally {
        setCreating(false);
      }
    },
    []
  );

  // 手动创建路径完成回调
  const handleManualCreated = useCallback(
    (newRoundId: string, newCourseTeeId: string) => {
      setRoundId(newRoundId);
      setCourseTeeId(newCourseTeeId);
      setCurrentHole(1);
      setMode("entry");
    },
    []
  );

  // 保存洞数据
  const handleHoleSave = useCallback((data: RoundHole) => {
    setHolesData((prev) => {
      const next = new Map(prev);
      next.set(data.hole_number, data);
      return next;
    });
  }, []);

  // 完成轮次
  const handleFinish = useCallback(async () => {
    if (!roundId) return;

    let totalScore = 0;
    let hasScores = false;
    for (const hole of holesData.values()) {
      if (hole.score !== null) {
        totalScore += hole.score;
        hasScores = true;
      }
    }

    if (hasScores) {
      try {
        await fetch(`/api/rounds/${roundId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ total_score: totalScore }),
        });
      } catch {
        // 更新失败也跳转
      }
    }

    router.push(`/rounds/${roundId}`);
  }, [roundId, holesData, router]);

  // ── 选择模式：从已 plan 的 round 中选 ──
  if (mode === "pick") {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-[1.875rem] font-semibold text-text">
            Round Recap
          </h1>
          <p className="text-[0.9375rem] text-secondary mt-1">
            Select a planned round to record your post-round results.
          </p>
        </div>

        {creating ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <div className="w-8 h-8 border-3 border-accent/30 border-t-accent rounded-full animate-spin" />
            <p className="text-[0.9375rem] text-secondary">
              Setting up your recap...
            </p>
          </div>
        ) : (
          <>
            {createError && (
              <p className="text-[0.8125rem] text-red-500 text-center">
                {createError}
              </p>
            )}
            <PlannedRoundPicker
              onSelect={handleSelectPlanned}
              onManual={() => setMode("manual")}
            />
          </>
        )}
      </div>
    );
  }

  // ── 手动模式：搜索球场创建 round ──
  if (mode === "manual") {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => setMode("pick")}
              className="text-accent text-[0.8125rem] font-medium hover:underline cursor-pointer"
            >
              &larr; Back
            </button>
          </div>
          <h1 className="text-[1.875rem] font-semibold text-text">
            Round Recap
          </h1>
          <p className="text-[0.9375rem] text-secondary mt-1">
            Select a course and tee to record your post-round results.
          </p>
        </div>

        <RoundSetup onCreated={handleManualCreated} />
      </div>
    );
  }

  // ── 录入模式：洞 by 洞录入 ──
  if (loadingHoles) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-secondary text-[0.9375rem]">Loading course data...</p>
      </div>
    );
  }

  const totalHoles = courseHoles.length || 18;
  const currentCourseHole = courseHoles.find(
    (ch) => ch.hole_number === currentHole
  );
  const holesWithData = Array.from({ length: totalHoles }, (_, i) =>
    holesData.has(i + 1)
  );

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <HoleEntry
          roundId={roundId!}
          holeNumber={currentHole}
          par={currentCourseHole?.par ?? 4}
          yardage={currentCourseHole?.yardage ?? 0}
          playerBagClubs={bagClubs}
          initialData={holesData.get(currentHole) ?? null}
          onSave={handleHoleSave}
        />
      </Card>

      <HoleEntryNav
        currentHole={currentHole}
        totalHoles={totalHoles}
        holesWithData={holesWithData}
        onPrev={() => setCurrentHole((h) => Math.max(1, h - 1))}
        onNext={() => setCurrentHole((h) => Math.min(totalHoles, h + 1))}
        onFinish={handleFinish}
      />
    </div>
  );
}

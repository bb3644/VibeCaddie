"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RoundSetup } from "@/components/round/round-setup";
import { HoleEntry } from "@/components/round/hole-entry";
import { HoleEntryNav } from "@/components/round/hole-entry-nav";
import { Card } from "@/components/ui/card";
import type { CourseHole, RoundHole, PlayerBagClub } from "@/lib/db/types";

export default function NewRoundPage() {
  const router = useRouter();

  // 设置阶段的状态
  const [roundId, setRoundId] = useState<string | null>(null);
  const [courseTeeId, setCourseTeeId] = useState<string | null>(null);

  // 洞录入阶段的状态
  const [courseHoles, setCourseHoles] = useState<CourseHole[]>([]);
  const [bagClubs, setBagClubs] = useState<string[]>([]);
  const [currentHole, setCurrentHole] = useState(1);
  const [holesData, setHolesData] = useState<Map<number, RoundHole>>(new Map());
  const [loadingHoles, setLoadingHoles] = useState(false);

  // 轮次创建后，加载球洞配置和球包
  useEffect(() => {
    if (!courseTeeId) return;

    setLoadingHoles(true);

    Promise.all([
      // 加载球洞配置
      fetch(`/api/courses/search?q=`).then(() =>
        // 通过轮次详情间接获取球洞配置
        // 这里直接从 courses API 获取
        null
      ),
      // 加载球包
      fetch("/api/profile/bag").then((res) =>
        res.ok ? res.json() : []
      ),
    ]).then(([, clubs]) => {
      const enabledClubs = (clubs as PlayerBagClub[])
        .filter((c) => c.enabled)
        .map((c) => c.club_code);
      setBagClubs(enabledClubs);
    });

    // 通过 tee holes API 获取球洞配置
    // 需要先获取 courseId — 从 round detail API 获取
    if (roundId) {
      fetch(`/api/rounds/${roundId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.course_holes) {
            setCourseHoles(data.course_holes as CourseHole[]);
          }
        })
        .finally(() => setLoadingHoles(false));
    } else {
      setLoadingHoles(false);
    }
  }, [courseTeeId, roundId]);

  // 轮次创建完成回调
  const handleCreated = useCallback((newRoundId: string, newCourseTeeId: string) => {
    setRoundId(newRoundId);
    setCourseTeeId(newCourseTeeId);
    setCurrentHole(1);
  }, []);

  // 保存洞数据回调
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

    // 计算总分
    let totalScore = 0;
    let hasScores = false;
    for (const hole of holesData.values()) {
      if (hole.score !== null) {
        totalScore += hole.score;
        hasScores = true;
      }
    }

    // 如果有分数，更新总分
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

  // 如果还没创建轮次，显示设置界面
  if (!roundId) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-[1.875rem] font-semibold text-text">
            New Round
          </h1>
          <p className="text-[0.9375rem] text-secondary mt-1">
            Select a course and tee to start recording your round.
          </p>
        </div>

        <RoundSetup onCreated={handleCreated} />
      </div>
    );
  }

  // 加载中
  if (loadingHoles) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-secondary text-[0.9375rem]">Loading course data...</p>
      </div>
    );
  }

  // 总洞数
  const totalHoles = courseHoles.length || 18;
  const currentCourseHole = courseHoles.find(
    (ch) => ch.hole_number === currentHole
  );

  // 每个洞是否有数据
  const holesWithData = Array.from({ length: totalHoles }, (_, i) =>
    holesData.has(i + 1)
  );

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <HoleEntry
          roundId={roundId}
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

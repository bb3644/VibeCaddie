"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlannedRoundPicker } from "@/components/round/planned-round-picker";
import { RoundSetup } from "@/components/round/round-setup";
import { HoleEntry, type HoleEntryHandle, type HoleLocalData } from "@/components/round/hole-entry";
import { HoleEntryNav } from "@/components/round/hole-entry-nav";
import { Card } from "@/components/ui/card";
import type { CourseHole, RoundHole, PlayerBagClub } from "@/lib/db/types";

type RecapMode = "pick" | "manual" | "holes-select" | "entry";

function NewRoundContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL 参数：从 briefing 页面跳转时自动传入
  const urlCourseTeeId = searchParams.get("course_tee_id");
  const urlPlayDate = searchParams.get("play_date");
  const urlHolesPlayed = searchParams.get("holes_played");
  const urlStartHole = searchParams.get("start_hole");

  // 选择模式：pick（从 plan 中选）、manual（手动选球场）、entry（洞录入）
  const [mode, setMode] = useState<RecapMode>("pick");

  // 轮次创建后的状态
  const [roundId, setRoundId] = useState<string | null>(null);
  const [courseTeeId, setCourseTeeId] = useState<string | null>(null);

  // 9/18 洞数选择
  const [holesPlayed, setHolesPlayed] = useState<9 | 18>(18);
  const [startHole, setStartHole] = useState<1 | 10>(1);
  // 计划轮次暂存（在选洞数之前）
  const [pendingBriefing, setPendingBriefing] = useState<{ course_tee_id: string; play_date: string } | null>(null);

  // 洞录入阶段
  const [courseHoles, setCourseHoles] = useState<CourseHole[]>([]);
  const [bagClubs, setBagClubs] = useState<string[]>([]);
  const [currentHole, setCurrentHole] = useState(1);
  const [holesData, setHolesData] = useState<Map<number, RoundHole>>(new Map());
  // 本地暂存（API 保存前也能记住数据）
  const [localHolesData, setLocalHolesData] = useState<Map<number, HoleLocalData>>(new Map());
  const [loadingHoles, setLoadingHoles] = useState(false);

  // 用 ref 同步跟踪最新数据，避免 handleFinish 闭包读到过期 state
  const holesDataRef = useRef<Map<number, RoundHole>>(new Map());
  const localHolesDataRef = useRef<Map<number, HoleLocalData>>(new Map());

  // HoleEntry 的 ref，用于切换洞时触发保存
  const holeEntryRef = useRef<HoleEntryHandle>(null);

  // 创建轮次的状态（用于 planned round 路径）
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // 轮次创建后，加载球洞配置和球包
  useEffect(() => {
    if (!courseTeeId || !roundId) return;

    setLoadingHoles(true);

    Promise.all([
      fetch("/api/profile/bag")
        .then((res) => (res.ok ? res.json() : []))
        .then((clubs) => {
          const enabledClubs = (clubs as PlayerBagClub[])
            .filter((c) => c.enabled)
            .map((c) => c.club_code);
          setBagClubs(enabledClubs);
        }),
      fetch(`/api/rounds/${roundId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.course_holes) {
            setCourseHoles(data.course_holes as CourseHole[]);
          }
        }),
    ]).finally(() => setLoadingHoles(false));
  }, [courseTeeId, roundId]);

  // 从 planned round 选择后，先选洞数再创建 round
  // 如果 URL 已带 holes_played/start_hole，直接跳过选择
  const handleSelectPlanned = useCallback(
    async (briefing: { course_tee_id: string; play_date: string }, skipHoleSelect = false) => {
      if (skipHoleSelect) {
        // holes already known from URL params — call confirm directly
        const holes = (urlHolesPlayed === "9" ? 9 : 18) as 9 | 18;
        const start = (urlStartHole === "10" ? 10 : 1) as 1 | 10;
        setPendingBriefing(briefing);
        // defer so pendingBriefing state is set first
        setTimeout(() => {
          setHolesPlayed(holes);
          setStartHole(start);
        }, 0);
        // Create round immediately via confirm flow
        setCreating(true);
        setCreateError("");
        try {
          const res = await fetch("/api/rounds", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              course_tee_id: briefing.course_tee_id,
              played_date: briefing.play_date,
              holes_played: holes,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            setRoundId(data.id);
            setCourseTeeId(briefing.course_tee_id);
            setHolesPlayed(holes);
            setStartHole(start);
            setCurrentHole(start);
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
        return;
      }
      setPendingBriefing(briefing);
      setMode("holes-select");
    },
    [urlHolesPlayed, urlStartHole]
  );

  // 确认洞数后创建 round（适用于 planned 和 URL 参数路径）
  const handleConfirmHolesAndCreate = useCallback(
    async (holes: 9 | 18, start: 1 | 10) => {
      if (!pendingBriefing) return;
      setHolesPlayed(holes);
      setStartHole(start);
      setCreating(true);
      setCreateError("");

      try {
        const res = await fetch("/api/rounds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            course_tee_id: pendingBriefing.course_tee_id,
            played_date: pendingBriefing.play_date,
            holes_played: holes,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setRoundId(data.id);
          setCourseTeeId(pendingBriefing.course_tee_id);
          setCurrentHole(start);
          setMode("entry");
        } else {
          const errData = await res.json().catch(() => null);
          setCreateError(errData?.error ?? "Failed to create round.");
          setMode("pick");
        }
      } catch {
        setCreateError("Something went wrong. Please try again.");
        setMode("pick");
      } finally {
        setCreating(false);
      }
    },
    [pendingBriefing]
  );

  // 从 URL 参数自动创建 round（从 briefing 页面跳转时）
  const autoCreatedRef = useRef(false);
  useEffect(() => {
    if (!urlCourseTeeId || !urlPlayDate || autoCreatedRef.current) return;
    autoCreatedRef.current = true;
    const hasHoleParams = !!urlHolesPlayed;
    handleSelectPlanned({ course_tee_id: urlCourseTeeId, play_date: urlPlayDate }, hasHoleParams);
  }, [urlCourseTeeId, urlPlayDate, urlHolesPlayed, handleSelectPlanned]);

  // 手动创建路径完成回调
  const handleManualCreated = useCallback(
    (newRoundId: string, newCourseTeeId: string, holes: 9 | 18 = 18, start: 1 | 10 = 1) => {
      setRoundId(newRoundId);
      setCourseTeeId(newCourseTeeId);
      setHolesPlayed(holes);
      setStartHole(start);
      setCurrentHole(start);
      setMode("entry");
    },
    []
  );

  // API 保存成功回调 — 立即更新 ref，然后更新 state
  const handleHoleSave = useCallback((data: RoundHole) => {
    const next = new Map(holesDataRef.current);
    next.set(data.hole_number, data);
    holesDataRef.current = next;
    setHolesData(next);
  }, []);

  // 本地暂存回调（切换洞前总是触发）— 立即更新 ref，然后更新 state
  const handleLocalChange = useCallback((data: HoleLocalData) => {
    const next = new Map(localHolesDataRef.current);
    next.set(data.hole_number, data);
    localHolesDataRef.current = next;
    setLocalHolesData(next);
  }, []);

  // 切换到上一洞（先保存当前洞）
  const handlePrev = useCallback(async () => {
    await holeEntryRef.current?.save();
    setCurrentHole((h) => Math.max(startHole, h - 1));
  }, [startHole]);

  // 切换到下一洞（先保存当前洞）
  const handleNext = useCallback(async () => {
    await holeEntryRef.current?.save();
    setCurrentHole((h) => Math.min(startHole + holesPlayed - 1, h + 1));
  }, [startHole, holesPlayed]);

  // 直接跳转到指定洞（先保存当前洞）
  const handleJumpTo = useCallback(async (holeNum: number) => {
    await holeEntryRef.current?.save();
    setCurrentHole(holeNum);
  }, []);

  // 完成轮次（保存所有未存的洞 + 当前洞）
  // 用 ref 读取最新数据，避免闭包读到过期 state
  const handleFinish = useCallback(async () => {
    if (!roundId) return;

    // 1. 先保存当前洞（会同步更新 ref）
    await holeEntryRef.current?.save();

    // 2. 从 ref 读取最新本地数据
    const latestLocal = localHolesDataRef.current;
    const latestApi = holesDataRef.current;

    // 诊断：打印所有本地数据
    console.warn("[VibeCaddie] handleFinish — localHolesData size:", latestLocal.size);
    console.warn("[VibeCaddie] handleFinish — holesData (API) size:", latestApi.size);
    for (const [num, local] of latestLocal.entries()) {
      console.warn(`[VibeCaddie]   Hole ${num}: tee_club="${local.tee_club}", tee_result="${local.tee_result}", score=${local.score}`);
    }

    // 3. 全量 upsert 所有有数据的洞（API 会为空 tee_club/tee_result 提供默认值）
    const savePromises: Promise<{ hole: number; ok: boolean; status?: number }>[] = [];

    for (const [, local] of latestLocal.entries()) {
      savePromises.push(
        fetch(`/api/rounds/${roundId}/holes`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hole_number:        local.hole_number,
            tee_club:           local.tee_club          || undefined,
            tee_result:         local.tee_result        || undefined,
            approach_club:      local.approach_club     || undefined,
            approach_distance:  local.approach_distance || undefined,
            approach_direction: local.approach_direction || undefined,
            approach_yardage:   local.approach_yardage  ?? undefined,
            up_down:            local.up_down           ?? undefined,
            recovery_club:      local.recovery_club     || undefined,
            hole_notes:         local.hole_notes        || undefined,
            score:          local.score,
            putts:          local.putts,
            bunker_count:   local.bunker_count,
            water_count:    local.water_count,
            penalty_count:  local.penalty_count,
          }),
        }).then(
          (res) => ({ hole: local.hole_number, ok: res.ok, status: res.status }),
          () => ({ hole: local.hole_number, ok: false, status: 0 })
        )
      );
    }

    const results = await Promise.all(savePromises);
    const failed = results.filter((r) => !r.ok);

    if (failed.length > 0) {
      console.error(`[VibeCaddie] FAILED holes:`, failed);
    }
    console.warn(`[VibeCaddie] Batch save: ${results.length - failed.length}/${results.length} OK`);

    // 4. 计算总杆数
    let totalScore = 0;
    let hasScores = false;
    const allHoleNums = new Set([...latestApi.keys(), ...latestLocal.keys()]);
    for (const num of allHoleNums) {
      const s = latestApi.get(num)?.score ?? latestLocal.get(num)?.score;
      if (s !== null && s !== undefined) {
        totalScore += s;
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
  }, [roundId, router]);

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

  // ── 洞数选择模式（planned round 路径）──
  if (mode === "holes-select") {
    const HOLE_OPTIONS = [
      { holesPlayed: 18 as const, startHole: 1 as const,  label: "Full 18",  sub: "Holes 1–18" },
      { holesPlayed: 9  as const, startHole: 1 as const,  label: "Front 9",  sub: "Holes 1–9" },
      { holesPlayed: 9  as const, startHole: 10 as const, label: "Back 9",   sub: "Holes 10–18" },
    ];
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-[1.875rem] font-semibold text-text">How many holes?</h1>
          <p className="text-[0.9375rem] text-secondary mt-1">
            Select the number of holes you played.
          </p>
        </div>
        {creating ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <div className="w-8 h-8 border-3 border-accent/30 border-t-accent rounded-full animate-spin" />
            <p className="text-[0.9375rem] text-secondary">Setting up your recap...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {createError && (
              <p className="text-[0.8125rem] text-red-500 text-center">{createError}</p>
            )}
            {HOLE_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                onClick={() => handleConfirmHolesAndCreate(opt.holesPlayed, opt.startHole)}
                className="flex items-center gap-4 w-full rounded-xl px-5 py-4 border border-divider bg-card hover:bg-bg hover:border-accent transition-colors duration-150 cursor-pointer text-left"
              >
                <div className="flex flex-col">
                  <span className="text-[1rem] font-semibold text-text">{opt.label}</span>
                  <span className="text-[0.875rem] text-secondary">{opt.sub}</span>
                </div>
                <svg className="w-5 h-5 text-secondary ml-auto shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
            <button
              onClick={() => setMode("pick")}
              className="text-accent text-[0.8125rem] font-medium hover:underline cursor-pointer text-center mt-1"
            >
              &larr; Back
            </button>
          </div>
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

  const totalHoles = holesPlayed;
  const currentCourseHole = courseHoles.find(
    (ch) => ch.hole_number === currentHole
  );
  const holesWithData = Array.from({ length: totalHoles }, (_, i) =>
    holesData.has(startHole + i) || localHolesData.has(startHole + i)
  );

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <HoleEntry
          ref={holeEntryRef}
          roundId={roundId!}
          holeNumber={currentHole}
          par={currentCourseHole?.par ?? 4}
          yardage={currentCourseHole?.yardage ?? 0}
          playerBagClubs={bagClubs}
          initialData={holesData.get(currentHole) ?? null}
          localData={localHolesData.get(currentHole) ?? null}
          onSave={handleHoleSave}
          onLocalChange={handleLocalChange}
        />
      </Card>

      <HoleEntryNav
        currentHole={currentHole}
        totalHoles={totalHoles}
        startHole={startHole}
        holesWithData={holesWithData}
        onPrev={handlePrev}
        onNext={handleNext}
        onFinish={handleFinish}
        onJumpTo={handleJumpTo}
      />
    </div>
  );
}

export default function NewRoundPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <p className="text-secondary text-[0.9375rem]">Loading...</p>
        </div>
      }
    >
      <NewRoundContent />
    </Suspense>
  );
}

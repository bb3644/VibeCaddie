"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { Stepper } from "@/components/ui/stepper";
import { Button } from "@/components/ui/button";
import type { RoundHole } from "@/lib/db/types";

/** Drive result 按钮样式 */
const RESULT_STYLES: Record<
  string,
  { base: string; selected: string }
> = {
  FW: {
    base: "bg-green-50 text-green-700 border-green-200",
    selected: "bg-green-600 text-white border-green-600",
  },
  L: {
    base: "bg-amber-50 text-amber-700 border-amber-200",
    selected: "bg-amber-500 text-white border-amber-500",
  },
  R: {
    base: "bg-amber-50 text-amber-700 border-amber-200",
    selected: "bg-amber-500 text-white border-amber-500",
  },
  PEN: {
    base: "bg-red-50 text-red-700 border-red-200",
    selected: "bg-red-500 text-white border-red-500",
  },
};

const TEE_RESULTS = ["FW", "L", "R", "PEN"] as const;

export interface HoleEntryHandle {
  /** 切换洞前调用：先保本地状态，能存 API 就存 */
  save: () => Promise<void>;
}

/** 本地暂存数据（不需要完整字段也能存） */
export interface HoleLocalData {
  hole_number: number;
  clubs_used: string[];
  tee_club: string;
  tee_result: string;
  score: number;
  putts: number;
  gir: boolean | null;
}

interface HoleEntryProps {
  roundId: string;
  holeNumber: number;
  par: number;
  yardage: number;
  playerBagClubs: string[];
  initialData?: RoundHole | null;
  /** 本地暂存的数据（用于切换洞后恢复） */
  localData?: HoleLocalData | null;
  /** API 保存成功后回调 */
  onSave?: (data: RoundHole) => void;
  /** 本地状态变更回调（总是触发，用于暂存） */
  onLocalChange?: (data: HoleLocalData) => void;
}

/** 单洞录入组件 — 主交互界面 */
export const HoleEntry = forwardRef<HoleEntryHandle, HoleEntryProps>(
  function HoleEntry(
    { roundId, holeNumber, par, yardage, playerBagClubs, initialData, localData, onSave, onLocalChange },
    ref
  ) {
    // 优先用本地暂存，其次用 API 数据，最后用默认值
    const initClubs = localData?.clubs_used
      ?? initialData?.clubs_used
      ?? (initialData?.tee_club ? [initialData.tee_club] : []);
    const initTeeResult = localData?.tee_result ?? initialData?.tee_result ?? "";
    const initScore = localData?.score ?? initialData?.score ?? par;
    const initPutts = localData?.putts ?? initialData?.putts ?? 2;
    const initGir = localData?.gir ?? initialData?.gir ?? null;

    const [clubsUsed, setClubsUsed] = useState<string[]>(initClubs);
    const [teeResult, setTeeResult] = useState<string>(initTeeResult);
    const [score, setScore] = useState<number>(initScore);
    const [putts, setPutts] = useState<number>(initPutts);
    const [gir, setGir] = useState<boolean | null>(initGir);

    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // 切换洞号时重置
    useEffect(() => {
      const clubs = localData?.clubs_used
        ?? initialData?.clubs_used
        ?? (initialData?.tee_club ? [initialData.tee_club] : []);
      setClubsUsed(clubs);
      setTeeResult(localData?.tee_result ?? initialData?.tee_result ?? "");
      setScore(localData?.score ?? initialData?.score ?? par);
      setPutts(localData?.putts ?? initialData?.putts ?? 2);
      setGir(localData?.gir ?? initialData?.gir ?? null);
      setSaved(false);
    }, [initialData, localData, holeNumber, par]);

    const teeClub = clubsUsed[0] ?? "";

    // 过滤掉 Putter
    const selectableClubs = playerBagClubs.filter((c) => c !== "Putter");

    function addClub(club: string) {
      setSaved(false);
      setClubsUsed((prev) => [...prev, club]);
    }

    function removeClubAt(index: number) {
      setSaved(false);
      setClubsUsed((prev) => prev.filter((_, i) => i !== index));
    }

    // 构建当前本地状态
    const buildLocal = useCallback((): HoleLocalData => ({
      hole_number: holeNumber,
      clubs_used: clubsUsed,
      tee_club: clubsUsed[0] ?? "",
      tee_result: teeResult,
      score,
      putts,
      gir,
    }), [holeNumber, clubsUsed, teeResult, score, putts, gir]);

    // 能否进行 API 保存（DB 要求 tee_club + tee_result 非空）
    const canApiSave = !!teeClub && !!teeResult;

    // API 保存
    const doApiSave = useCallback(async () => {
      if (!canApiSave) return false;

      setSaving(true);
      try {
        const res = await fetch(`/api/rounds/${roundId}/holes`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hole_number: holeNumber,
            tee_club: teeClub,
            tee_result: teeResult,
            clubs_used: clubsUsed.length > 0 ? clubsUsed : null,
            score,
            putts,
            gir,
          }),
        });

        if (res.ok) {
          const data = (await res.json()) as RoundHole;
          onSave?.(data);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
          return true;
        }
      } catch {
        // 静默失败
      } finally {
        setSaving(false);
      }
      return false;
    }, [roundId, holeNumber, teeClub, teeResult, clubsUsed, score, putts, gir, canApiSave, onSave]);

    // ref 暴露的 save：总是保存本地状态，能存 API 就存
    useImperativeHandle(ref, () => ({
      save: async () => {
        onLocalChange?.(buildLocal());
        await doApiSave();
      },
    }), [buildLocal, doApiSave, onLocalChange]);

    // Save 按钮点击
    async function handleSaveClick() {
      onLocalChange?.(buildLocal());
      if (canApiSave) {
        await doApiSave();
      } else {
        // 数据不完整，但本地已暂存，给一个提示
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    }

    // 统计球杆使用次数
    const clubCounts = new Map<string, number>();
    for (const c of clubsUsed) {
      clubCounts.set(c, (clubCounts.get(c) ?? 0) + 1);
    }

    return (
      <div className="flex flex-col gap-6">
        {/* 洞号标题 */}
        <div className="text-center">
          <h2 className="text-[1.5rem] font-semibold text-text">
            Hole {holeNumber}
          </h2>
          <p className="text-[0.9375rem] text-secondary mt-0.5">
            Par {par} &middot; {yardage} yds
          </p>
        </div>

        {/* Clubs Used — 不含 Putter */}
        <div>
          <p className="text-[0.875rem] font-medium text-text mb-1">
            Clubs Used
            <span className="text-secondary font-normal ml-1.5 text-[0.8125rem]">
              tap in order played
            </span>
          </p>

          {/* 已选球杆序列 */}
          {clubsUsed.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {clubsUsed.map((club, idx) => (
                <span
                  key={`used-${idx}`}
                  className={`
                    inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                    text-[0.8125rem] font-medium
                    ${idx === 0
                      ? "bg-accent/15 text-accent border border-accent/30"
                      : "bg-gray-100 text-text border border-gray-200"
                    }
                  `}
                >
                  <span className="text-[0.6875rem] text-secondary">{idx + 1}.</span>
                  {club}
                  {idx === 0 && (
                    <span className="text-[0.625rem] text-accent/70 ml-0.5">tee</span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeClubAt(idx)}
                    className="ml-0.5 text-secondary hover:text-red-500 transition-colors cursor-pointer"
                    title="Remove"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* 球杆网格 — 不含 Putter */}
          <div className="grid grid-cols-5 sm:grid-cols-7 gap-2">
            {selectableClubs.map((club) => {
              const count = clubCounts.get(club) ?? 0;
              return (
                <button
                  key={club}
                  type="button"
                  onClick={() => addClub(club)}
                  className={`
                    relative min-h-[44px] rounded-lg border text-[0.875rem] font-medium
                    transition-colors duration-150 cursor-pointer
                    ${
                      count > 0
                        ? "bg-accent/15 text-accent border-accent/40"
                        : "bg-white text-text border-divider hover:bg-bg"
                    }
                  `}
                >
                  {club}
                  {count > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-accent text-white text-[0.625rem] flex items-center justify-center font-bold">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Drive Result */}
        <div>
          <p className="text-[0.875rem] font-medium text-text mb-2">Drive Result</p>
          <div className="grid grid-cols-4 gap-2">
            {TEE_RESULTS.map((result) => {
              const styles = RESULT_STYLES[result];
              const isSelected = teeResult === result;
              return (
                <button
                  key={result}
                  type="button"
                  onClick={() => { setTeeResult(result); setSaved(false); }}
                  className={`
                    min-h-[44px] rounded-lg border text-[0.9375rem] font-semibold
                    transition-colors duration-150 cursor-pointer
                    ${isSelected ? styles.selected : styles.base}
                  `}
                >
                  {result}
                </button>
              );
            })}
          </div>
        </div>

        {/* Score 和 Putts */}
        <div className="flex justify-center gap-10">
          <Stepper
            label="Score"
            value={score}
            onChange={(v) => { setScore(v); setSaved(false); }}
            min={1}
            max={20}
          />
          <Stepper
            label="Putts"
            value={putts}
            onChange={(v) => { setPutts(v); setSaved(false); }}
            min={0}
            max={10}
          />
        </div>

        {/* GIR */}
        <div>
          <p className="text-[0.875rem] font-medium text-text mb-2 text-center">GIR</p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => { setGir(true); setSaved(false); }}
              className={`
                min-h-[44px] min-w-[80px] rounded-lg border text-[0.9375rem] font-medium
                transition-colors duration-150 cursor-pointer
                ${
                  gir === true
                    ? "bg-accent text-white border-accent"
                    : "bg-white text-text border-divider hover:bg-bg"
                }
              `}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => { setGir(false); setSaved(false); }}
              className={`
                min-h-[44px] min-w-[80px] rounded-lg border text-[0.9375rem] font-medium
                transition-colors duration-150 cursor-pointer
                ${
                  gir === false
                    ? "bg-accent text-white border-accent"
                    : "bg-white text-text border-divider hover:bg-bg"
                }
              `}
            >
              No
            </button>
          </div>
        </div>

        {/* Save 按钮 — 总是可点 */}
        <Button onClick={handleSaveClick} disabled={saving}>
          {saving ? "Saving..." : saved ? "Saved!" : "Save Hole"}
        </Button>
        {!canApiSave && (
          <p className="text-[0.75rem] text-secondary text-center -mt-3">
            Select a club and drive result to save to server
          </p>
        )}
      </div>
    );
  }
);

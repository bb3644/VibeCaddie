"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";

interface PlannedRound {
  id: string;
  course_tee_id: string;
  play_date: string;
  course_name?: string;
  tee_name?: string;
}

interface PlannedRoundPickerProps {
  /** 选中一个已 plan 的 round 后回调 */
  onSelect: (briefing: PlannedRound) => void;
  /** 用户选择手动录入（无已 plan 的 round） */
  onManual: () => void;
}

/** 列出已 plan 的 round（来自 briefing），让用户选择要 recap 的 round */
export function PlannedRoundPicker({ onSelect, onManual }: PlannedRoundPickerProps) {
  const [planned, setPlanned] = useState<PlannedRound[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/briefing");
        if (res.ok) {
          const data = (await res.json()) as PlannedRound[];
          setPlanned(data);
        }
      } catch {
        // 加载失败时仍允许手动录入
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-secondary text-[0.9375rem]">Loading planned rounds...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {planned.length > 0 ? (
        <Card>
          <SectionTitle className="mb-3">Select a Planned Round</SectionTitle>
          <p className="text-[0.875rem] text-secondary mb-4">
            Pick the round you played to record your results.
          </p>
          <div className="flex flex-col gap-2">
            {planned.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                className="
                  flex items-center justify-between w-full rounded-lg px-4 py-3
                  border border-divider hover:border-accent hover:bg-accent/5
                  transition-colors duration-150 cursor-pointer text-left
                "
              >
                <div>
                  <p className="text-[0.9375rem] font-medium text-text">
                    {item.course_name ?? "Unknown Course"}
                  </p>
                  <p className="text-[0.8125rem] text-secondary">
                    {item.tee_name ?? ""} &middot;{" "}
                    {new Date(item.play_date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <svg
                  className="w-5 h-5 text-secondary shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            ))}
          </div>
        </Card>
      ) : (
        <Card>
          <p className="text-center text-secondary text-[0.9375rem] py-4">
            No planned rounds yet. Plan a round first, or add a recap manually.
          </p>
        </Card>
      )}

      <button
        onClick={onManual}
        className="text-[0.875rem] text-accent font-medium hover:underline cursor-pointer text-center"
      >
        Or add a recap without a plan
      </button>
    </div>
  );
}

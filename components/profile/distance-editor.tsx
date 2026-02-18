"use client";

import { useState, useRef, useCallback } from "react";
import type { PlayerClubDistance } from "@/lib/db/types";

interface DistanceEditorProps {
  enabledClubs: Set<string>;
  initial: PlayerClubDistance[];
}

export function DistanceEditor({ enabledClubs, initial }: DistanceEditorProps) {
  // 将初始数据转换为 map: club_code -> yards string
  const [distances, setDistances] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const d of initial) {
      m[d.club_code] = d.typical_carry_yards?.toString() ?? "";
    }
    return m;
  });

  // debounce timer ref
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const saveDistance = useCallback((clubCode: string, yards: string) => {
    // 清除之前的 timer
    if (timers.current[clubCode]) {
      clearTimeout(timers.current[clubCode]);
    }
    timers.current[clubCode] = setTimeout(async () => {
      const typicalCarryYards = yards ? Number(yards) : undefined;
      await fetch("/api/profile/distances", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          club_code: clubCode,
          typical_carry_yards: typicalCarryYards,
        }),
      });
    }, 600);
  }, []);

  function handleChange(clubCode: string, value: string) {
    setDistances((prev) => ({ ...prev, [clubCode]: value }));
    saveDistance(clubCode, value);
  }

  // 过滤出已启用的球杆
  const enabledList = Array.from(enabledClubs);

  if (enabledList.length === 0) {
    return (
      <p className="text-[0.875rem] text-secondary">
        Enable clubs in your bag first to set distances.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[0.875rem] text-secondary">
        Approximate carry distances help Vibe Caddie suggest tee clubs. Leave
        blank if unsure.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {enabledList.map((code) => (
          <div key={code} className="flex items-center gap-2">
            <label className="text-[0.875rem] font-medium text-text w-14 shrink-0">
              {code}
            </label>
            <div className="flex items-center gap-1 flex-1">
              <input
                type="number"
                value={distances[code] ?? ""}
                onChange={(e) => handleChange(code, e.target.value)}
                placeholder="--"
                className="
                  w-full min-h-[44px] rounded-lg px-3 py-2
                  text-[0.9375rem] text-text
                  border border-divider bg-white
                  placeholder:text-secondary
                  outline-none
                  focus:border-accent focus:ring-1 focus:ring-accent
                  transition-colors duration-150
                "
              />
              <span className="text-[0.8125rem] text-secondary shrink-0">
                yds
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

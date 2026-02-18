"use client";

import { useState } from "react";
import { CLUB_CODES } from "@/lib/constants/clubs";
import { Button } from "@/components/ui/button";
import type { PlayerBagClub } from "@/lib/db/types";

interface BagEditorProps {
  initial: PlayerBagClub[];
  onChanged: (enabledCodes: Set<string>) => void;
}

/** 标准球杆组合 */
const STANDARD_SET = new Set([
  "D",
  "3W",
  "5H",
  "6i",
  "7i",
  "8i",
  "9i",
  "PW",
  "SW",
  "Putter",
]);

export function BagEditor({ initial, onChanged }: BagEditorProps) {
  const [enabled, setEnabled] = useState<Set<string>>(() => {
    const s = new Set<string>();
    for (const c of initial) {
      if (c.enabled) s.add(c.club_code);
    }
    return s;
  });

  async function toggle(code: string) {
    const willEnable = !enabled.has(code);
    const next = new Set(enabled);
    if (willEnable) {
      next.add(code);
    } else {
      next.delete(code);
    }
    setEnabled(next);
    onChanged(next);

    // 发送到后端
    await fetch("/api/profile/bag", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ club_code: code, enabled: willEnable }),
    });
  }

  async function applyStandardSet() {
    const next = new Set(STANDARD_SET);
    setEnabled(next);
    onChanged(next);

    // 并发更新所有球杆状态
    const promises = CLUB_CODES.map((code) =>
      fetch("/api/profile/bag", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          club_code: code,
          enabled: STANDARD_SET.has(code),
        }),
      })
    );
    await Promise.all(promises);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[0.875rem] text-secondary">
        Select the clubs in your bag
      </p>

      {/* 球杆网格 */}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {CLUB_CODES.map((code) => {
          const isEnabled = enabled.has(code);
          return (
            <button
              key={code}
              type="button"
              onClick={() => toggle(code)}
              className={`
                min-h-[44px] rounded-lg px-2 py-2
                text-[0.875rem] font-medium
                transition-colors duration-150
                cursor-pointer
                ${
                  isEnabled
                    ? "bg-accent text-white"
                    : "bg-bg text-secondary border border-divider"
                }
              `}
            >
              {code}
            </button>
          );
        })}
      </div>

      {/* 预设按钮 */}
      <Button variant="secondary" onClick={applyStandardSet}>
        Standard Set
      </Button>
    </div>
  );
}

"use client";

import { useState } from "react";
import { CLUB_CODES } from "@/lib/constants/clubs";
import { Button } from "@/components/ui/button";
import type { PlayerBagClub } from "@/lib/db/types";

interface BagEditorProps {
  initial: PlayerBagClub[];
  onSaved: (enabledCodes: Set<string>) => void;
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

export function BagEditor({ initial, onSaved }: BagEditorProps) {
  const [enabled, setEnabled] = useState<Set<string>>(() => {
    const s = new Set<string>();
    for (const c of initial) {
      if (c.enabled) s.add(c.club_code);
    }
    return s;
  });

  // 记录已保存的状态，用于对比是否有修改
  const [savedSet, setSavedSet] = useState<Set<string>>(() => new Set(enabled));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggle(code: string) {
    setSaved(false);
    const next = new Set(enabled);
    if (next.has(code)) {
      next.delete(code);
    } else {
      next.add(code);
    }
    setEnabled(next);
  }

  function applyStandardSet() {
    setSaved(false);
    setEnabled(new Set(STANDARD_SET));
  }

  // 判断是否有未保存的改动
  const hasChanges = (() => {
    if (enabled.size !== savedSet.size) return true;
    for (const c of enabled) {
      if (!savedSet.has(c)) return true;
    }
    return false;
  })();

  async function handleSave() {
    setSaving(true);
    try {
      // 找出需要更新的球杆（状态与已保存不同的）
      const toUpdate: { club_code: string; enabled: boolean }[] = [];
      for (const code of CLUB_CODES) {
        const wasEnabled = savedSet.has(code);
        const isEnabled = enabled.has(code);
        if (wasEnabled !== isEnabled) {
          toUpdate.push({ club_code: code, enabled: isEnabled });
        }
      }

      // 并发保存
      await Promise.all(
        toUpdate.map((item) =>
          fetch("/api/profile/bag", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item),
          })
        )
      );

      setSavedSet(new Set(enabled));
      onSaved(new Set(enabled));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // 静默失败
    } finally {
      setSaving(false);
    }
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

      {/* 按钮行 */}
      <div className="flex gap-3 items-center">
        <Button onClick={handleSave} disabled={saving || !hasChanges}>
          {saving ? "Saving..." : saved ? "Saved!" : "Save Bag"}
        </Button>
        <Button variant="secondary" onClick={applyStandardSet}>
          Standard Set
        </Button>
      </div>
    </div>
  );
}

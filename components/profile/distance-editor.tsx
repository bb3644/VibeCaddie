"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { PlayerClubDistance } from "@/lib/db/types";

interface DistanceEditorProps {
  enabledClubs: Set<string>;
  initial: PlayerClubDistance[];
}

export function DistanceEditor({ enabledClubs, initial }: DistanceEditorProps) {
  // club_code -> yards string
  const [distances, setDistances] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const d of initial) {
      m[d.club_code] = d.typical_carry_yards?.toString() ?? "";
    }
    return m;
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleChange(clubCode: string, value: string) {
    // 只允许数字
    const digits = value.replace(/\D/g, "");
    setSaved(false);
    setDistances((prev) => ({ ...prev, [clubCode]: digits }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const enabledList = Array.from(enabledClubs);
      // 只保存有值的
      const toSave = enabledList
        .filter((code) => distances[code] && distances[code] !== "")
        .map((code) => ({
          club_code: code,
          typical_carry_yards: Number(distances[code]),
        }));

      await Promise.all(
        toSave.map((item) =>
          fetch("/api/profile/distances", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item),
          })
        )
      );

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // 静默
    } finally {
      setSaving(false);
    }
  }

  const enabledList = Array.from(enabledClubs);

  if (enabledList.length === 0) {
    return (
      <p className="text-[0.875rem] text-secondary">
        Save your bag first to set club distances.
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
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
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

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : saved ? "Saved!" : "Save Distances"}
      </Button>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { LEVEL_DISTANCES, MAX_LEVEL } from "@/lib/op36";
import type { Op36Round } from "@/lib/db/types";
import { ScorecardTab } from "@/components/op36/scorecard-tab";
import { RoadmapTab } from "@/components/op36/roadmap-tab";
import { RoundLogTab } from "@/components/op36/round-log-tab";

type Tab = "scorecard" | "roadmap" | "log";

export default function Op36Page() {
  const [tab, setTab] = useState<Tab>("scorecard");
  const [currentLevel, setCurrentLevel] = useState(1);
  const [rounds, setRounds] = useState<Op36Round[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [progressRes, roundsRes] = await Promise.all([
        fetch("/api/op36/progress"),
        fetch("/api/op36/rounds"),
      ]);
      if (progressRes.ok) {
        const p = await progressRes.json();
        setCurrentLevel(p.currentLevel);
      }
      if (roundsRes.ok) {
        const r = await roundsRes.json();
        setRounds(r);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleRoundSaved() {
    setLoading(true);
    load().then(() => setTab("log"));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-secondary text-sm">
        Loading…
      </div>
    );
  }

  const isGraduate = currentLevel > MAX_LEVEL;
  const displayLevel = Math.min(currentLevel, MAX_LEVEL);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* What is Op36 */}
      <div className="rounded-2xl border border-divider bg-white px-5 py-4">
        <h2 className="text-sm font-bold text-text mb-1">What is Operation 36?</h2>
        <p className="text-xs text-secondary leading-relaxed">
          Op 36 is a scoring challenge where you tee off from a short distance and work your way back — level by level — until you can shoot 36 or better for 9 holes from 160 yards. Every hole is played as a par 4, regardless of what the course says. That makes par 36 for 9 holes. Each level adds distance. Pass to advance, miss to drop back. Simple, measurable, addictive.
        </p>
      </div>

      {/* Level header */}
      <div className="rounded-2xl border border-divider bg-white p-5 text-center">
        <div className="text-xs font-semibold uppercase tracking-widest text-secondary mb-1">
          Operation 36
        </div>
        {isGraduate ? (
          <>
            <div className="text-3xl font-bold text-accent mb-1">Graduate</div>
            <div className="text-sm text-secondary">You have completed all 10 levels!</div>
          </>
        ) : (
          <>
            <div className="text-4xl font-bold text-accent mb-1">Level {displayLevel}</div>
            <div className="text-base text-secondary">
              Tee distance: <span className="font-semibold text-text">{LEVEL_DISTANCES[displayLevel]}</span>
            </div>
            <div className="text-xs text-secondary mt-1">
              Next: Level {displayLevel + 1} at {LEVEL_DISTANCES[displayLevel + 1] ?? "—"}
            </div>
          </>
        )}
        <div className="flex justify-center gap-1 mt-3">
          {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map((lvl) => (
            <div
              key={lvl}
              className={`w-2 h-2 rounded-full transition-colors ${
                lvl < currentLevel
                  ? "bg-accent"
                  : lvl === currentLevel
                  ? "bg-accent/50"
                  : "bg-divider"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl border border-divider bg-white overflow-hidden">
        {(["scorecard", "roadmap", "log"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`
              flex-1 py-2.5 text-sm font-medium transition-colors capitalize
              ${tab === t ? "bg-accent text-pink" : "text-secondary hover:text-text"}
            `}
          >
            {t === "log" ? "Round Log" : t === "scorecard" ? "Scorecard" : "Roadmap"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "scorecard" && (
        <ScorecardTab currentLevel={currentLevel} onRoundSaved={handleRoundSaved} />
      )}
      {tab === "roadmap" && <RoadmapTab currentLevel={currentLevel} rounds={rounds} />}
      {tab === "log" && <RoundLogTab rounds={rounds} onRoundDeleted={() => { setLoading(true); load(); }} />}
    </div>
  );
}

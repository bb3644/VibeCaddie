"use client";

import { LEVEL_DISTANCES, MAX_LEVEL } from "@/lib/op36";
import type { Op36Round } from "@/lib/db/types";

interface RoadmapTabProps {
  currentLevel: number;
  rounds: Op36Round[];
}

const LEVEL_NAMES: Record<number, string> = {
  1: "First Putt",
  2: "Chipping In",
  3: "Pitch Perfect",
  4: "Wedge Warrior",
  5: "Iron Rookie",
  6: "Fairway Finder",
  7: "Long Iron Lion",
  8: "Driver Ready",
  9: "Course Conqueror",
  10: "Op 36 Champion",
};

const LEVEL_EMOJIS: Record<number, string> = {
  1: "⛳",
  2: "🏌️",
  3: "🎯",
  4: "🪄",
  5: "💪",
  6: "🌿",
  7: "🦁",
  8: "🚀",
  9: "👑",
  10: "🏆",
};

export function RoadmapTab({ currentLevel, rounds }: RoadmapTabProps) {
  const isGraduate = currentLevel > MAX_LEVEL;

  // Per-level stats
  const levelStats = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map((lvl) => {
    const lvlRounds = rounds.filter((r) => r.level === lvl);
    const bestRound = lvlRounds.reduce<Op36Round | null>(
      (best, r) => (!best || r.total_score < best.total_score ? r : best),
      null
    );
    const hasMastery = lvlRounds.some((r) => r.mastery);
    const attempts = lvlRounds.length;
    return { lvl, bestRound, hasMastery, attempts };
  });

  const totalRounds = rounds.length;
  const masteredLevels = levelStats.filter((s) => s.hasMastery).length;
  const levelsCleared = Math.max(0, currentLevel - 1);

  return (
    <div className="space-y-5">
      {/* Stats banner */}
      <div className="rounded-2xl border border-divider bg-white p-4 grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-2xl font-bold text-accent">{levelsCleared}</div>
          <div className="text-xs text-secondary mt-0.5">Levels Cleared</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-amber-500">{masteredLevels}</div>
          <div className="text-xs text-secondary mt-0.5">Masteries</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-text">{totalRounds}</div>
          <div className="text-xs text-secondary mt-0.5">Total Rounds</div>
        </div>
      </div>

      {/* Graduate banner */}
      {isGraduate && (
        <div className="rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-300 p-5 text-center shadow-md">
          <div className="text-4xl mb-2">🏆</div>
          <div className="text-xl font-bold text-amber-900">Op 36 Graduate!</div>
          <div className="text-sm text-amber-800 mt-1">You&apos;ve conquered all 10 levels. Legend.</div>
        </div>
      )}

      {/* Level path */}
      <div className="relative">
        {/* Vertical connecting line */}
        <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-divider z-0" />

        <div className="space-y-3 relative z-10">
          {levelStats.map(({ lvl, bestRound, hasMastery, attempts }) => {
            const done = lvl < currentLevel || isGraduate;
            const current = lvl === currentLevel && !isGraduate;
            const locked = lvl > currentLevel && !isGraduate;

            return (
              <div key={lvl} className="flex gap-3 items-start">
                {/* Node */}
                <div className="shrink-0 flex flex-col items-center">
                  <div
                    className={`
                      w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shadow-sm transition-all
                      ${done ? "bg-accent text-pink shadow-accent/30 shadow-md" : ""}
                      ${current ? "bg-accent text-pink ring-4 ring-accent/30 shadow-accent/40 shadow-lg scale-110" : ""}
                      ${locked ? "bg-white border-2 border-divider text-secondary/40" : ""}
                    `}
                  >
                    {done ? (
                      hasMastery ? "⭐" : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )
                    ) : locked ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    ) : (
                      LEVEL_EMOJIS[lvl]
                    )}
                  </div>
                </div>

                {/* Card */}
                <div
                  className={`
                    flex-1 rounded-2xl border p-4 transition-all
                    ${current ? "border-accent bg-accent/5 shadow-sm" : "border-divider bg-white"}
                    ${locked ? "opacity-50" : ""}
                  `}
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-bold text-base ${current ? "text-accent" : locked ? "text-secondary" : "text-text"}`}>
                          {LEVEL_NAMES[lvl]}
                        </span>
                        {current && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-accent text-pink px-2 py-0.5 rounded-full">
                            You are here
                          </span>
                        )}
                        {hasMastery && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                            ⭐ Mastery
                          </span>
                        )}
                        {lvl === MAX_LEVEL && !hasMastery && !locked && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">
                            Final Boss
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-secondary mt-0.5">
                        Level {lvl} · Tee at {LEVEL_DISTANCES[lvl]}
                      </div>
                    </div>
                    {/* Best score badge */}
                    {bestRound && (
                      <div className="text-right shrink-0">
                        <div className="text-lg font-bold text-text">{bestRound.total_score}</div>
                        <div className="text-[10px] text-secondary">best score</div>
                      </div>
                    )}
                  </div>

                  {/* Attempts and progress bar */}
                  {!locked && attempts > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] text-secondary mb-1">
                        <span>{attempts} round{attempts !== 1 ? "s" : ""} played</span>
                        {done && <span className="text-accent font-semibold">Cleared!</span>}
                      </div>
                      {done && (
                        <div className="h-1.5 rounded-full bg-accent/20 overflow-hidden">
                          <div className="h-full bg-accent rounded-full w-full" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Current level call-to-action */}
                  {current && (
                    <div className="mt-3 text-xs text-accent font-medium">
                      Score ≤ 36 for 9 holes (or ≤ 72 for 18) to advance →
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Points legend */}
      <div className="rounded-2xl border border-divider bg-white p-4 space-y-2">
        <h3 className="text-sm font-bold text-text">How Points Work</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {[
            { icon: "🟢", label: "Green in Regulation (GIR)", pts: "+1 pt" },
            { icon: "⬆️", label: "Up & Down", pts: "+1 pt" },
            { icon: "🐦", label: "Birdie or better", pts: "+2 pts" },
            { icon: "😬", label: "3-putt or worse", pts: "−1 pt" },
          ].map(({ icon, label, pts }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-base">{icon}</span>
              <div>
                <div className="text-xs font-semibold text-text">{pts}</div>
                <div className="text-[10px] text-secondary">{label}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-secondary pt-2 border-t border-divider">
          ⭐ Mastery = Pass AND score ≥ 18 pts (9 holes) or ≥ 36 pts (18 holes)
        </p>
      </div>
    </div>
  );
}

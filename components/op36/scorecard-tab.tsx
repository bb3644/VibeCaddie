"use client";

import { useState } from "react";
import { LEVEL_DISTANCES, MAX_LEVEL, PASS_MARK_9, PASS_MARK_18, calcTotals, HoleInput } from "@/lib/op36";

interface ScorecardTabProps {
  currentLevel: number;
  onRoundSaved: () => void;
}

const EMPTY_HOLE = (): HoleInput => ({ score: 0, putts: 0, gir: false, ud: false });

type Nines = "front" | "back" | "both";

export function ScorecardTab({ currentLevel, onRoundSaved }: ScorecardTabProps) {
  const [level, setLevel] = useState(currentLevel);
  const [nines, setNines] = useState<Nines>("front");
  const [playedAt, setPlayedAt] = useState(() => new Date().toISOString().split("T")[0]);
  const [frontHoles, setFrontHoles] = useState<HoleInput[]>(Array.from({ length: 9 }, EMPTY_HOLE));
  const [backHoles, setBackHoles] = useState<HoleInput[]>(Array.from({ length: 9 }, EMPTY_HOLE));
  const [roundNotes, setRoundNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [showPointsDetail, setShowPointsDetail] = useState(false);

  const showFront = nines === "front" || nines === "both";
  const showBack = nines === "back" || nines === "both";

  function updateFront(i: number, field: keyof HoleInput, value: number | boolean) {
    setFrontHoles((prev) => prev.map((h, idx) => (idx === i ? { ...h, [field]: value } : h)));
  }
  function updateBack(i: number, field: keyof HoleInput, value: number | boolean) {
    setBackHoles((prev) => prev.map((h, idx) => (idx === i ? { ...h, [field]: value } : h)));
  }

  const frontTotals = calcTotals(frontHoles);
  const backTotals = calcTotals(backHoles);
  const allHoles = [
    ...(showFront ? frontHoles : []),
    ...(showBack ? backHoles : []),
  ];
  const totals = calcTotals(allHoles);
  const passMark = nines === "both" ? PASS_MARK_18 : PASS_MARK_9;
  const passed = totals.totalScore > 0 && totals.totalScore <= passMark;

  async function handleSubmit() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/op36/rounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          played_at: playedAt,
          level,
          nines,
          front_holes: showFront ? frontHoles : undefined,
          back_holes: showBack ? backHoles : undefined,
          notes: roundNotes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }
      const savedRound = await res.json();

      setFrontHoles(Array.from({ length: 9 }, EMPTY_HOLE));
      setBackHoles(Array.from({ length: 9 }, EMPTY_HOLE));
      setRoundNotes("");
      setSaving(false);

      // Fetch AI feedback (non-blocking — show loading state)
      setLoadingFeedback(true);
      setFeedback(null);
      try {
        const fbRes = await fetch("/api/op36/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(savedRound),
        });
        if (fbRes.ok) {
          const fbData = await fbRes.json();
          setFeedback(fbData.feedback);
        }
      } finally {
        setLoadingFeedback(false);
      }

      onRoundSaved();
      return;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Settings row */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-secondary">Date</label>
          <input
            type="date"
            value={playedAt}
            onChange={(e) => setPlayedAt(e.target.value)}
            className="border border-divider rounded-lg px-3 py-1.5 text-sm text-text bg-white focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-secondary">Level</label>
          <select
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
            className="border border-divider rounded-lg px-3 py-1.5 text-sm text-text bg-white focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map((l) => (
              <option key={l} value={l}>
                Level {l} — {LEVEL_DISTANCES[l]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-secondary">Nines</label>
          <select
            value={nines}
            onChange={(e) => setNines(e.target.value as Nines)}
            className="border border-divider rounded-lg px-3 py-1.5 text-sm text-text bg-white focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="front">Front 9</option>
            <option value="back">Back 9</option>
            <option value="both">Full 18</option>
          </select>
        </div>
      </div>

      {/* Pass mark hint */}
      <p className="text-xs text-secondary">
        Pass mark: ≤ {passMark} ({nines === "both" ? "18 holes" : "9 holes"}) · Distance: {LEVEL_DISTANCES[level]}
      </p>

      {/* Scorecard tables */}
      {showFront && (
        <HoleTable
          label="Front 9"
          holes={frontHoles}
          onChange={updateFront}
          totals={frontTotals}
        />
      )}
      {showBack && (
        <HoleTable
          label="Back 9"
          holes={backHoles}
          onChange={updateBack}
          totals={backTotals}
        />
      )}

      {/* Totals summary */}
      <div className="rounded-xl border border-divider bg-white p-4 space-y-3">
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 text-center">
          {[
            { label: "Score", value: totals.totalScore || "—" },
            { label: "Putts", value: totals.totalPutts || "—" },
            { label: "GIRs", value: totals.girs },
            { label: "U&Ds", value: totals.uds },
            { label: "Birdies", value: totals.birdies },
            { label: "Pars", value: totals.pars },
            { label: "3-putts", value: totals.threePutts },
            { label: "Dbl Bog+", value: totals.doubleBogeyPlus },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="text-xs text-secondary">{label}</div>
              <div className="text-lg font-semibold text-text">{value}</div>
            </div>
          ))}
        </div>

        {/* Points row with toggle */}
        <div className="border-t border-divider/60 pt-3">
          <button
            onClick={() => setShowPointsDetail((v) => !v)}
            className="w-full flex items-center justify-between text-left"
          >
            <div>
              <span className="text-xs text-secondary">Points</span>
              <div className="text-lg font-semibold text-accent">{totals.points}</div>
            </div>
            <span className="text-xs text-secondary flex items-center gap-1">
              {showPointsDetail ? "Hide details" : "How is this calculated?"}
              <svg
                className={`w-3.5 h-3.5 transition-transform ${showPointsDetail ? "rotate-180" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </button>

          {showPointsDetail && (
            <div className="mt-3 space-y-2 text-xs text-secondary">
              <p className="font-medium text-text">Points breakdown:</p>
              <div className="space-y-1">
                {totals.birdies > 0 && (
                  <div className="flex justify-between">
                    <span>{totals.birdies} birdie{totals.birdies > 1 ? "s" : ""} × +2</span>
                    <span className="text-accent font-medium">+{totals.birdies * 2}</span>
                  </div>
                )}
                {totals.pars > 0 && (
                  <div className="flex justify-between">
                    <span>{totals.pars} par{totals.pars > 1 ? "s" : ""} × +1</span>
                    <span className="text-accent font-medium">+{totals.pars}</span>
                  </div>
                )}
                {totals.girs > 0 && (
                  <div className="flex justify-between">
                    <span>{totals.girs} GIR{totals.girs > 1 ? "s" : ""} × +1</span>
                    <span className="text-accent font-medium">+{totals.girs}</span>
                  </div>
                )}
                {totals.uds > 0 && (
                  <div className="flex justify-between">
                    <span>{totals.uds} up &amp; down{totals.uds > 1 ? "s" : ""} × +1</span>
                    <span className="text-accent font-medium">+{totals.uds}</span>
                  </div>
                )}
                {totals.threePutts > 0 && (
                  <div className="flex justify-between">
                    <span>{totals.threePutts} 3-putt{totals.threePutts > 1 ? "s" : ""} × −1</span>
                    <span className="text-red-500 font-medium">−{totals.threePutts}</span>
                  </div>
                )}
                {totals.fourPutts > 0 && (
                  <div className="flex justify-between">
                    <span>{totals.fourPutts} 4-putt{totals.fourPutts > 1 ? "s" : ""} × −3</span>
                    <span className="text-red-500 font-medium">−{totals.fourPutts * 3}</span>
                  </div>
                )}
                {totals.doubleBogeyPlus > 0 && (
                  <div className="flex justify-between">
                    <span>{totals.doubleBogeyPlus} double bogey+ × −2</span>
                    <span className="text-red-500 font-medium">−{totals.doubleBogeyPlus * 2}</span>
                  </div>
                )}
                {totals.birdies === 0 && totals.pars === 0 && totals.girs === 0 && totals.uds === 0 &&
                  totals.threePutts === 0 && totals.fourPutts === 0 && totals.doubleBogeyPlus === 0 && (
                  <p className="text-secondary italic">No scores entered yet.</p>
                )}
              </div>
              <div className="flex justify-between border-t border-divider/60 pt-1 font-medium text-text">
                <span>Total</span>
                <span className={totals.points >= 0 ? "text-accent" : "text-red-500"}>{totals.points > 0 ? `+${totals.points}` : totals.points}</span>
              </div>
              <p className="text-[10px] text-secondary/70 pt-1 border-t border-divider/40">
                Birdie ≤3 +2 · Par +1 · GIR +1 · U&amp;D +1 · 3-putt −1 · 4-putt+ −3 · Double bogey+ −2
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Result preview */}
      {totals.totalScore > 0 && (
        <div
          className={`rounded-xl p-3 text-center text-sm font-semibold ${
            passed ? "bg-accent/10 text-accent" : "bg-pink/30 text-secondary"
          }`}
        >
          {passed
            ? nines === "both" && level === MAX_LEVEL
              ? "Graduate! You've mastered Op 36!"
              : `Pass — you'll advance to Level ${level + 1}`
            : level === 1
            ? `Miss — stay at Level 1`
            : `Miss — you'll drop to Level ${level - 1}`}
        </div>
      )}

      {/* Round notes */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-secondary">Round Notes <span className="font-normal">(optional)</span></label>
        <textarea
          value={roundNotes}
          onChange={(e) => setRoundNotes(e.target.value)}
          placeholder="How did the round feel? Any breakthroughs or things to work on..."
          rows={3}
          className="w-full border border-divider rounded-xl px-3 py-2.5 text-sm text-text bg-white focus:outline-none focus:ring-1 focus:ring-accent resize-none placeholder:text-secondary/60"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* AI Feedback */}
      {loadingFeedback && (
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin shrink-0" />
          <p className="text-sm text-secondary">Vibe Caddie is reviewing your round…</p>
        </div>
      )}
      {feedback && (
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏌️</span>
            <span className="text-xs font-bold uppercase tracking-wider text-accent">Caddie Feedback</span>
          </div>
          <p className="text-sm text-text whitespace-pre-wrap leading-relaxed">{feedback}</p>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={saving || totals.totalScore === 0}
        className="w-full py-3 rounded-xl bg-accent text-pink font-semibold text-sm disabled:opacity-50 transition-opacity"
      >
        {saving ? "Saving…" : "Submit Round"}
      </button>
    </div>
  );
}

// ─── Inner table component ────────────────────────────────────────────────────

interface HoleTableProps {
  label: string;
  holes: HoleInput[];
  onChange: (i: number, field: keyof HoleInput, value: number | boolean) => void;
  totals: ReturnType<typeof calcTotals>;
}

function HoleTable({ label, holes, onChange, totals }: HoleTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-divider bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-divider text-secondary text-xs">
            <th className="px-3 py-2 text-left font-medium">{label}</th>
            {holes.map((_, i) => (
              <th key={i} className="px-2 py-2 text-center font-medium w-10">
                {i + 1}
              </th>
            ))}
            <th className="px-3 py-2 text-center font-medium">Tot</th>
          </tr>
        </thead>
        <tbody>
          {/* Par row */}
          <tr className="border-b border-divider/50 bg-divider/20">
            <td className="px-3 py-1.5 text-xs text-secondary font-medium">Par</td>
            {holes.map((_, i) => (
              <td key={i} className="px-1 py-1 text-center text-xs font-medium text-secondary">4</td>
            ))}
            <td className="px-3 py-1 text-center text-xs font-semibold text-secondary">36</td>
          </tr>

          {/* Score row */}
          <tr className="border-b border-divider/50">
            <td className="px-3 py-1.5 text-xs text-secondary font-medium">Score</td>
            {holes.map((h, i) => (
              <td key={i} className="px-1 py-1">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={h.score || ""}
                  placeholder="—"
                  onChange={(e) => onChange(i, "score", Number(e.target.value))}
                  className="w-9 text-center text-sm border border-divider rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-accent bg-transparent"
                />
              </td>
            ))}
            <td className="px-3 py-1 text-center font-semibold text-text">
              {totals.totalScore || "—"}
            </td>
          </tr>

          {/* Putts row */}
          <tr className="border-b border-divider/50">
            <td className="px-3 py-1.5 text-xs text-secondary font-medium">Putts</td>
            {holes.map((h, i) => (
              <td key={i} className="px-1 py-1">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={h.putts || ""}
                  placeholder="—"
                  onChange={(e) => onChange(i, "putts", Number(e.target.value))}
                  className="w-9 text-center text-sm border border-divider rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-accent bg-transparent"
                />
              </td>
            ))}
            <td className="px-3 py-1 text-center font-semibold text-text">
              {totals.totalPutts || "—"}
            </td>
          </tr>

          {/* GIR row */}
          <tr className="border-b border-divider/50">
            <td className="px-3 py-1.5 text-xs text-secondary font-medium">GIR</td>
            {holes.map((h, i) => (
              <td key={i} className="px-1 py-1 text-center">
                <input
                  type="checkbox"
                  checked={h.gir}
                  onChange={(e) => onChange(i, "gir", e.target.checked)}
                  className="accent-accent w-4 h-4"
                />
              </td>
            ))}
            <td className="px-3 py-1 text-center font-semibold text-text">{totals.girs}</td>
          </tr>

          {/* U&D row */}
          <tr>
            <td className="px-3 py-1.5 text-xs text-secondary font-medium">U&amp;D</td>
            {holes.map((h, i) => (
              <td key={i} className="px-1 py-1 text-center">
                <input
                  type="checkbox"
                  checked={h.ud}
                  onChange={(e) => onChange(i, "ud", e.target.checked)}
                  className="accent-accent w-4 h-4"
                />
              </td>
            ))}
            <td className="px-3 py-1 text-center font-semibold text-text">{totals.uds}</td>
          </tr>

        </tbody>
      </table>
    </div>
  );
}

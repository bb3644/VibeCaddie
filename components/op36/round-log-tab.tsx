"use client";

import { useState } from "react";
import type { Op36Round } from "@/lib/db/types";

interface RoundLogTabProps {
  rounds: Op36Round[];
  onRoundDeleted: () => void;
}

const RESULT_LABELS: Record<Op36Round["result"], string> = {
  advance: "Advance",
  demote: "Demote",
  stay: "Stay",
  graduate: "Graduate!",
};

const RESULT_STYLES: Record<Op36Round["result"], string> = {
  advance: "bg-accent/10 text-accent",
  demote: "bg-red-50 text-red-600",
  stay: "bg-amber-50 text-amber-700",
  graduate: "bg-amber-100 text-amber-800",
};

export function RoundLogTab({ rounds, onRoundDeleted }: RoundLogTabProps) {
  if (rounds.length === 0) {
    return (
      <div className="text-center py-12 text-secondary text-sm">
        No rounds yet. Use the Scorecard tab to log your first Op 36 round.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rounds.map((r) => (
        <RoundCard key={r.id} round={r} onDeleted={onRoundDeleted} />
      ))}
    </div>
  );
}

function RoundCard({ round: initialRound, onDeleted }: { round: Op36Round; onDeleted: () => void }) {
  const [round, setRound] = useState(initialRound);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/op36/rounds/${round.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      onDeleted();
    } catch {
      setError("Could not delete round. Try again.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function handleAnalyse() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/op36/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(round),
      });
      if (!res.ok) throw new Error("Failed to generate analysis");
      const data = await res.json();
      setRound((prev) => ({ ...prev, feedback: data.feedback }));
    } catch {
      setError("Could not generate analysis. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-divider bg-white p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text">
            Level {round.level} → Level {round.level_after}
          </span>
          <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${RESULT_STYLES[round.result]}`}>
            {RESULT_LABELS[round.result]}
          </span>
          {round.mastery && (
            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
              ⭐ Mastery
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-secondary">{formatDate(round.played_at)}</span>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-[10px] font-semibold text-white bg-red-500 px-2 py-0.5 rounded hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deleting ? "Deleting…" : "Confirm"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-[10px] font-semibold text-secondary hover:text-text px-1"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-secondary hover:text-red-500 transition-colors"
              title="Delete round"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Distance */}
      <p className="text-xs text-secondary">{round.distance_label} · {ninesLabel(round.nines)}</p>

      {/* Stats grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
        {[
          { label: "Score", value: round.total_score },
          { label: "Points", value: round.points },
          { label: "Putts", value: round.total_putts ?? "—" },
          { label: "GIRs", value: round.girs ?? "—" },
          { label: "U&Ds", value: round.uds ?? "—" },
          { label: "3-putts", value: round.three_putts ?? "—" },
        ].map(({ label, value }) => (
          <div key={label}>
            <div className="text-[10px] text-secondary">{label}</div>
            <div className="text-sm font-semibold text-text">{value}</div>
          </div>
        ))}
      </div>

      {/* Round notes */}
      {round.notes && (
        <div className="pt-2 border-t border-divider/60">
          <p className="text-xs text-secondary italic">&ldquo;{round.notes}&rdquo;</p>
        </div>
      )}

      {/* Caddie feedback */}
      {round.feedback ? (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-base">🏌️</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-accent">Caddie Analysis</span>
          </div>
          <p className="text-xs text-text leading-relaxed whitespace-pre-wrap">{round.feedback}</p>
        </div>
      ) : (
        <div className="pt-1">
          {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
          <button
            onClick={handleAnalyse}
            disabled={loading}
            className="w-full py-2 rounded-lg border border-accent/40 text-accent text-xs font-semibold hover:bg-accent/5 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                Analysing…
              </>
            ) : (
              "🏌️ Get Caddie Analysis"
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ninesLabel(nines: Op36Round["nines"]) {
  if (nines === "front") return "Front 9";
  if (nines === "back") return "Back 9";
  return "Full 18";
}

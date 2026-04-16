"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { RoundSummary } from "@/components/round/round-summary";
import { ShotTrackerSection } from "@/components/round/shot-tracker";
import { RecapDisplay } from "@/components/recap/recap-display";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Round, RoundHole, CourseHole } from "@/lib/db/types";

interface RoundDetail extends Round {
  holes: RoundHole[];
  course_name: string | null;
  tee_name: string | null;
  tee_color: string | null;
  par_total: number | null;
  course_holes: CourseHole[];
}

export default function RoundDetailPage() {
  const params = useParams();
  const router = useRouter();
  const roundId = params.roundId as string;

  const [round, setRound] = useState<RoundDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Round notes
  const [roundNotes, setRoundNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const saveNotesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Inline recap generation
  const [recapText, setRecapText] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [recapError, setRecapError] = useState("");

  // Edit recap
  const [editingRecap, setEditingRecap] = useState(false);
  const [editRecapText, setEditRecapText] = useState("");
  const [savingRecap, setSavingRecap] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/rounds/${roundId}`);
        if (res.ok) {
          const data = (await res.json()) as RoundDetail;
          setRound(data);
          if (data.round_notes) setRoundNotes(data.round_notes);
          if (data.recap_text) setRecapText(data.recap_text);
        } else if (res.status === 404) {
          setError("Round not found.");
        } else {
          setError("Failed to load round.");
        }
      } catch {
        setError("Something went wrong.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [roundId]);

  // Auto-save notes 1 second after the user stops typing
  const handleNotesChange = useCallback((value: string) => {
    setRoundNotes(value);
    if (saveNotesTimer.current) clearTimeout(saveNotesTimer.current);
    saveNotesTimer.current = setTimeout(async () => {
      setSavingNotes(true);
      try {
        await fetch(`/api/rounds/${roundId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ round_notes: value.trim() }),
        });
      } catch {
        // silent
      } finally {
        setSavingNotes(false);
      }
    }, 1000);
  }, [roundId]);

  // Generate recap inline
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setRecapError("");

    // Flush any pending notes save first
    if (saveNotesTimer.current) {
      clearTimeout(saveNotesTimer.current);
      saveNotesTimer.current = null;
    }
    if (roundNotes.trim()) {
      try {
        await fetch(`/api/rounds/${roundId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ round_notes: roundNotes.trim() }),
        });
      } catch {
        // continue anyway
      }
    }

    try {
      const res = await fetch("/api/recap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ round_id: roundId }),
      });
      if (res.ok) {
        const data = await res.json();
        setRecapText(data.recap_text);
      } else {
        const data = await res.json().catch(() => null);
        setRecapError(data?.error ?? "Failed to generate recap.");
      }
    } catch {
      setRecapError("Something went wrong. Please try again.");
    } finally {
      setGenerating(false);
    }
  }, [roundId, roundNotes]);

  const handleSaveRecapEdit = useCallback(async () => {
    setSavingRecap(true);
    try {
      const res = await fetch(`/api/rounds/${roundId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recap_text: editRecapText }),
      });
      if (res.ok) {
        setRecapText(editRecapText);
        setEditingRecap(false);
      }
    } catch {
      // silent
    } finally {
      setSavingRecap(false);
    }
  }, [roundId, editRecapText]);

  // Save shot tracker position (approach or drive x/y) for a hole
  const handleSavePosition = useCallback(
    async (holeNumber: number, type: "approach" | "drive", x: number, y: number) => {
      const existing = round?.holes.find((h) => h.hole_number === holeNumber);
      if (!existing) return;
      const body: Record<string, unknown> = {
        hole_number: holeNumber,
        tee_club: existing.tee_club,
        tee_result: existing.tee_result,
        approach_club: existing.approach_club,
        approach_distance: existing.approach_distance,
        approach_direction: existing.approach_direction,
        approach_yardage: existing.approach_yardage,
        up_down: existing.up_down,
        recovery_club: existing.recovery_club,
        hole_notes: existing.hole_notes,
        score: existing.score,
        putts: existing.putts,
        bunker_count: existing.bunker_count,
        water_count: existing.water_count,
        penalty_count: existing.penalty_count,
        approach_x: existing.approach_x,
        approach_y: existing.approach_y,
        drive_x: existing.drive_x,
        drive_y: existing.drive_y,
      };
      if (type === "approach") { body.approach_x = x; body.approach_y = y; }
      else { body.drive_x = x; body.drive_y = y; }
      try {
        const res = await fetch(`/api/rounds/${roundId}/holes`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const updated = await res.json();
          setRound((prev) =>
            prev
              ? {
                  ...prev,
                  holes: prev.holes.map((h) =>
                    h.hole_number === holeNumber ? { ...h, ...updated } : h
                  ),
                }
              : prev
          );
        }
      } catch {
        // silent
      }
    },
    [round, roundId]
  );

  // 当总分变化时，自动保存
  const handleTotalScoreChange = useCallback(
    async (totalScore: number) => {
      if (!round || round.total_score === totalScore) return;
      try {
        await fetch(`/api/rounds/${roundId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ total_score: totalScore }),
        });
        setRound((prev) =>
          prev ? { ...prev, total_score: totalScore } : prev
        );
      } catch {
        // silent
      }
    },
    [round, roundId]
  );

  // 删除轮次
  const handleDelete = useCallback(async () => {
    if (!confirm("Delete this round? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/rounds/${roundId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/rounds");
      } else {
        setError("Failed to delete round.");
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setDeleting(false);
    }
  }, [roundId, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-secondary text-[0.9375rem]">Loading...</p>
      </div>
    );
  }

  if (error || !round) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-secondary text-[0.9375rem]">
          {error || "Round not found."}
        </p>
        <Link href="/rounds">
          <span className="text-accent text-[0.9375rem] font-medium hover:underline cursor-pointer">
            Back to rounds
          </span>
        </Link>
      </div>
    );
  }

  const dateStr = new Date(round.played_date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const holesWithNotes = round.holes.filter((h) => h.hole_notes);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <Link href="/rounds">
          <span className="text-accent text-[0.8125rem] font-medium hover:underline cursor-pointer">
            &larr; Back to rounds
          </span>
        </Link>
        <h1 className="text-[1.875rem] font-semibold text-text mt-2">
          {round.course_name ?? "Unknown Course"} &mdash; {round.tee_name ?? ""}
        </h1>
        <p className="text-[0.9375rem] text-secondary mt-1">{dateStr}</p>
        {round.total_score !== null && (
          <p className="text-[1.25rem] font-semibold text-text mt-2">
            Total: {round.total_score}
          </p>
        )}
      </div>

      {/* Scorecard */}
      {round.holes.length > 0 ? (
        <RoundSummary
          holes={round.holes}
          courseHoles={round.course_holes}
          onTotalScoreChange={handleTotalScoreChange}
        />
      ) : (
        <div className="text-center py-8">
          <p className="text-secondary text-[0.9375rem]">
            No hole data recorded for this round.
          </p>
        </div>
      )}

      {/* Shot Tracker */}
      {round.holes.length > 0 && (
        <Card>
          <p className="text-[0.9375rem] font-semibold text-text mb-4">Shot Tracker</p>
          <ShotTrackerSection
            holes={round.holes}
            holesPlayed={round.holes_played ?? 18}
            onSavePosition={handleSavePosition}
          />
        </Card>
      )}

      {/* Per-hole notes */}
      {holesWithNotes.length > 0 && (
        <Card>
          <p className="text-[0.9375rem] font-semibold text-text mb-3">Hole Notes</p>
          <div className="flex flex-col gap-2">
            {holesWithNotes.map((h) => (
              <div key={h.hole_number} className="flex gap-3 text-[0.875rem]">
                <span className="font-medium text-secondary shrink-0 w-14">
                  Hole {h.hole_number}
                </span>
                <span className="text-text">{h.hole_notes}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Round notes */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label htmlFor="round-notes" className="text-[0.9375rem] font-semibold text-text">
            Round Notes
          </label>
          {savingNotes && (
            <span className="text-[0.75rem] text-secondary">Saving...</span>
          )}
        </div>
        <textarea
          id="round-notes"
          value={roundNotes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="How did it go? Conditions, how you felt, specific struggles or moments..."
          rows={4}
          className="w-full rounded-lg border border-divider p-3 text-[0.9375rem] text-text leading-relaxed placeholder:text-secondary/50 focus:border-accent focus:ring-1 focus:ring-accent outline-none resize-y"
        />
      </div>

      {/* AI Recap */}
      {generating ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-secondary text-[0.9375rem]">Generating your analysis...</p>
        </div>
      ) : recapText ? (
        <div className="flex flex-col gap-3">
          {editingRecap ? (
            <>
              <textarea
                value={editRecapText}
                onChange={(e) => setEditRecapText(e.target.value)}
                className="w-full min-h-[400px] rounded-lg border border-divider p-4 text-[0.9375rem] text-text leading-relaxed focus:border-accent focus:ring-1 focus:ring-accent outline-none resize-y"
              />
              <div className="flex gap-3">
                <Button onClick={handleSaveRecapEdit} disabled={savingRecap}>
                  {savingRecap ? "Saving..." : "Save Changes"}
                </Button>
                <Button variant="secondary" onClick={() => setEditingRecap(false)}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <RecapDisplay
                recapText={recapText}
                courseName={round.course_name ?? "Unknown Course"}
                teeName={round.tee_name ?? ""}
                playedDate={round.played_date}
              />
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditRecapText(recapText);
                    setEditingRecap(true);
                  }}
                >
                  Edit Recap
                </Button>
                <Button variant="ghost" onClick={handleGenerate}>
                  Regenerate
                </Button>
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          {recapError && (
            <p className="text-red-600 text-[0.875rem]">{recapError}</p>
          )}
          <Button onClick={handleGenerate} className="w-full">
            Generate Recap
          </Button>
        </>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-3 border-t border-divider pt-4">
        <Link href={`/rounds/${roundId}/edit`}>
          <Button variant="secondary" className="w-full">Edit Holes</Button>
        </Link>
        <Button
          variant="ghost"
          onClick={handleDelete}
          disabled={deleting}
          className="text-red-500 hover:text-red-600 hover:bg-red-50"
        >
          {deleting ? "..." : "Delete Round"}
        </Button>
      </div>
    </div>
  );
}

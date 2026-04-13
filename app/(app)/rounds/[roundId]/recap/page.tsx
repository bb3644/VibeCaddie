"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { RecapDisplay } from "@/components/recap/recap-display";
import { RoundSummary } from "@/components/round/round-summary";
import { Button } from "@/components/ui/button";
import type { Round, CourseHole, RoundHole } from "@/lib/db/types";

interface RoundDetail extends Round {
  course_name: string | null;
  tee_name: string | null;
  course_holes: CourseHole[];
  holes: RoundHole[];
}

function RecapContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roundId = params.roundId as string;
  const shouldRegenerate = searchParams.get("regenerate") === "1";

  const [round, setRound] = useState<RoundDetail | null>(null);
  const [recapText, setRecapText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Round notes
  const [roundNotes, setRoundNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // Edit mode for recap
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadRound() {
      try {
        const res = await fetch(`/api/rounds/${roundId}`);
        if (res.ok) {
          const data = (await res.json()) as RoundDetail;
          setRound(data);
          if (data.recap_text) {
            setRecapText(data.recap_text);
          }
          if (data.round_notes) {
            setRoundNotes(data.round_notes);
          }
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
    loadRound();
  }, [roundId]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError("");
    try {
      // Save notes first if non-empty
      if (roundNotes.trim()) {
        setSavingNotes(true);
        await fetch(`/api/rounds/${roundId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ round_notes: roundNotes.trim() }),
        });
        setSavingNotes(false);
      }

      const res = await fetch("/api/recap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ round_id: roundId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to generate recap.");
        return;
      }

      const data = await res.json();
      setRecapText(data.recap_text);
      setEditing(false);
    } catch {
      setError("Something went wrong while generating the recap.");
    } finally {
      setGenerating(false);
      setSavingNotes(false);
    }
  }, [roundId, roundNotes]);

  // URL 带 ?regenerate=1 时自动触发重新生成
  const autoRegenRef = useRef(false);
  useEffect(() => {
    if (shouldRegenerate && !loading && round && !autoRegenRef.current) {
      autoRegenRef.current = true;
      handleGenerate();
    }
  }, [shouldRegenerate, loading, round, handleGenerate]);

  const handleSaveEdit = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/rounds/${roundId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recap_text: editText }),
      });
      if (res.ok) {
        setRecapText(editText);
        setEditing(false);
      }
    } catch {
      setError("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }, [roundId, editText]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-secondary text-[0.9375rem]">Loading...</p>
      </div>
    );
  }

  if (!round) {
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

  if (generating) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-secondary text-[0.9375rem]">
          {savingNotes ? "Saving notes..." : "Generating your analysis..."}
        </p>
      </div>
    );
  }

  // Already has recap — show / edit
  if (recapText) {
    return (
      <div className="flex flex-col gap-4">
        <Link href={`/rounds/${roundId}`}>
          <span className="text-accent text-[0.8125rem] font-medium hover:underline cursor-pointer">
            &larr; Back to round
          </span>
        </Link>

        {editing ? (
          <>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full min-h-[400px] rounded-lg border border-divider p-4 text-[0.9375rem] text-text leading-relaxed focus:border-accent focus:ring-1 focus:ring-accent outline-none resize-y"
            />
            <div className="flex gap-3">
              <Button onClick={handleSaveEdit} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="secondary" onClick={() => setEditing(false)}>
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
                  setEditText(recapText);
                  setEditing(true);
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

        {error && (
          <p className="text-red-600 text-[0.875rem]">{error}</p>
        )}
      </div>
    );
  }

  // Not yet generated — show scorecard + notes + generate button
  const dateStr = new Date(round.played_date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/rounds/${roundId}`}>
          <span className="text-accent text-[0.8125rem] font-medium hover:underline cursor-pointer">
            &larr; Back to round
          </span>
        </Link>
        <h1 className="text-[1.875rem] font-semibold text-text mt-2">
          Post-Round Analysis
        </h1>
        <p className="text-[0.9375rem] text-secondary mt-1">
          {round.course_name ?? "Unknown Course"} &mdash; {round.tee_name ?? ""}{" "}
          &#183; {dateStr}
        </p>
      </div>

      {/* Scorecard */}
      {round.holes && round.holes.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-[1rem] font-semibold text-text">Scorecard</h2>
          <RoundSummary
            holes={round.holes}
            courseHoles={round.course_holes ?? []}
          />
        </div>
      )}

      {/* Round notes */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="round-notes"
          className="text-[1rem] font-semibold text-text"
        >
          Round Notes
        </label>
        <p className="text-[0.8125rem] text-secondary">
          Anything on your mind? Conditions, how you felt, specific struggles or
          moments — your caddie will factor this into the analysis.
        </p>
        <textarea
          id="round-notes"
          value={roundNotes}
          onChange={(e) => setRoundNotes(e.target.value)}
          placeholder="e.g. Wind was brutal on the back nine. Lost focus after hole 12. Putter felt great today..."
          rows={4}
          className="w-full rounded-lg border border-divider p-3 text-[0.9375rem] text-text leading-relaxed placeholder:text-secondary/50 focus:border-accent focus:ring-1 focus:ring-accent outline-none resize-y"
        />
      </div>

      {error && (
        <p className="text-red-600 text-[0.875rem]">{error}</p>
      )}

      <Button onClick={handleGenerate} className="w-full">
        Generate Analysis
      </Button>
    </div>
  );
}

export default function RecapPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <p className="text-secondary text-[0.9375rem]">Loading...</p>
        </div>
      }
    >
      <RecapContent />
    </Suspense>
  );
}

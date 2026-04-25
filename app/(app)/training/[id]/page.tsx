"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { TrainingJournal } from "@/lib/db/types";

const REFLECTION_PROMPTS = [
  "What did you actually work on?",
  "What clicked today? What didn't?",
  "Any swing or technique discovery?",
  "How did it feel mentally?",
  "What would you do differently?",
  "Anything to carry into next session?",
];

function formatDate(dateStr: string) {
  const raw = dateStr.split("T")[0];
  return new Date(raw + "T12:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function TrainingJournalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [journal, setJournal] = useState<TrainingJournal | null>(null);
  const [loading, setLoading] = useState(true);
  const [reflection, setReflection] = useState("");
  const [savingReflection, setSavingReflection] = useState(false);
  const [gettingFeedback, setGettingFeedback] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/training-journal/${id}`)
      .then((r) => r.json())
      .then((data: TrainingJournal) => {
        setJournal(data);
        setReflection(data.reflection ?? "");
      })
      .catch(() => setError("Couldn't load this session."))
      .finally(() => setLoading(false));
  }, [id]);

  async function saveReflection() {
    if (!reflection.trim()) return;
    setSavingReflection(true);
    setError("");
    try {
      const res = await fetch(`/api/training-journal/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reflection: reflection.trim(),
          status: "completed",
        }),
      });
      if (!res.ok) throw new Error();
      const updated: TrainingJournal = await res.json();
      setJournal(updated);
    } catch {
      setError("Couldn't save reflection. Try again.");
    } finally {
      setSavingReflection(false);
    }
  }

  async function getAiFeedback() {
    setGettingFeedback(true);
    setError("");
    try {
      const res = await fetch(`/api/training-journal/${id}/feedback`, { method: "POST" });
      if (!res.ok) throw new Error();
      const updated: TrainingJournal = await res.json();
      setJournal(updated);
    } catch {
      setError("Couldn't get AI feedback. Try again.");
    } finally {
      setGettingFeedback(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-secondary text-[0.9375rem]">Loading...</p>
      </div>
    );
  }

  if (!journal) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-secondary text-[0.9375rem]">{error || "Session not found."}</p>
        <button onClick={() => router.push("/training")} className="text-accent text-[0.9375rem] font-medium hover:underline cursor-pointer">
          Back to Journal
        </button>
      </div>
    );
  }

  const reflectionSaved = !!journal.reflection;
  const reflectionChanged = reflection.trim() !== (journal.reflection ?? "").trim();

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => router.push("/training")}
            className="text-[0.875rem] text-secondary hover:text-text transition-colors mb-2 cursor-pointer"
          >
            ← Training Journal
          </button>
          <h1 className="text-[1.75rem] font-semibold text-text">{journal.focus_area}</h1>
          <p className="text-[0.9375rem] text-secondary mt-0.5">
            {formatDate(journal.session_date)}
            {journal.location ? ` · ${journal.location}` : ""}
          </p>
        </div>
      </div>

      {/* Plan */}
      <Card>
        <p className="text-[0.75rem] font-semibold text-secondary uppercase tracking-wide mb-2">Your Plan</p>
        <p className="text-[0.9375rem] text-text whitespace-pre-wrap">{journal.plan}</p>
      </Card>

      {/* Reflection */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[0.75rem] font-semibold text-secondary uppercase tracking-wide">Reflection</p>
          <button
            onClick={() => setShowPrompts((v) => !v)}
            className="text-[0.75rem] text-accent hover:underline cursor-pointer"
          >
            {showPrompts ? "Hide prompts" : "What to write about?"}
          </button>
        </div>

        {showPrompts && (
          <ul className="mb-3 flex flex-col gap-1">
            {REFLECTION_PROMPTS.map((p) => (
              <li key={p} className="text-[0.8125rem] text-secondary flex gap-2">
                <span className="text-secondary/50">·</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        )}

        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="How did it go? Write anything — no pressure."
          rows={6}
          className="w-full border border-divider rounded-lg px-3 py-2 text-[0.9375rem] text-text bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 placeholder:text-secondary/60 resize-none"
        />

        {(reflectionChanged || !reflectionSaved) && reflection.trim() && (
          <div className="mt-3">
            <Button onClick={saveReflection} disabled={savingReflection}>
              {savingReflection ? "Saving..." : "Save Reflection"}
            </Button>
          </div>
        )}
      </Card>

      {/* AI Feedback */}
      {reflectionSaved && !journal.ai_feedback && (
        <Card>
          <p className="text-[0.75rem] font-semibold text-secondary uppercase tracking-wide mb-2">AI Coach Feedback</p>
          <p className="text-[0.875rem] text-secondary mb-3">
            Get structured feedback from your AI coach based on your plan and reflection.
          </p>
          <Button onClick={getAiFeedback} disabled={gettingFeedback}>
            {gettingFeedback ? "Analysing session..." : "Get AI Feedback"}
          </Button>
        </Card>
      )}

      {journal.ai_feedback && (
        <Card>
          <p className="text-[0.75rem] font-semibold text-secondary uppercase tracking-wide mb-3">AI Coach Feedback</p>
          <div className="text-[0.9375rem] text-text whitespace-pre-wrap leading-relaxed">
            {journal.ai_feedback}
          </div>
          {journal.ai_feedback_at && (
            <p className="text-[0.75rem] text-secondary/60 mt-3">
              Reviewed {new Date(journal.ai_feedback_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          )}
        </Card>
      )}

      {error && <p className="text-red-500 text-[0.875rem]">{error}</p>}
    </div>
  );
}

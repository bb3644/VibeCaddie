"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FocusAreaPicker } from "@/components/training/focus-area-picker";
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
  const [error, setError] = useState("");

  // Reflection state
  const [reflection, setReflection] = useState("");
  const [savingReflection, setSavingReflection] = useState(false);
  const [editingReflection, setEditingReflection] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);

  // Plan edit state
  const [editing, setEditing] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editFocusAreas, setEditFocusAreas] = useState<string[]>([]);
  const [editPlan, setEditPlan] = useState("");
  const [savingPlan, setSavingPlan] = useState(false);

  // AI feedback
  const [gettingFeedback, setGettingFeedback] = useState(false);

  // Delete
  const [deleting, setDeleting] = useState(false);

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

  function startEditing(j: TrainingJournal) {
    setEditDate(j.session_date.split("T")[0]);
    setEditLocation(j.location ?? "");
    setEditFocusAreas(j.focus_area ? j.focus_area.split(", ").map((s) => s.trim()).filter(Boolean) : []);
    setEditPlan(j.plan);
    setEditing(true);
  }

  async function savePlan() {
    if (editFocusAreas.length === 0 || !editPlan.trim()) return;
    setSavingPlan(true);
    setError("");
    try {
      const res = await fetch(`/api/training-journal/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_date: editDate,
          location: editLocation.trim() || null,
          focus_area: editFocusAreas.join(", "),
          plan: editPlan.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      const updated: TrainingJournal = await res.json();
      setJournal(updated);
      setEditing(false);
    } catch {
      setError("Couldn't save changes. Try again.");
    } finally {
      setSavingPlan(false);
    }
  }

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
          status: journal?.status === "planned" ? "completed" : journal?.status,
        }),
      });
      if (!res.ok) throw new Error();
      const updated: TrainingJournal = await res.json();
      setJournal(updated);
      setReflection(updated.reflection ?? "");
      setEditingReflection(false);
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

  async function handleDelete() {
    if (!confirm("Delete this training session? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/training-journal/${id}`, { method: "DELETE" });
      if (res.ok) router.push("/training");
    } catch {
      setError("Couldn't delete. Try again.");
      setDeleting(false);
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

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push("/training")}
          className="text-[0.875rem] text-secondary hover:text-text transition-colors mb-2 cursor-pointer"
        >
          ← Training Journal
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[1.75rem] font-semibold text-text">{journal.focus_area}</h1>
            <p className="text-[0.9375rem] text-secondary mt-0.5">
              {formatDate(journal.session_date)}
              {journal.location ? ` · ${journal.location}` : ""}
            </p>
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-shrink-0 p-1.5 rounded-md text-secondary hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer mt-1"
            title="Delete session"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Plan — view or edit */}
      <Card>
        {editing ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.875rem] font-medium text-text">Date</label>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full border border-divider rounded-lg px-3 py-2 text-[0.9375rem] text-text bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.875rem] font-medium text-text">
                Location <span className="text-secondary font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                placeholder="e.g. Range at Oak Hills"
                className="w-full border border-divider rounded-lg px-3 py-2 text-[0.9375rem] text-text bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 placeholder:text-secondary/60"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[0.875rem] font-medium text-text">Focus Areas</label>
              <FocusAreaPicker selected={editFocusAreas} onChange={setEditFocusAreas} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.875rem] font-medium text-text">Plan</label>
              <textarea
                value={editPlan}
                onChange={(e) => setEditPlan(e.target.value)}
                rows={5}
                className="w-full border border-divider rounded-lg px-3 py-2 text-[0.9375rem] text-text bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={savePlan} disabled={savingPlan || editFocusAreas.length === 0 || !editPlan.trim()}>
                {savingPlan ? "Saving..." : "Save Changes"}
              </Button>
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 text-[0.9375rem] text-secondary hover:text-text transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[0.75rem] font-semibold text-secondary uppercase tracking-wide">Your Plan</p>
              <button
                onClick={() => startEditing(journal)}
                className="text-[0.75rem] text-accent hover:underline cursor-pointer"
              >
                Edit
              </button>
            </div>
            <p className="text-[0.9375rem] text-text whitespace-pre-wrap">{journal.plan}</p>
          </div>
        )}
      </Card>

      {/* Reflection */}
      <Card>
        {reflectionSaved && !editingReflection ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[0.75rem] font-semibold text-secondary uppercase tracking-wide">Reflection</p>
              <button
                onClick={() => setEditingReflection(true)}
                className="text-[0.75rem] text-accent hover:underline cursor-pointer"
              >
                Edit
              </button>
            </div>
            <p className="text-[0.9375rem] text-text whitespace-pre-wrap">{journal.reflection}</p>
          </div>
        ) : (
          <div>
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

            <div className="flex gap-3 mt-3">
              <Button onClick={saveReflection} disabled={savingReflection || !reflection.trim()}>
                {savingReflection ? "Saving..." : "Save Reflection"}
              </Button>
              {editingReflection && (
                <button
                  onClick={() => { setReflection(journal.reflection ?? ""); setEditingReflection(false); }}
                  className="px-4 py-2 text-[0.9375rem] text-secondary hover:text-text transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
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

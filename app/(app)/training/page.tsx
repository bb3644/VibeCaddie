"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { TrainingJournal } from "@/lib/db/types";

const STATUS_LABEL: Record<TrainingJournal["status"], string> = {
  planned: "Planned",
  completed: "Completed",
  reviewed: "AI Reviewed",
};

const STATUS_COLOR: Record<TrainingJournal["status"], string> = {
  planned: "text-amber-600 bg-amber-50",
  completed: "text-blue-600 bg-blue-50",
  reviewed: "text-green-700 bg-green-50",
};

function formatDate(dateStr: string) {
  const raw = dateStr.split("T")[0];
  return new Date(raw + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function TrainingJournalPage() {
  const [journals, setJournals] = useState<TrainingJournal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/training-journal")
      .then((r) => r.json())
      .then((data) => setJournals(data))
      .catch(() => setError("Couldn't load training sessions."))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this training session? This cannot be undone.")) return;
    const res = await fetch(`/api/training-journal/${id}`, { method: "DELETE" });
    if (res.ok) setJournals((prev) => prev.filter((j) => j.id !== id));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-secondary text-[0.9375rem]">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-secondary text-[0.9375rem]">{error}</p>
        <button onClick={() => window.location.reload()} className="text-accent text-[0.9375rem] font-medium hover:underline cursor-pointer">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[1.875rem] font-semibold text-text">Training Journal</h1>
          <p className="text-[0.9375rem] text-secondary mt-1">Plan sessions, reflect, and get AI coaching.</p>
        </div>
        <Link href="/training/new">
          <Button>New Session</Button>
        </Link>
      </div>

      {journals.length === 0 ? (
        <Card>
          <p className="text-center text-secondary text-[0.9375rem] py-8">
            No training sessions yet. Log one and start building your practice habit.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {journals.map((j) => (
            <Link key={j.id} href={`/training/${j.id}`}>
              <Card className="hover:shadow-md transition-shadow duration-150 cursor-pointer">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[0.9375rem] font-medium text-text">{j.focus_area}</p>
                      <span className={`text-[0.6875rem] font-medium px-1.5 py-0.5 rounded-full ${STATUS_COLOR[j.status]}`}>
                        {STATUS_LABEL[j.status]}
                      </span>
                    </div>
                    <p className="text-[0.8125rem] text-secondary mt-0.5">
                      {formatDate(j.session_date)}
                      {j.location ? ` · ${j.location}` : ""}
                    </p>
                    <p className="text-[0.8125rem] text-secondary/80 mt-1 line-clamp-2">{j.plan}</p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(j.id, e)}
                    className="p-1.5 rounded-md text-secondary hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer flex-shrink-0"
                    title="Delete session"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

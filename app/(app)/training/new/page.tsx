"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const FOCUS_AREAS = [
  "Driving",
  "Fairway woods",
  "Long irons",
  "Mid irons",
  "Short irons",
  "Chipping",
  "Pitching",
  "Bunker shots",
  "Putting",
  "Short game",
  "Course management",
  "Mental game",
  "Full swing",
  "Other",
];

export function FocusAreaPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (areas: string[]) => void;
}) {
  function toggle(area: string) {
    onChange(
      selected.includes(area)
        ? selected.filter((a) => a !== area)
        : [...selected, area]
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {FOCUS_AREAS.map((area) => {
        const active = selected.includes(area);
        return (
          <button
            key={area}
            type="button"
            onClick={() => toggle(area)}
            className={`px-3 py-1.5 rounded-full text-[0.8125rem] font-medium border transition-colors cursor-pointer ${
              active
                ? "bg-accent text-white border-accent"
                : "bg-white text-secondary border-divider hover:border-accent/50 hover:text-text"
            }`}
          >
            {area}
          </button>
        );
      })}
    </div>
  );
}

export default function NewTrainingSessionPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const [sessionDate, setSessionDate] = useState(today);
  const [location, setLocation] = useState("");
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [plan, setPlan] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (focusAreas.length === 0 || !plan.trim()) {
      setError("Select at least one focus area and add your plan.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/training-journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_date: sessionDate,
          location: location.trim() || undefined,
          focus_area: focusAreas.join(", "),
          plan: plan.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const journal = await res.json();
      router.push(`/training/${journal.id}`);
    } catch {
      setError("Couldn't save the session. Try again.");
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <h1 className="text-[1.875rem] font-semibold text-text">New Training Session</h1>
        <p className="text-[0.9375rem] text-secondary mt-1">Plan what you&apos;re going to work on today.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Card>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.875rem] font-medium text-text">Date</label>
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full border border-divider rounded-lg px-3 py-2 text-[0.9375rem] text-text bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[0.875rem] font-medium text-text">
                Location <span className="text-secondary font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Range at Oak Hills"
                className="w-full border border-divider rounded-lg px-3 py-2 text-[0.9375rem] text-text bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 placeholder:text-secondary/60"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[0.875rem] font-medium text-text">Focus Areas</label>
              <FocusAreaPicker selected={focusAreas} onChange={setFocusAreas} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[0.875rem] font-medium text-text">Your Plan</label>
              <textarea
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                placeholder="What are you going to work on? Be specific — drills, goals, yardages, anything."
                rows={5}
                className="w-full border border-divider rounded-lg px-3 py-2 text-[0.9375rem] text-text bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 placeholder:text-secondary/60 resize-none"
              />
            </div>
          </div>
        </Card>

        {error && <p className="text-red-500 text-[0.875rem]">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save & Go Train"}
          </Button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-[0.9375rem] text-secondary hover:text-text transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

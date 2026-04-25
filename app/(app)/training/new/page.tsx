"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const FOCUS_AREAS = [
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

export default function NewTrainingSessionPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    session_date: today,
    location: "",
    focus_area: "",
    plan: "",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.focus_area || !form.plan.trim()) {
      setError("Focus area and plan are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/training-journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_date: form.session_date,
          location: form.location.trim() || undefined,
          focus_area: form.focus_area,
          plan: form.plan.trim(),
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
                value={form.session_date}
                onChange={(e) => set("session_date", e.target.value)}
                className="w-full border border-divider rounded-lg px-3 py-2 text-[0.9375rem] text-text bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[0.875rem] font-medium text-text">Location <span className="text-secondary font-normal">(optional)</span></label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="e.g. Range at Oak Hills"
                className="w-full border border-divider rounded-lg px-3 py-2 text-[0.9375rem] text-text bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 placeholder:text-secondary/60"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[0.875rem] font-medium text-text">Focus Area</label>
              <select
                value={form.focus_area}
                onChange={(e) => set("focus_area", e.target.value)}
                className="w-full border border-divider rounded-lg px-3 py-2 text-[0.9375rem] text-text bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                <option value="">Select a focus area...</option>
                {FOCUS_AREAS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[0.875rem] font-medium text-text">Your Plan</label>
              <textarea
                value={form.plan}
                onChange={(e) => set("plan", e.target.value)}
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

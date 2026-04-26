"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FocusAreaPicker } from "@/components/training/focus-area-picker";

type Duration = "half-day" | "full-day";
type Activity = "range" | "practice-round" | "both";

function ToggleGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string; sub?: string }[];
  value: T | "";
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[0.875rem] font-medium text-text">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex flex-col items-start px-4 py-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
              value === opt.value
                ? "bg-accent text-white border-accent"
                : "bg-white text-secondary border-divider hover:border-accent/50 hover:text-text"
            }`}
          >
            <span className="text-[0.875rem] font-medium">{opt.label}</span>
            {opt.sub && <span className={`text-[0.75rem] mt-0.5 ${value === opt.value ? "text-white/70" : "text-secondary/70"}`}>{opt.sub}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function NewTrainingSessionPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [error, setError] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const [sessionDate, setSessionDate] = useState(today);
  const [location, setLocation] = useState("");
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [duration, setDuration] = useState<Duration | "">("");
  const [activity, setActivity] = useState<Activity | "">("");
  const [plan, setPlan] = useState("");

  async function generatePlan() {
    if (focusAreas.length === 0 || !duration || !activity) {
      setError("Select focus areas, duration, and activity type before generating a plan.");
      return;
    }
    setGeneratingPlan(true);
    setError("");
    try {
      const res = await fetch("/api/training-journal/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ focus_areas: focusAreas, duration, activity }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPlan(data.plan);
    } catch {
      setError("Couldn't generate a plan. Try again.");
    } finally {
      setGeneratingPlan(false);
    }
  }

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

  const canGenerate = focusAreas.length > 0 && duration !== "" && activity !== "";

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <h1 className="text-[1.875rem] font-semibold text-text">New Training Session</h1>
        <p className="text-[0.9375rem] text-secondary mt-1">Plan your day — or let the AI coach build one for you.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Card>
          <div className="flex flex-col gap-5">
            {/* Date & Location */}
            <div className="flex gap-3">
              <div className="flex flex-col gap-1.5 flex-1">
                <label className="text-[0.875rem] font-medium text-text">Date</label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-full border border-divider rounded-lg px-3 py-2 text-[0.9375rem] text-text bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div className="flex flex-col gap-1.5 flex-1">
                <label className="text-[0.875rem] font-medium text-text">Location <span className="text-secondary font-normal">(optional)</span></label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Oak Hills Range"
                  className="w-full border border-divider rounded-lg px-3 py-2 text-[0.9375rem] text-text bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 placeholder:text-secondary/60"
                />
              </div>
            </div>

            {/* Focus Areas */}
            <div className="flex flex-col gap-2">
              <label className="text-[0.875rem] font-medium text-text">Focus Areas</label>
              <FocusAreaPicker selected={focusAreas} onChange={setFocusAreas} />
            </div>

            {/* Duration */}
            <ToggleGroup
              label="Duration"
              value={duration}
              onChange={setDuration}
              options={[
                { value: "half-day", label: "Half day", sub: "~2 hours" },
                { value: "full-day", label: "Full day", sub: "~4 hours" },
              ]}
            />

            {/* Activity */}
            <ToggleGroup
              label="What are you doing today?"
              value={activity}
              onChange={setActivity}
              options={[
                { value: "range", label: "Range & practice", sub: "Drills, technique work" },
                { value: "practice-round", label: "Practice round", sub: "On-course play" },
                { value: "both", label: "Both", sub: "Practice then play" },
              ]}
            />

            {/* Generate Plan */}
            <div className="border-t border-divider pt-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[0.875rem] font-medium text-text">AI-Generated Plan</p>
                  <p className="text-[0.75rem] text-secondary mt-0.5">Your coach builds a plan based on your selections above.</p>
                </div>
                <button
                  type="button"
                  onClick={generatePlan}
                  disabled={generatingPlan || !canGenerate}
                  className={`px-4 py-2 rounded-lg text-[0.875rem] font-medium border transition-colors cursor-pointer ${
                    canGenerate && !generatingPlan
                      ? "bg-accent text-white border-accent hover:bg-accent/90"
                      : "bg-white text-secondary border-divider cursor-not-allowed opacity-50"
                  }`}
                >
                  {generatingPlan ? "Generating..." : "Generate Plan"}
                </button>
              </div>

              {/* Plan textarea — always visible, pre-filled by AI or typed manually */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.875rem] font-medium text-text">
                  Your Plan
                  {plan && <span className="text-secondary font-normal ml-1">(edit as needed)</span>}
                </label>
                <textarea
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  placeholder={
                    canGenerate
                      ? "Hit Generate Plan above, or write your own plan here."
                      : "Select focus areas, duration, and activity — then generate a plan or write your own."
                  }
                  rows={8}
                  className="w-full border border-divider rounded-lg px-3 py-2 text-[0.9375rem] text-text bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 placeholder:text-secondary/60 resize-none"
                />
              </div>
            </div>
          </div>
        </Card>

        {error && <p className="text-red-500 text-[0.875rem]">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={saving || !plan.trim() || focusAreas.length === 0}>
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

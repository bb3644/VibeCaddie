"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { PlayerProfile } from "@/lib/db/types";

function IndicativeHandicap({
  value,
  onRecalculated,
}: {
  value: number | null;
  onRecalculated: (index: number | null) => void;
}) {
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState("");

  async function handleRecalculate() {
    setRecalculating(true);
    setError("");
    try {
      const res = await fetch("/api/profile/recalculate-index", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      onRecalculated(data.vibecaddie_index);
    } catch {
      setError("Could not calculate. Make sure you have 3+ completed rounds on courses with ratings.");
    } finally {
      setRecalculating(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5 pt-1">
      <div className="flex items-center justify-between">
        <span className="text-[0.8125rem] text-secondary font-medium uppercase tracking-wide">Indicative Handicap</span>
        <button
          onClick={handleRecalculate}
          disabled={recalculating}
          className="text-[0.75rem] text-accent font-medium hover:underline disabled:opacity-50 cursor-pointer"
        >
          {recalculating ? "Calculating..." : "Recalculate"}
        </button>
      </div>
      {value != null ? (
        <>
          <span className="text-[1.125rem] font-bold text-accent">{Number(value).toFixed(1)}</span>
          <span className="text-[0.75rem] text-secondary">Auto-calculated from your scored rounds · used by AI Caddy</span>
        </>
      ) : (
        <span className="text-[0.875rem] text-secondary">
          Not calculated yet — tap Recalculate after completing 3+ rounds on courses with ratings.
        </span>
      )}
      {error && <span className="text-[0.75rem] text-red-500">{error}</span>}
    </div>
  );
}

interface ProfileFormProps {
  initial: PlayerProfile | null;
  onSaved: (profile: PlayerProfile) => void;
}

const SEX_OPTIONS = [
  { value: "", label: "-- Optional --" },
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
];

export function ProfileForm({ initial, onSaved }: ProfileFormProps) {
  const [savedProfile, setSavedProfile] = useState<PlayerProfile | null>(initial);
  const [editing, setEditing] = useState(!initial?.name);

  const [name, setName] = useState(initial?.name ?? "");
  const [sex, setSex] = useState(initial?.sex ?? "");
  const [age, setAge] = useState(initial?.age?.toString() ?? "");
  const [handicap, setHandicap] = useState(initial?.handicap_index?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    setFeedback("");
    try {
      const body: Record<string, unknown> = { name: name.trim() };
      if (sex) body.sex = sex;
      if (age) body.age = Number(age);
      if (handicap) body.handicap_index = Number(handicap);

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to save");
      const profile = (await res.json()) as PlayerProfile;
      setSavedProfile(profile);
      onSaved(profile);
      setEditing(false);
    } catch {
      setFeedback("Error saving profile");
    } finally {
      setSaving(false);
    }
  }

  // ── View mode ──────────────────────────────────────────────────────────────
  if (!editing && savedProfile) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <div>
            <p className="text-[0.75rem] text-secondary uppercase tracking-wide mb-0.5">Name</p>
            <p className="text-[0.9375rem] font-medium text-text">{savedProfile.name || "—"}</p>
          </div>
          <div>
            <p className="text-[0.75rem] text-secondary uppercase tracking-wide mb-0.5">Sex</p>
            <p className="text-[0.9375rem] font-medium text-text">{savedProfile.sex || "—"}</p>
          </div>
          <div>
            <p className="text-[0.75rem] text-secondary uppercase tracking-wide mb-0.5">Age</p>
            <p className="text-[0.9375rem] font-medium text-text">{savedProfile.age ?? "—"}</p>
          </div>
          <div>
            <p className="text-[0.75rem] text-secondary uppercase tracking-wide mb-0.5">Handicap Index</p>
            <p className="text-[0.9375rem] font-medium text-text">
              {savedProfile.handicap_index != null ? Number(savedProfile.handicap_index).toFixed(1) : "—"}
            </p>
          </div>
          <div className="col-span-2">
            <IndicativeHandicap
              value={savedProfile.vibecaddie_index}
              onRecalculated={(idx) => setSavedProfile({ ...savedProfile, vibecaddie_index: idx })}
            />
          </div>
        </div>
        <div>
          <Button variant="secondary" onClick={() => setEditing(true)}>Edit Profile</Button>
        </div>
      </div>
    );
  }

  // ── Edit mode ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      <Input label="Name" value={name} onChange={setName} placeholder="Your name" />
      <Select label="Sex" value={sex} onChange={setSex} options={SEX_OPTIONS} />
      <Input label="Age" value={age} onChange={setAge} type="number" placeholder="Optional" />
      <Input
        label="Official Handicap Index"
        value={handicap}
        onChange={setHandicap}
        type="number"
        placeholder="e.g. 15.2"
      />
      {savedProfile && (
        <IndicativeHandicap
          value={savedProfile.vibecaddie_index}
          onRecalculated={(idx) => setSavedProfile({ ...savedProfile, vibecaddie_index: idx })}
        />
      )}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? "Saving..." : "Save Profile"}
        </Button>
        {savedProfile && (
          <Button variant="ghost" onClick={() => { setEditing(false); }}>
            Cancel
          </Button>
        )}
        {feedback && (
          <span className="text-[0.875rem] text-red-500">{feedback}</span>
        )}
      </div>
    </div>
  );
}

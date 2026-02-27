"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface LookupHole {
  hole_number: number;
  par: number;
  yardage: number;
  si: number;
  hole_note?: string;
}

interface LookupTee {
  tee_name: string;
  tee_color: string;
  par_total: number;
  course_rating?: number;
  slope_rating?: number;
  holes: LookupHole[];
}

interface LookupResult {
  course_name: string;
  location: string;
  tees: LookupTee[];
  confidence: "high" | "medium" | "low";
  source: "google_search" | "photo_ocr" | "manual";
  source_url?: string;
}

interface CourseLookupProps {
  onResult: (result: LookupResult) => void;
}

/** 在线搜索球场记分卡（仅搜索输入，预览由父组件处理） */
export function CourseLookup({ onResult }: CourseLookupProps) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch() {
    if (!name.trim()) {
      setError("Please enter a course name.");
      return;
    }

    setError("");
    setSearching(true);

    try {
      const res = await fetch("/api/courses/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          location: location.trim() || undefined,
        }),
      });

      if (!res.ok) {
        let errorMsg = "Search failed";
        try {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
        } catch { /* empty body */ }
        throw new Error(errorMsg);
      }

      const text = await res.text();
      if (!text) throw new Error("Empty response from server. Please try again.");
      const data = JSON.parse(text);

      if (!data.tees || data.tees.length === 0) {
        throw new Error("No tee data found for this course.");
      }

      onResult(data as LookupResult);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Input
        label="Course Name"
        value={name}
        onChange={setName}
        placeholder="e.g. Sudbury Golf Club"
      />
      <Input
        label="Location (optional)"
        value={location}
        onChange={setLocation}
        placeholder="e.g. Suffolk, England"
      />
      <Button onClick={handleSearch} disabled={searching}>
        {searching ? "Searching... (may take 15s)" : "Search Online"}
      </Button>
      {error && (
        <p className="text-[0.8125rem] text-red-500">{error}</p>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/section-title";
import type { Course, CourseTee } from "@/lib/db/types";

// ---------- Types ----------

interface LookupHole {
  hole_number: number;
  par: number;
  yardage: number;
  si: number;
}

interface LookupTee {
  tee_name: string;
  tee_color: string;
  par_total: number;
  holes: LookupHole[];
}

interface LookupResult {
  course_name: string;
  location: string;
  tees: LookupTee[];
  source_url?: string;
  confidence: "high" | "medium" | "low";
}

type LookupState = "idle" | "searching" | "preview" | "saving";

// ---------- Confidence Badge ----------

const CONFIDENCE_STYLES = {
  high: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-red-100 text-red-800",
} as const;

function ConfidenceBadge({ level }: { level: LookupResult["confidence"] }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-[0.75rem] font-medium ${CONFIDENCE_STYLES[level]}`}
    >
      {level === "high" ? "High confidence" : level === "medium" ? "Medium confidence" : "Low confidence — review carefully"}
    </span>
  );
}

// ---------- Scorecard Preview Table ----------

function ScorecardTable({ tee }: { tee: LookupTee }) {
  const front9 = tee.holes.filter((h) => h.hole_number <= 9);
  const back9 = tee.holes.filter((h) => h.hole_number > 9);

  const renderHalf = (holes: LookupHole[], label: string) => {
    const totalPar = holes.reduce((s, h) => s + h.par, 0);
    const totalYds = holes.reduce((s, h) => s + h.yardage, 0);
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-[0.75rem] border-collapse">
          <thead>
            <tr className="bg-bg">
              <th className="px-1.5 py-1 text-left font-medium text-secondary border-b border-divider">
                {label}
              </th>
              {holes.map((h) => (
                <th
                  key={h.hole_number}
                  className="px-1.5 py-1 text-center font-medium text-secondary border-b border-divider min-w-[2rem]"
                >
                  {h.hole_number}
                </th>
              ))}
              <th className="px-1.5 py-1 text-center font-semibold text-text border-b border-divider">
                Tot
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-1.5 py-1 font-medium text-secondary border-b border-divider">
                Par
              </td>
              {holes.map((h) => (
                <td
                  key={h.hole_number}
                  className="px-1.5 py-1 text-center border-b border-divider"
                >
                  {h.par}
                </td>
              ))}
              <td className="px-1.5 py-1 text-center font-semibold border-b border-divider">
                {totalPar}
              </td>
            </tr>
            <tr>
              <td className="px-1.5 py-1 font-medium text-secondary border-b border-divider">
                Yds
              </td>
              {holes.map((h) => (
                <td
                  key={h.hole_number}
                  className="px-1.5 py-1 text-center border-b border-divider"
                >
                  {h.yardage}
                </td>
              ))}
              <td className="px-1.5 py-1 text-center font-semibold border-b border-divider">
                {totalYds}
              </td>
            </tr>
            <tr>
              <td className="px-1.5 py-1 font-medium text-secondary">SI</td>
              {holes.map((h) => (
                <td key={h.hole_number} className="px-1.5 py-1 text-center">
                  {h.si}
                </td>
              ))}
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2 p-4 rounded-lg border border-divider bg-white">
      <div className="flex items-center justify-between">
        <span className="text-[0.9375rem] font-semibold text-text">
          {tee.tee_name} Tee
        </span>
        <span className="text-[0.8125rem] text-secondary">
          Par {tee.par_total}
        </span>
      </div>
      {renderHalf(front9, "Out")}
      {renderHalf(back9, "In")}
    </div>
  );
}

// ---------- Main Component ----------

/** 在线搜索球场记分卡 → 预览 → 保存 */
export function CourseLookup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [state, setState] = useState<LookupState>("idle");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState("");

  // ---- 搜索 ----
  async function handleSearch() {
    if (!name.trim()) {
      setError("Please enter a course name.");
      return;
    }

    setError("");
    setResult(null);
    setState("searching");

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
        const data = await res.json();
        throw new Error(data.error || "Search failed");
      }

      const data = (await res.json()) as LookupResult;

      if (!data.tees || data.tees.length === 0) {
        throw new Error("No tee data found for this course.");
      }

      setResult(data);
      setState("preview");
    } catch (err) {
      setError((err as Error).message);
      setState("idle");
    }
  }

  // ---- 保存 ----
  async function handleSave() {
    if (!result) return;
    setState("saving");
    setError("");

    try {
      // 1. 创建球场（force=true 跳过查重，因为用户已确认）
      const courseRes = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: result.course_name,
          location_text: result.location || undefined,
          force: true,
        }),
      });

      if (!courseRes.ok) throw new Error("Failed to create course");
      const course = (await courseRes.json()) as Course;

      // 2. 创建所有 tee + holes
      let firstTee: CourseTee | null = null;

      for (const tee of result.tees) {
        const teeRes = await fetch(`/api/courses/${course.id}/tees`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tee_name: tee.tee_name,
            tee_color: tee.tee_color,
            par_total: tee.par_total,
          }),
        });

        if (!teeRes.ok) throw new Error(`Failed to create ${tee.tee_name} tee`);
        const createdTee = (await teeRes.json()) as CourseTee;

        if (!firstTee) firstTee = createdTee;

        // 3. 批量 upsert holes
        const holesRes = await fetch(
          `/api/courses/${course.id}/tees/${createdTee.id}/holes`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              holes: tee.holes.map((h) => ({
                hole_number: h.hole_number,
                par: h.par,
                yardage: h.yardage,
                si: h.si,
              })),
            }),
          },
        );

        if (!holesRes.ok) throw new Error(`Failed to save holes for ${tee.tee_name} tee`);
      }

      // 跳转到球场详情页
      router.push(`/courses/${course.id}`);
    } catch (err) {
      setError((err as Error).message);
      setState("preview");
    }
  }

  // ---- 重新搜索 ----
  function handleReset() {
    setResult(null);
    setError("");
    setState("idle");
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 搜索输入 */}
      {(state === "idle" || state === "searching") && (
        <>
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
          </div>
          <Button
            onClick={handleSearch}
            disabled={state === "searching"}
          >
            {state === "searching" ? "Searching... (may take 10s)" : "Search Online"}
          </Button>
        </>
      )}

      {/* 预览 */}
      {state === "preview" && result && (
        <>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <h2 className="text-[1.25rem] font-semibold text-text">
                {result.course_name}
              </h2>
              <ConfidenceBadge level={result.confidence} />
            </div>
            {result.location && (
              <p className="text-[0.875rem] text-secondary">
                {result.location}
              </p>
            )}
            {result.source_url && (
              <p className="text-[0.75rem] text-secondary">
                Source:{" "}
                <a
                  href={result.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-accent"
                >
                  {new URL(result.source_url).hostname}
                </a>
              </p>
            )}
          </div>

          <SectionTitle>Scorecard Preview</SectionTitle>

          <div className="flex flex-col gap-4">
            {result.tees.map((tee) => (
              <ScorecardTable key={tee.tee_name} tee={tee} />
            ))}
          </div>

          {result.confidence === "low" && (
            <p className="text-[0.8125rem] text-yellow-700 bg-yellow-50 rounded-lg p-3">
              Low confidence — the data may be inaccurate. Please review each hole carefully before saving,
              or use &quot;Add Manually&quot; instead.
            </p>
          )}

          <div className="flex gap-3">
            <Button onClick={handleSave}>
              Save Course
            </Button>
            <Button variant="secondary" onClick={handleReset}>
              Search Again
            </Button>
          </div>
        </>
      )}

      {/* 保存中 */}
      {state === "saving" && (
        <p className="text-[0.9375rem] text-secondary">
          Saving course and {result?.tees.length} tee{result && result.tees.length > 1 ? "s" : ""}...
        </p>
      )}

      {/* 错误 */}
      {error && (
        <p className="text-[0.8125rem] text-red-500">{error}</p>
      )}
    </div>
  );
}

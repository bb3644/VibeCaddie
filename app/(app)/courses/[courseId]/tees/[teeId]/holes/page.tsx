"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { InfoBanner } from "@/components/ui/info-banner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HoleEditor } from "@/components/course/hole-editor";
import type { Course, CourseTee } from "@/lib/db/types";
import type { LookupResult } from "@/lib/types/scorecard";

interface CourseWithTees extends Course {
  tees: CourseTee[];
}

interface OcrHole {
  hole_number: number;
  par: number;
  yardage: number;
  si?: number;
  hole_note?: string;
}

interface PendingImage {
  id: string;
  file: File;
  preview: string;
  status: "idle" | "extracting" | "done" | "error";
  error?: string;
  result?: LookupResult;
  selectedTeeIdx: number;
}

export default function HolesPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const teeId = params.teeId as string;

  const [courseName, setCourseName] = useState(searchParams.get("course") ?? "");
  const [teeName, setTeeName] = useState(searchParams.get("tee") ?? "");
  const [location, setLocation] = useState(searchParams.get("loc") ?? "");
  const [loading, setLoading] = useState(true);

  const [courseRating, setCourseRating] = useState("");
  const [slopeRating, setSlopeRating] = useState("");
  const [savingRating, setSavingRating] = useState(false);
  const [ratingFeedback, setRatingFeedback] = useState("");

  // Photo upload state
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [fillFromOcr, setFillFromOcr] = useState<OcrHole[] | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/courses/${courseId}`);
        if (res.ok) {
          const data = (await res.json()) as CourseWithTees;
          if (!courseName) {
            setCourseName(data.name);
            setLocation(data.location_text ?? "");
          }
          const tee = data.tees.find((t) => t.id === teeId);
          if (tee) {
            if (!teeName) setTeeName(tee.tee_name);
            setCourseRating(tee.course_rating != null ? String(tee.course_rating) : "");
            setSlopeRating(tee.slope_rating != null ? String(tee.slope_rating) : "");
          }
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [courseId, teeId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSaveRating() {
    const cr = parseFloat(courseRating);
    const sl = parseInt(slopeRating, 10);
    if (isNaN(cr) || cr <= 0 || isNaN(sl) || sl <= 0) {
      setRatingFeedback("Enter valid Course Rating and Slope Rating.");
      setTimeout(() => setRatingFeedback(""), 3000);
      return;
    }
    setSavingRating(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/tees/${teeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_rating: cr, slope_rating: sl }),
      });
      if (res.ok) {
        setRatingFeedback("Saved!");
      } else {
        setRatingFeedback("Failed to save.");
      }
    } catch {
      setRatingFeedback("Network error.");
    } finally {
      setSavingRating(false);
      setTimeout(() => setRatingFeedback(""), 3000);
    }
  }

  function addImage(file: File) {
    setPendingImages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), file, preview: URL.createObjectURL(file), status: "idle", selectedTeeIdx: 0 },
    ]);
  }

  async function extractAll() {
    const toExtract = pendingImages.filter((i) => i.status === "idle" || i.status === "error");
    if (toExtract.length === 0) return;

    // Mark all as extracting
    setPendingImages((prev) =>
      prev.map((i) =>
        i.status === "idle" || i.status === "error" ? { ...i, status: "extracting", error: undefined } : i
      )
    );

    // Extract each in parallel
    await Promise.all(
      toExtract.map(async (img) => {
        try {
          const formData = new FormData();
          formData.append("image", img.file);
          const res = await fetch("/api/courses/ocr", { method: "POST", body: formData });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Extraction failed");
          }
          const result = (await res.json()) as LookupResult;
          if (!result.tees || result.tees.length === 0) throw new Error("No scorecard data found.");
          setPendingImages((prev) =>
            prev.map((i) => (i.id === img.id ? { ...i, status: "done", result } : i))
          );
        } catch (err) {
          setPendingImages((prev) =>
            prev.map((i) => (i.id === img.id ? { ...i, status: "error", error: (err as Error).message } : i))
          );
        }
      })
    );
  }

  function applyToHoles() {
    const merged: Record<number, OcrHole> = {};
    for (const img of pendingImages) {
      if (img.status !== "done" || !img.result) continue;
      const tee = img.result.tees[img.selectedTeeIdx] ?? img.result.tees[0];
      if (!tee?.holes) continue;
      for (const hole of tee.holes) {
        merged[hole.hole_number] = {
          hole_number: hole.hole_number,
          par: hole.par,
          yardage: hole.yardage,
          si: hole.si,
          hole_note: hole.hole_note,
        };
      }
    }
    const arr = Object.values(merged).sort((a, b) => a.hole_number - b.hole_number);
    if (arr.length > 0) setFillFromOcr(arr);
    setPendingImages([]);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-secondary text-[0.9375rem]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 返回链接 */}
      <Link
        href={`/courses/${courseId}`}
        className="text-[0.8125rem] text-accent hover:underline self-start"
      >
        &larr; Back to {courseName || "course"}
      </Link>

      {/* 标题区域 */}
      <div>
        <p className="text-[0.75rem] font-medium text-secondary uppercase tracking-wide">
          Course Setup
        </p>
        <h1 className="text-[1.875rem] font-semibold text-text leading-tight mt-1">
          {courseName || "Course"}
          {teeName && (
            <span className="text-secondary font-normal">
              {" "}&mdash; {teeName} Tee
            </span>
          )}
        </h1>
        {location && (
          <p className="text-[0.875rem] text-secondary mt-0.5">{location}</p>
        )}
      </div>

      {/* 协作提示 */}
      <InfoBanner>
        Fill in what you remember — par, yardage, stroke index, and hole
        notes. Approximate is fine. Other players can add what you missed.
      </InfoBanner>

      {/* Scorecard Photo Upload */}
      <div className="flex flex-col gap-3 p-4 rounded-lg border border-divider bg-white">
        <p className="text-[0.875rem] font-medium text-text">Fill from scorecard photo</p>
        <p className="text-[0.75rem] text-secondary -mt-1">
          Upload photos of the scorecard. If it spans two images, add both before extracting.
        </p>

        {/* Image list */}
        {pendingImages.length > 0 && (
          <div className="flex flex-col gap-2">
            {pendingImages.map((img, idx) => (
              <div key={img.id} className="flex items-center gap-3 p-2 rounded-md border border-divider bg-bg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.preview}
                  alt={`Scorecard ${idx + 1}`}
                  className="w-14 h-14 object-cover rounded border border-divider shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[0.8125rem] text-text truncate">{img.file.name}</p>
                  {img.status === "extracting" && (
                    <p className="text-[0.75rem] text-secondary mt-0.5">Extracting…</p>
                  )}
                  {img.status === "error" && (
                    <p className="text-[0.75rem] text-red-500 mt-0.5">{img.error}</p>
                  )}
                  {img.status === "done" && img.result && (
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-[0.75rem] text-accent font-medium">
                        ✓ {img.result.tees.reduce((s, t) => s + (t.holes?.length ?? 0), 0)} holes found
                      </p>
                      {img.result.tees.length > 1 && (
                        <select
                          value={img.selectedTeeIdx}
                          onChange={(e) => {
                            const idx2 = parseInt(e.target.value, 10);
                            setPendingImages((prev) =>
                              prev.map((i) => (i.id === img.id ? { ...i, selectedTeeIdx: idx2 } : i))
                            );
                          }}
                          className="text-[0.75rem] border border-divider rounded px-1.5 py-0.5 outline-none"
                        >
                          {img.result.tees.map((t, i) => (
                            <option key={i} value={i}>
                              {t.tee_name || t.tee_color || `Tee ${i + 1}`} ({t.holes?.length ?? 0} holes)
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setPendingImages((prev) => prev.filter((i) => i.id !== img.id))}
                  className="text-secondary hover:text-red-500 cursor-pointer shrink-0 p-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload / Add another button */}
        <label className="self-start inline-flex items-center gap-1.5 text-[0.875rem] text-accent font-medium cursor-pointer hover:underline">
          {pendingImages.length === 0 ? "Upload photos" : "+ Add another photo"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onClick={(e) => { (e.currentTarget as HTMLInputElement).value = ""; }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) addImage(file);
            }}
          />
        </label>

        {/* Extract + Apply buttons */}
        {pendingImages.length > 0 && (
          <div className="flex gap-3 flex-wrap">
            {pendingImages.some((i) => i.status === "idle" || i.status === "error") && (
              <Button
                onClick={extractAll}
                disabled={pendingImages.some((i) => i.status === "extracting")}
              >
                {pendingImages.some((i) => i.status === "extracting")
                  ? "Extracting… (may take 15s)"
                  : "Extract scorecard"}
              </Button>
            )}
            {pendingImages.every((i) => i.status === "done") && (
              <Button onClick={applyToHoles}>
                Apply to holes
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Course Rating & Slope Rating */}
      <div className="flex flex-col gap-2 p-4 rounded-lg border border-divider bg-white">
        <p className="text-[0.8125rem] font-medium text-text">
          Course Rating &amp; Slope
        </p>
        <p className="text-[0.75rem] text-secondary -mt-1">
          Used to calculate your VibeCaddie Index after each round.
        </p>
        <div className="flex items-end gap-3">
          <div className="w-32">
            <Input
              label="Course Rating"
              type="number"
              value={courseRating}
              onChange={setCourseRating}
              placeholder="e.g. 71.5"
            />
          </div>
          <div className="w-32">
            <Input
              label="Slope Rating"
              type="number"
              value={slopeRating}
              onChange={setSlopeRating}
              placeholder="e.g. 130"
            />
          </div>
          <Button variant="secondary" onClick={handleSaveRating} disabled={savingRating}>
            {savingRating ? "Saving..." : "Save"}
          </Button>
          {ratingFeedback && (
            <span className={`text-[0.8125rem] ${ratingFeedback === "Saved!" ? "text-accent" : "text-red-500"}`}>
              {ratingFeedback}
            </span>
          )}
        </div>
      </div>

      {/* 球洞编辑器 */}
      <HoleEditor
        courseId={courseId}
        teeId={teeId}
        fillFromOcr={fillFromOcr}
        onFinish={() => {
          const qs = new URLSearchParams({
            done: "1",
            ...(courseName ? { course: courseName } : {}),
          });
          router.push(`/courses/${courseId}?${qs.toString()}`);
        }}
      />
    </div>
  );
}

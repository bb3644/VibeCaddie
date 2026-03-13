"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { LookupResult } from "@/lib/types/scorecard";

interface PhotoUploadProps {
  onResult: (result: LookupResult) => void;
}

interface ImageEntry {
  id: string;
  file: File;
  preview: string;
}

/** 上传记分卡照片（支持多张）→ OCR 提取数据 */
export function PhotoUpload({ onResult }: PhotoUploadProps) {
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");

  function addFile(file: File) {
    const entry: ImageEntry = {
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
    };
    setImages((prev) => [...prev, entry]);
    setError("");
  }

  function removeImage(id: string) {
    setImages((prev) => prev.filter((i) => i.id !== id));
    setError("");
  }

  async function handleExtract() {
    if (images.length === 0) return;
    setExtracting(true);
    setError("");

    try {
      // OCR all images in parallel
      const results = await Promise.all(
        images.map(async (entry) => {
          const formData = new FormData();
          formData.append("image", entry.file);
          const res = await fetch("/api/courses/ocr", { method: "POST", body: formData });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Extraction failed");
          }
          return (await res.json()) as LookupResult;
        })
      );

      if (results.length === 1) {
        // Single image — pass through directly
        if (!results[0].tees?.length) throw new Error("No scorecard data found in photo.");
        onResult(results[0]);
        return;
      }

      // Multiple images — merge holes across all results
      // Use first result as base (course name, tees structure)
      const base = results[0];
      if (!base.tees?.length) throw new Error("No scorecard data found in first photo.");

      // Build a merged tees array: for each tee in the base, merge holes from matching tees in other images
      const mergedTees = base.tees.map((baseTee) => {
        const allHoles = [...(baseTee.holes ?? [])];
        for (const other of results.slice(1)) {
          const matchingTee =
            other.tees?.find(
              (t) =>
                t.tee_name === baseTee.tee_name ||
                t.tee_color === baseTee.tee_color
            ) ?? other.tees?.[0];
          if (matchingTee?.holes) {
            for (const hole of matchingTee.holes) {
              if (!allHoles.find((h) => h.hole_number === hole.hole_number)) {
                allHoles.push(hole);
              }
            }
          }
        }
        allHoles.sort((a, b) => a.hole_number - b.hole_number);
        return {
          ...baseTee,
          holes: allHoles,
          par_total: allHoles.reduce((s, h) => s + h.par, 0),
        };
      });

      onResult({ ...base, tees: mergedTees });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setExtracting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Image list */}
      {images.length > 0 && (
        <div className="flex flex-col gap-2">
          {images.map((entry, idx) => (
            <div key={entry.id} className="flex items-center gap-3 p-2 rounded-lg border border-divider bg-bg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={entry.preview}
                alt={`Scorecard ${idx + 1}`}
                className="w-16 h-16 object-cover rounded border border-divider shrink-0"
              />
              <p className="flex-1 text-[0.8125rem] text-text truncate">{entry.file.name}</p>
              <button
                onClick={() => removeImage(entry.id)}
                className="text-secondary hover:text-red-500 cursor-pointer p-1 shrink-0"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload / Add another */}
      <label className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-divider hover:border-accent/40 bg-bg p-8 cursor-pointer transition-colors ${images.length > 0 ? "py-4" : ""}`}>
        <svg
          className="w-8 h-8 text-secondary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <div className="text-center">
          <p className="text-[0.9375rem] font-medium text-text">
            {images.length === 0 ? "Upload scorecard photo" : "+ Add another photo"}
          </p>
          {images.length === 0 && (
            <p className="text-[0.8125rem] text-secondary mt-1">
              JPEG, PNG, or WebP — max 10MB
            </p>
          )}
          {images.length === 1 && (
            <p className="text-[0.8125rem] text-secondary mt-1">
              If the scorecard spans two images, add the second one here
            </p>
          )}
        </div>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onClick={(e) => { (e.currentTarget as HTMLInputElement).value = ""; }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) addFile(file);
          }}
        />
      </label>

      {/* Extract button */}
      {images.length > 0 && (
        <Button onClick={handleExtract} disabled={extracting}>
          {extracting
            ? `Extracting${images.length > 1 ? " all photos" : ""}… (may take 15s)`
            : `Extract Scorecard${images.length > 1 ? ` (${images.length} photos)` : ""}`}
        </Button>
      )}

      {error && (
        <p className="text-[0.8125rem] text-red-500">{error}</p>
      )}
    </div>
  );
}

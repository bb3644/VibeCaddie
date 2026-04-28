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

/** Compress image to max 1600px on longest side, JPEG quality 0.85 — keeps it under 1.5MB */
async function compressImage(file: File): Promise<File> {
  const MAX_PX = 1600;
  const QUALITY = 0.85;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width, height } = img;
      const scale = Math.min(1, MAX_PX / Math.max(width, height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        QUALITY
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
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
      // Compress then OCR all images in parallel
      const results = await Promise.all(
        images.map(async (entry) => {
          const compressed = await compressImage(entry.file);
          const formData = new FormData();
          formData.append("image", compressed);
          const res = await fetch("/api/courses/ocr", { method: "POST", body: formData });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Failed to read scorecard — try a clearer photo in good lighting.");
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

      // Debug: log raw OCR data per image
      results.forEach((r, i) => {
        const t = r.tees?.[0];
        console.log(`[OCR result ${i}] tee: ${t?.tee_name} / ${t?.tee_color}, holes 1-9:`, JSON.stringify(t?.holes?.slice(0, 9)));
      });

      // Each image returns all 18 holes but uses 0 for holes it can't see.
      // For each hole number, pick the best (non-zero) value from any image.
      const mergedTees = base.tees.map((baseTee) => {
        // Collect the matching tee from every result
        const allTees = results.map(
          (r) =>
            r.tees?.find(
              (t) => t.tee_name === baseTee.tee_name || t.tee_color === baseTee.tee_color
            ) ?? r.tees?.[0]
        );

        // Build a per-hole-number map of best values
        const holeMap: Record<number, { hole_number: number; par: number; yardage: number; si: number; hole_note?: string }> = {};
        for (const tee of allTees) {
          for (const h of tee?.holes ?? []) {
            const num = h.hole_number;
            if (num < 1 || num > 18) continue; // skip totals rows misread as hole 0 etc
            if (!holeMap[num]) {
              holeMap[num] = { hole_number: num, par: 0, yardage: 0, si: 0 };
            }
            if (h.par > 0) holeMap[num].par = h.par;
            if (h.yardage > 0) holeMap[num].yardage = h.yardage;
            if (h.si && h.si > 0) holeMap[num].si = h.si;
            if (h.hole_note) holeMap[num].hole_note = h.hole_note;
          }
        }

        const mergedHoles = Object.values(holeMap).sort((a, b) => a.hole_number - b.hole_number);
        return {
          ...baseTee,
          holes: mergedHoles,
          par_total: mergedHoles.reduce((s, h) => s + h.par, 0),
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

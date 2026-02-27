"use client";

import { useState, useRef } from "react";
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

interface PhotoUploadProps {
  onResult: (result: LookupResult) => void;
}

/** 上传记分卡照片 → OCR 提取数据 */
export function PhotoUpload({ onResult }: PhotoUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setError("");
    setFile(selected);

    // 生成本地预览
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(selected);
  }

  function handleClear() {
    setFile(null);
    setPreview(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleExtract() {
    if (!file) return;

    setExtracting(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/courses/ocr", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let errorMsg = "Failed to extract scorecard";
        try {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
        } catch { /* empty */ }
        throw new Error(errorMsg);
      }

      const data = await res.json();

      if (!data.tees || data.tees.length === 0) {
        throw new Error("No scorecard data found in photo.");
      }

      onResult(data as LookupResult);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setExtracting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 上传区域 */}
      {!preview ? (
        <label className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-divider hover:border-accent/40 bg-bg p-8 cursor-pointer transition-colors">
          <svg
            className="w-10 h-10 text-secondary"
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
              Upload scorecard photo
            </p>
            <p className="text-[0.8125rem] text-secondary mt-1">
              JPEG, PNG, or WebP — max 10MB
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      ) : (
        <div className="flex flex-col gap-3">
          {/* 图片预览 */}
          <div className="relative rounded-lg overflow-hidden border border-divider">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Scorecard preview"
              className="w-full max-h-64 object-contain bg-bg"
            />
            <button
              onClick={handleClear}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center text-[0.875rem] hover:bg-black/70 cursor-pointer"
            >
              ×
            </button>
          </div>
          <p className="text-[0.8125rem] text-secondary">
            {file?.name} ({((file?.size ?? 0) / 1024).toFixed(0)} KB)
          </p>
        </div>
      )}

      {/* 提取按钮 */}
      {preview && (
        <Button onClick={handleExtract} disabled={extracting}>
          {extracting ? "Extracting... (may take 15s)" : "Extract Scorecard"}
        </Button>
      )}

      {error && (
        <p className="text-[0.8125rem] text-red-500">{error}</p>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { CourseForm } from "@/components/course/course-form";
import { CourseLookup } from "@/components/course/course-lookup";
import { PhotoUpload } from "@/components/course/photo-upload";
import { ScorecardPreview } from "@/components/course/scorecard-preview";

type Tab = "search" | "photo" | "manual";

// 从子组件传入的原始数据（不含 selected）
interface RawLookupResult {
  course_name: string;
  location: string;
  tees: {
    tee_name: string;
    tee_color: string;
    par_total: number;
    course_rating?: number;
    slope_rating?: number;
    holes: { hole_number: number; par: number; yardage: number; si: number; hole_note?: string }[];
  }[];
  confidence: "high" | "medium" | "low";
  source: "google_search" | "photo_ocr" | "manual";
  source_url?: string;
}

// 带 selected 的预览数据
interface PreviewResult extends Omit<RawLookupResult, "tees"> {
  tees: (RawLookupResult["tees"][number] & { selected: boolean })[];
}

export default function NewCoursePage() {
  const [tab, setTab] = useState<Tab>("search");
  const [result, setResult] = useState<PreviewResult | null>(null);

  // 搜索/OCR 成功后：给每个 tee 加 selected 标记
  function handleResult(data: RawLookupResult) {
    const tees = data.tees.map((t) => ({ ...t, selected: true }));
    setResult({ ...data, tees });
  }

  function handleReset() {
    setResult(null);
  }

  // 预览模式下不显示 tab
  if (result) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-[1.875rem] font-semibold text-text">
            Review Scorecard
          </h1>
          <p className="text-[0.9375rem] text-secondary mt-1">
            Review and edit the data below, then save.
          </p>
        </div>
        <ScorecardPreview
          result={result}
          onResultChange={setResult}
          onSaved={() => {}}
          onReset={handleReset}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[1.875rem] font-semibold text-text">
          Add a Course
        </h1>
        <p className="text-[0.9375rem] text-secondary mt-1">
          Search online, upload a scorecard photo, or add manually.
        </p>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 rounded-lg bg-bg p-1">
        {([
          { key: "search", label: "Search Online" },
          { key: "photo", label: "Upload Photo" },
          { key: "manual", label: "Enter Manually" },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex-1 rounded-md px-3 py-2 text-[0.875rem] font-medium transition-colors cursor-pointer ${
              tab === key
                ? "bg-white text-text shadow-sm"
                : "text-secondary hover:text-text"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "search" && <CourseLookup onResult={handleResult} />}
      {tab === "photo" && <PhotoUpload onResult={handleResult} />}
      {tab === "manual" && <CourseForm />}
    </div>
  );
}

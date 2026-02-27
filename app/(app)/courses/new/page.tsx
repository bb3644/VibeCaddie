"use client";

import { useState } from "react";
import { CourseForm } from "@/components/course/course-form";
import { PhotoUpload } from "@/components/course/photo-upload";
import { ScorecardPreview } from "@/components/course/scorecard-preview";
import type { LookupResult } from "@/lib/types/scorecard";

type Tab = "photo" | "manual";

// 带 selected 的预览数据
interface PreviewResult extends Omit<LookupResult, "tees"> {
  tees: (LookupResult["tees"][number] & { selected: boolean })[];
}

export default function NewCoursePage() {
  const [tab, setTab] = useState<Tab>("photo");
  const [result, setResult] = useState<PreviewResult | null>(null);

  // OCR 成功后：给每个 tee 加 selected 标记
  function handleResult(data: LookupResult) {
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
          Upload a scorecard photo or add a course manually.
        </p>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 rounded-lg bg-bg p-1">
        {([
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

      {tab === "photo" && <PhotoUpload onResult={handleResult} />}
      {tab === "manual" && <CourseForm />}
    </div>
  );
}

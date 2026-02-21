"use client";

import { useState } from "react";
import { CourseForm } from "@/components/course/course-form";
import { CourseLookup } from "@/components/course/course-lookup";

type Tab = "search" | "manual";

export default function NewCoursePage() {
  const [tab, setTab] = useState<Tab>("search");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[1.875rem] font-semibold text-text">
          Add a Course
        </h1>
        <p className="text-[0.9375rem] text-secondary mt-1">
          Search online to auto-fill scorecard data, or add a course manually.
        </p>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 rounded-lg bg-bg p-1">
        <button
          type="button"
          onClick={() => setTab("search")}
          className={`flex-1 rounded-md px-3 py-2 text-[0.875rem] font-medium transition-colors cursor-pointer ${
            tab === "search"
              ? "bg-white text-text shadow-sm"
              : "text-secondary hover:text-text"
          }`}
        >
          Search Online
        </button>
        <button
          type="button"
          onClick={() => setTab("manual")}
          className={`flex-1 rounded-md px-3 py-2 text-[0.875rem] font-medium transition-colors cursor-pointer ${
            tab === "manual"
              ? "bg-white text-text shadow-sm"
              : "text-secondary hover:text-text"
          }`}
        >
          Add Manually
        </button>
      </div>

      {tab === "search" ? <CourseLookup /> : <CourseForm />}
    </div>
  );
}

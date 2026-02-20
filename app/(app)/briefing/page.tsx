"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CourseSelector } from "@/components/briefing/course-selector";

function BriefingContent() {
  const searchParams = useSearchParams();
  const preselectedCourseId = searchParams.get("courseId") ?? undefined;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[1.875rem] font-semibold text-text">
          Plan Your Round
        </h1>
        <p className="text-[0.9375rem] text-secondary mt-1">
          Select a course and tee for your pre-round briefing.
        </p>
      </div>

      <CourseSelector preselectedCourseId={preselectedCourseId} />
    </div>
  );
}

export default function NewBriefingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <p className="text-secondary text-[0.9375rem]">Loading...</p>
        </div>
      }
    >
      <BriefingContent />
    </Suspense>
  );
}

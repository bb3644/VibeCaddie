"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CourseSelector } from "@/components/briefing/course-selector";
import type { PreRoundBriefing } from "@/lib/db/types";

interface BriefingWithInfo extends PreRoundBriefing {
  course_name?: string;
  tee_name?: string;
}

function PastBriefings() {
  const [briefings, setBriefings] = useState<BriefingWithInfo[]>([]);

  useEffect(() => {
    fetch("/api/briefing").then(r => r.ok ? r.json() : []).then(setBriefings).catch(() => {});
  }, []);

  if (briefings.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[0.8125rem] font-medium text-secondary uppercase tracking-wide">Past Briefings</p>
      {briefings.slice(0, 5).map((b) => {
        const rawDate = typeof b.play_date === "string" ? b.play_date.split("T")[0] : "";
        const label = rawDate
          ? new Date(rawDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : rawDate;
        return (
          <Link
            key={b.id}
            href={`/briefing/${b.id}`}
            className="flex items-center justify-between p-3 rounded-lg border border-divider bg-white hover:border-accent/40 transition-colors"
          >
            <div>
              <p className="text-[0.875rem] font-medium text-text">
                {b.course_name ?? "Course"}{b.tee_name ? ` — ${b.tee_name}` : ""}
              </p>
              <p className="text-[0.75rem] text-secondary mt-0.5">{label}</p>
            </div>
            <span className="text-secondary text-[0.75rem]">View →</span>
          </Link>
        );
      })}
    </div>
  );
}

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
      <PastBriefings />
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

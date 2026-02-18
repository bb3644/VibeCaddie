"use client";

import { CourseForm } from "@/components/course/course-form";

export default function NewCoursePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[1.875rem] font-semibold text-text">
          Add a Course
        </h1>
        <p className="text-[0.9375rem] text-secondary mt-1">
          You only need a scorecard or memory. Approximate distances are fine.
        </p>
      </div>

      <CourseForm />
    </div>
  );
}

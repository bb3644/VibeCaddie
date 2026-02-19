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
          Add a course everyone can use. Pick the tees you play — others can add
          theirs later. You can fill in hole details and hazards after creating.
        </p>
      </div>

      <CourseForm />
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import type { Course } from "@/lib/db/types";

interface CourseWithTeeCount extends Course {
  tee_count: number;
}

interface CourseListProps {
  courses: CourseWithTeeCount[];
}

/** 球场列表，点击跳转到球场详情 */
export function CourseList({ courses }: CourseListProps) {
  const router = useRouter();

  if (courses.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-secondary text-[0.9375rem]">
          No courses yet. Be the first to add one!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {courses.map((course) => (
        <Card
          key={course.id}
          className="cursor-pointer hover:shadow-md transition-shadow"
        >
          <div
            onClick={() => router.push(`/courses/${course.id}`)}
            className="flex items-center justify-between"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-[0.9375rem] font-medium text-text">
                {course.name}
              </span>
              {course.location_text && (
                <span className="text-[0.8125rem] text-secondary">
                  {course.location_text}
                </span>
              )}
            </div>
            <span className="text-[0.8125rem] text-secondary whitespace-nowrap ml-4">
              {course.tee_count} {course.tee_count === 1 ? "tee" : "tees"}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { HoleEditor } from "@/components/course/hole-editor";
import type { Course, CourseTee } from "@/lib/db/types";

interface CourseWithTees extends Course {
  tees: CourseTee[];
}

export default function HolesPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const teeId = params.teeId as string;

  const [courseName, setCourseName] = useState("");
  const [teeName, setTeeName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/courses/${courseId}`);
        if (res.ok) {
          const data = (await res.json()) as CourseWithTees;
          setCourseName(data.name);
          const tee = data.tees.find((t) => t.id === teeId);
          if (tee) {
            setTeeName(tee.tee_name);
          }
        }
      } catch {
        // 加载失败
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [courseId, teeId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-secondary text-[0.9375rem]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 返回链接 */}
      <Link
        href={`/courses/${courseId}`}
        className="text-[0.8125rem] text-accent hover:underline self-start"
      >
        &larr; Back to course
      </Link>

      {/* 标题 */}
      <h1 className="text-[1.875rem] font-semibold text-text leading-tight">
        {courseName}
        {teeName && (
          <span className="text-secondary font-normal">
            {" "}
            &mdash; {teeName} Tee
          </span>
        )}
      </h1>

      {/* 球洞编辑器 */}
      <HoleEditor courseId={courseId} teeId={teeId} />
    </div>
  );
}

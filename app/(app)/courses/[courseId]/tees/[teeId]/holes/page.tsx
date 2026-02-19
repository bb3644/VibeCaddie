"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { InfoBanner } from "@/components/ui/info-banner";
import { HoleEditor } from "@/components/course/hole-editor";
import type { Course, CourseTee } from "@/lib/db/types";

interface CourseWithTees extends Course {
  tees: CourseTee[];
}

export default function HolesPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const teeId = params.teeId as string;

  // 优先从 URL query 取名字（创建后跳转时带过来），fallback 到 API
  const [courseName, setCourseName] = useState(
    searchParams.get("course") ?? ""
  );
  const [teeName, setTeeName] = useState(searchParams.get("tee") ?? "");
  const [location, setLocation] = useState(searchParams.get("loc") ?? "");
  const [loading, setLoading] = useState(!courseName);

  useEffect(() => {
    // 如果已从 query 获得名字，不再请求
    if (courseName) return;

    async function load() {
      try {
        const res = await fetch(`/api/courses/${courseId}`);
        if (res.ok) {
          const data = (await res.json()) as CourseWithTees;
          setCourseName(data.name);
          setLocation(data.location_text ?? "");
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
  }, [courseId, teeId, courseName]);

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
        &larr; Back to {courseName || "course"}
      </Link>

      {/* 标题区域 */}
      <div>
        <p className="text-[0.75rem] font-medium text-secondary uppercase tracking-wide">
          Course Setup
        </p>
        <h1 className="text-[1.875rem] font-semibold text-text leading-tight mt-1">
          {courseName || "Course"}
          {teeName && (
            <span className="text-secondary font-normal">
              {" "}&mdash; {teeName} Tee
            </span>
          )}
        </h1>
        {location && (
          <p className="text-[0.875rem] text-secondary mt-0.5">{location}</p>
        )}
      </div>

      {/* 协作提示 */}
      <InfoBanner>
        Fill in what you remember — par, yardage, stroke index, and any
        hazards. Approximate is fine. Other players can add what you missed.
      </InfoBanner>

      {/* 球洞编辑器 */}
      <HoleEditor
        courseId={courseId}
        teeId={teeId}
        onFinish={() => {
          const qs = new URLSearchParams({
            done: "1",
            ...(courseName ? { course: courseName } : {}),
          });
          router.push(`/courses/${courseId}?${qs.toString()}`);
        }}
      />
    </div>
  );
}

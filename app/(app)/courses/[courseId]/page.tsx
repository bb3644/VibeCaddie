"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/section-title";
import { InfoBanner } from "@/components/ui/info-banner";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Course, CourseTee } from "@/lib/db/types";

const TEE_OPTIONS = [
  { value: "", label: "Select tee" },
  { value: "White", label: "White Tee" },
  { value: "Blue", label: "Blue Tee" },
  { value: "Red", label: "Red Tee" },
  { value: "Gold", label: "Gold Tee" },
  { value: "Black", label: "Black Tee" },
];

/** tee 颜色对应的圆点色 */
const COLOR_MAP: Record<string, string> = {
  White: "bg-gray-200",
  Blue: "bg-blue-500",
  Red: "bg-red-500",
  Gold: "bg-yellow-400",
  Black: "bg-gray-800",
};

interface CourseDetail extends Course {
  tees: CourseTee[];
}

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = params.courseId as string;
  const justFinished = searchParams.get("done") === "1";
  const finishedCourseName = searchParams.get("course") ?? "";

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [golferName, setGolferName] = useState("");

  // 添加 tee 的表单状态
  const [showAddTee, setShowAddTee] = useState(false);
  const [teeColor, setTeeColor] = useState("");
  const [parTotal, setParTotal] = useState("");
  const [addingTee, setAddingTee] = useState(false);
  const [teeError, setTeeError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [courseRes, profileRes] = await Promise.all([
          fetch(`/api/courses/${courseId}`),
          justFinished ? fetch("/api/profile") : Promise.resolve(null),
        ]);

        if (courseRes.ok) {
          const data = (await courseRes.json()) as CourseDetail;
          setCourse(data);
        } else if (courseRes.status === 404) {
          router.push("/courses");
        }

        if (profileRes?.ok) {
          const profile = await profileRes.json();
          setGolferName(profile.name ?? "");
        }
      } catch {
        setFetchError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [courseId, router, justFinished]);

  async function handleAddTee() {
    setTeeError("");
    if (!teeColor) {
      setTeeError("Pick a tee color.");
      return;
    }
    const par = parseInt(parTotal, 10);
    if (!par || par < 1) {
      setTeeError("Valid par total is required.");
      return;
    }

    setAddingTee(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/tees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tee_name: teeColor,
          tee_color: teeColor,
          par_total: par,
        }),
      });

      if (res.ok) {
        const newTee = (await res.json()) as CourseTee;
        setCourse((prev) =>
          prev ? { ...prev, tees: [...prev.tees, newTee] } : prev
        );
        setTeeColor("");
        setParTotal("");
        setShowAddTee(false);
      } else {
        setTeeError("Failed to add tee.");
      }
    } catch {
      setTeeError("Something went wrong.");
    } finally {
      setAddingTee(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-secondary text-[0.9375rem]">Loading...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-secondary text-[0.9375rem]">
          {fetchError || "Course not found."}
        </p>
        <Link href="/courses">
          <span className="text-accent text-[0.9375rem] font-medium hover:underline cursor-pointer">
            Back to courses
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 完成感谢 */}
      {justFinished && (
        <div className="rounded-lg bg-accent/10 border border-accent/20 px-5 py-4">
          <p className="text-[1.125rem] font-semibold text-accent">
            Nice one{golferName ? `, ${golferName}` : ""}!
          </p>
          <p className="text-[0.875rem] text-text mt-1">
            {finishedCourseName
              ? `${finishedCourseName} is looking better already.`
              : "Course info saved."}{" "}
            Every detail you add helps the whole crew play smarter.
          </p>
        </div>
      )}

      {/* 返回链接 */}
      <Link
        href="/courses"
        className="text-[0.8125rem] text-accent hover:underline self-start"
      >
        &larr; All courses
      </Link>

      {/* 球场名称和位置 */}
      <div>
        <h1 className="text-[1.875rem] font-semibold text-text">
          {course.name}
        </h1>
        {course.location_text && (
          <p className="text-[0.9375rem] text-secondary mt-1">
            {course.location_text}
          </p>
        )}
      </div>

      {/* 协作说明 */}
      <InfoBanner>
        Shared course — anyone who plays here can add tees, fill in hole
        details, and mark hazards. The more players contribute, the smarter
        your caddie plan becomes.
      </InfoBanner>

      {/* 球场笔记 */}
      {course.course_note && (
        <Card>
          <p className="text-[0.9375rem] text-text">{course.course_note}</p>
        </Card>
      )}

      {/* Tee 列表 */}
      <div className="flex flex-col gap-3">
        <SectionTitle>Tees</SectionTitle>
        <p className="text-[0.8125rem] text-secondary -mt-1">
          Add the tees you play. Others can add theirs too.
        </p>
        {course.tees.length === 0 && (
          <p className="text-[0.9375rem] text-secondary italic">
            No tees added yet — be the first.
          </p>
        )}
        {course.tees.map((tee) => (
          <Card key={tee.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {tee.tee_color && COLOR_MAP[tee.tee_color] && (
                <span
                  className={`w-3 h-3 rounded-full ${COLOR_MAP[tee.tee_color]}`}
                />
              )}
              <div className="flex flex-col">
                <span className="text-[0.9375rem] font-medium text-text">
                  {tee.tee_name} Tee
                </span>
                <span className="text-[0.8125rem] text-secondary">
                  Par {tee.par_total}
                </span>
              </div>
            </div>
            <button
              onClick={() =>
                router.push(`/courses/${courseId}/tees/${tee.id}/holes`)
              }
              className="text-[0.8125rem] text-accent font-medium hover:underline cursor-pointer"
            >
              Holes &amp; Hazards
            </button>
          </Card>
        ))}
      </div>

      {/* 添加 Tee */}
      {showAddTee ? (
        <div className="flex flex-col gap-3 p-4 rounded-lg border border-divider bg-white">
          <SectionTitle>Add a Tee</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Tee"
              value={teeColor}
              onChange={setTeeColor}
              options={TEE_OPTIONS}
              placeholder="Select tee"
            />
            <Input
              label="Par Total"
              type="number"
              value={parTotal}
              onChange={setParTotal}
              placeholder="e.g. 72"
            />
          </div>
          {teeError && (
            <p className="text-[0.8125rem] text-red-500">{teeError}</p>
          )}
          <div className="flex gap-3">
            <Button onClick={handleAddTee} disabled={addingTee}>
              {addingTee ? "Adding..." : "Add Tee"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowAddTee(false);
                setTeeError("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="secondary" onClick={() => setShowAddTee(true)}>
          + Add Tee
        </Button>
      )}

      {/* 计划一轮的快捷入口 */}
      {course.tees.length > 0 && (
        <Link href="/briefing">
          <Button variant="secondary" className="w-full">
            Plan a Round Here
          </Button>
        </Link>
      )}
    </div>
  );
}

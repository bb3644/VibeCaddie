"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/section-title";
import { DuplicateWarning } from "./duplicate-warning";
import type { Course } from "@/lib/db/types";

const TEE_COLORS = [
  { value: "", label: "Select color" },
  { value: "White", label: "White" },
  { value: "Blue", label: "Blue" },
  { value: "Red", label: "Red" },
  { value: "Gold", label: "Gold" },
  { value: "Black", label: "Black" },
];

interface TeeInput {
  tee_name: string;
  tee_color: string;
  par_total: string;
}

function emptyTee(): TeeInput {
  return { tee_name: "", tee_color: "", par_total: "" };
}

/** 球场创建表单：名称 + 位置 + tee 列表 */
export function CourseForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [tees, setTees] = useState<TeeInput[]>([emptyTee()]);
  const [duplicates, setDuplicates] = useState<Course[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function updateTee(idx: number, field: keyof TeeInput, value: string) {
    setTees((prev) =>
      prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t))
    );
  }

  function removeTee(idx: number) {
    if (tees.length <= 1) return;
    setTees((prev) => prev.filter((_, i) => i !== idx));
  }

  function addTee() {
    setTees((prev) => [...prev, emptyTee()]);
  }

  // 校验 tee 数据
  function validateTees(): boolean {
    for (const tee of tees) {
      if (!tee.tee_name.trim()) {
        setError("Each tee needs a name.");
        return false;
      }
      const par = parseInt(tee.par_total, 10);
      if (!par || par < 1) {
        setError("Each tee needs a valid par total.");
        return false;
      }
    }
    return true;
  }

  async function handleSubmit(force = false) {
    setError("");
    setDuplicates(null);

    if (!name.trim()) {
      setError("Course name is required.");
      return;
    }
    if (!validateTees()) return;

    setSubmitting(true);
    try {
      // 1. 创建球场
      const courseRes = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          location_text: location.trim() || undefined,
          force,
        }),
      });

      if (courseRes.status === 409) {
        const data = await courseRes.json();
        setDuplicates(data.duplicates as Course[]);
        setSubmitting(false);
        return;
      }

      if (!courseRes.ok) {
        throw new Error("Failed to create course");
      }

      const course = (await courseRes.json()) as Course;

      // 2. 创建所有 tee
      await Promise.all(
        tees.map((tee) =>
          fetch(`/api/courses/${course.id}/tees`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tee_name: tee.tee_name.trim(),
              tee_color: tee.tee_color || undefined,
              par_total: parseInt(tee.par_total, 10),
            }),
          })
        )
      );

      // 3. 跳转到球场详情
      router.push(`/courses/${course.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 球场基本信息 */}
      <div className="flex flex-col gap-4">
        <Input
          label="Course Name"
          value={name}
          onChange={setName}
          placeholder="e.g. Mission Hills - Ozaki Course"
        />
        <Input
          label="Location (optional)"
          value={location}
          onChange={setLocation}
          placeholder="e.g. Shenzhen, China"
        />
      </div>

      {/* 查重警告 */}
      {duplicates && (
        <DuplicateWarning
          duplicates={duplicates}
          onForceCreate={() => handleSubmit(true)}
        />
      )}

      {/* Tee 列表 */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Tees</SectionTitle>
        {tees.map((tee, idx) => (
          <div
            key={idx}
            className="flex flex-col gap-3 p-4 rounded-lg border border-divider bg-white"
          >
            <div className="flex items-center justify-between">
              <span className="text-[0.875rem] font-medium text-text">
                Tee {idx + 1}
              </span>
              {tees.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTee(idx)}
                  className="text-[0.8125rem] text-red-500 hover:underline cursor-pointer"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Tee Name"
                value={tee.tee_name}
                onChange={(v) => updateTee(idx, "tee_name", v)}
                placeholder="e.g. White"
              />
              <Select
                label="Color"
                value={tee.tee_color}
                onChange={(v) => updateTee(idx, "tee_color", v)}
                options={TEE_COLORS}
                placeholder="Select color"
              />
              <Input
                label="Par Total"
                type="number"
                value={tee.par_total}
                onChange={(v) => updateTee(idx, "par_total", v)}
                placeholder="e.g. 72"
              />
            </div>
          </div>
        ))}
        <Button variant="secondary" onClick={addTee}>
          + Add Tee
        </Button>
      </div>

      {/* 错误提示 */}
      {error && (
        <p className="text-[0.8125rem] text-red-500">{error}</p>
      )}

      {/* 提交 */}
      <Button
        type="button"
        onClick={() => handleSubmit(false)}
        disabled={submitting}
      >
        {submitting ? "Creating..." : "Create Course"}
      </Button>
    </div>
  );
}

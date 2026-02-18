"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Course } from "@/lib/db/types";

interface DuplicateWarningProps {
  duplicates: Course[];
  onForceCreate: () => void;
}

/** 查重警告：展示相似球场，支持强制创建 */
export function DuplicateWarning({
  duplicates,
  onForceCreate,
}: DuplicateWarningProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4">
        <p className="text-[0.9375rem] font-medium text-yellow-800">
          Similar courses found
        </p>
        <p className="text-[0.8125rem] text-yellow-700 mt-1">
          These existing courses look similar. Did you mean one of them?
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {duplicates.map((course) => (
          <Card key={course.id} className="flex items-center justify-between">
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
            <Link
              href={`/courses/${course.id}`}
              className="text-[0.8125rem] text-accent font-medium hover:underline ml-4 whitespace-nowrap"
            >
              Use existing
            </Link>
          </Card>
        ))}
      </div>

      <Button variant="secondary" onClick={onForceCreate}>
        Create anyway
      </Button>
    </div>
  );
}

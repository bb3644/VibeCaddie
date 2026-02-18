"use client";

import { useEffect, useRef, useState } from "react";
import type { Course } from "@/lib/db/types";

interface CourseSearchProps {
  onResults: (courses: Course[]) => void;
  onClear: () => void;
}

/** 带防抖的球场搜索栏 */
export function CourseSearch({ onResults, onClear }: CourseSearchProps) {
  const [query, setQuery] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!query.trim()) {
      onClear();
      return;
    }

    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/courses/search?q=${encodeURIComponent(query.trim())}`
        );
        if (res.ok) {
          const data = (await res.json()) as Course[];
          onResults(data);
        }
      } catch {
        // 搜索失败时不处理
      }
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, onResults, onClear]);

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
        <svg
          className="w-4 h-4 text-secondary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search courses..."
        className="
          w-full rounded-lg pl-10 pr-3 py-2.5
          text-[0.9375rem] leading-[1.5rem] text-text
          border border-divider bg-white
          placeholder:text-secondary
          transition-colors duration-150
          outline-none
          focus:border-accent focus:ring-1 focus:ring-accent
        "
      />
    </div>
  );
}

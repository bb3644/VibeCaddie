"use client";

import Link from "next/link";

/** 首页快捷操作卡片：Pre-round planning 和 Post-round recap */
export function QuickActions() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Link href="/briefing">
        <div className="rounded-[12px] p-6 bg-accent hover:bg-accent-hover transition-colors duration-150 cursor-pointer">
          <p className="text-[1.125rem] font-semibold text-white">
            Play Round
          </p>
          <p className="text-[0.875rem] text-white/80 mt-1">
            Prepare your Vibe Caddie plan
          </p>
        </div>
      </Link>

      <Link href="/rounds/new">
        <div className="rounded-[12px] p-6 bg-accent hover:bg-accent-hover transition-colors duration-150 cursor-pointer">
          <p className="text-[1.125rem] font-semibold text-white">
            Add Round Recap
          </p>
          <p className="text-[0.875rem] text-white/80 mt-1">
            Record what happened
          </p>
        </div>
      </Link>
    </div>
  );
}

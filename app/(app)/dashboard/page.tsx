"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentRounds } from "@/components/dashboard/recent-rounds";
import { Card } from "@/components/ui/card";

interface DashboardData {
  profile: { name: string } | null;
  recent_rounds: Array<{
    id: string;
    course_name: string;
    tee_name: string;
    played_date: string;
    total_score: number | null;
    fw_count: number;
    insight?: string;
  }>;
}

interface BriefingInfo {
  id: string;
  course_name?: string;
  tee_name?: string;
  play_date: string;
}

function formatBriefingDate(playDate: string): string {
  const raw = typeof playDate === "string" ? playDate.split("T")[0] : "";
  return raw
    ? new Date(raw + "T12:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [briefings, setBriefings] = useState<BriefingInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [dashRes, briefingRes] = await Promise.all([
          fetch("/api/dashboard"),
          fetch("/api/briefing"),
        ]);
        if (dashRes.ok) {
          const json = (await dashRes.json()) as DashboardData;
          setData(json);
        } else {
          setError("Couldn't load your dashboard right now.");
        }
        if (briefingRes.ok) {
          const data = (await briefingRes.json()) as BriefingInfo[];
          setBriefings(data);
        }
      } catch {
        setError("Something went wrong. Give it another try.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-secondary text-[0.9375rem]">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-secondary text-[0.9375rem]">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-accent text-[0.9375rem] font-medium hover:underline cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const greeting = data?.profile?.name
    ? `Hey ${data.profile.name}`
    : "Hey there";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[1.875rem] font-semibold text-text">
        {greeting}
      </h1>

      <QuickActions />

      {briefings.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[0.8125rem] font-medium text-secondary uppercase tracking-wide">Briefings</p>
          {briefings.map((b) => (
            <Link key={b.id} href={`/briefing/${b.id}`}>
              <Card className="hover:shadow-md transition-shadow duration-150 cursor-pointer border-accent/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[0.9375rem] font-medium text-text">
                      {b.course_name ?? "Course"}
                      {b.tee_name ? ` — ${b.tee_name}` : ""}
                    </p>
                    <p className="text-[0.8125rem] text-secondary mt-0.5">
                      {formatBriefingDate(b.play_date)} · Pre-round briefing
                    </p>
                  </div>
                  <span className="text-accent text-[0.875rem] font-medium">View →</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <RecentRounds rounds={data?.recent_rounds ?? []} />

    </div>
  );
}

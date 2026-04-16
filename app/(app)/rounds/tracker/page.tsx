"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShotTrackerOverlay, type OverlayRound } from "@/components/round/shot-tracker";
import type { Round } from "@/lib/db/types";

type RoundWithInfo = Round & { course_name?: string; tee_name?: string };

export default function TrackerPage() {
  const [rounds, setRounds] = useState<RoundWithInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [overlayRounds, setOverlayRounds] = useState<OverlayRound[] | null>(null);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    fetch("/api/rounds")
      .then((r) => r.json())
      .then((data) => setRounds(data as RoundWithInfo[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCompare = async () => {
    if (selected.size < 1) return;
    setComparing(true);
    try {
      const results = await Promise.all(
        Array.from(selected).map(async (id) => {
          const res = await fetch(`/api/rounds/${id}`);
          if (!res.ok) return null;
          const data = await res.json();
          const round = rounds.find((r) => r.id === id);
          const label = round
            ? `${round.course_name ?? "Round"} · ${round.played_date}`
            : id;
          return {
            id,
            label,
            holes: (data.holes ?? []).map((h: {
              hole_number: number;
              approach_x: number | null;
              approach_y: number | null;
              drive_x: number | null;
              drive_y: number | null;
            }) => ({
              holeNumber: h.hole_number,
              approach_x: h.approach_x,
              approach_y: h.approach_y,
              drive_x: h.drive_x,
              drive_y: h.drive_y,
            })),
          } as OverlayRound;
        })
      );
      setOverlayRounds(results.filter(Boolean) as OverlayRound[]);
    } finally {
      setComparing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-secondary text-[0.9375rem]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/rounds">
          <span className="text-accent text-[0.8125rem] font-medium hover:underline cursor-pointer">
            &larr; Back to rounds
          </span>
        </Link>
        <h1 className="text-[1.875rem] font-semibold text-text mt-2">
          Shot Tracker Overlay
        </h1>
        <p className="text-[0.9375rem] text-secondary mt-1">
          Select rounds to compare shot patterns.
        </p>
      </div>

      {rounds.length === 0 ? (
        <Card>
          <p className="text-center text-secondary text-[0.9375rem] py-8">
            No rounds with shot data yet.
          </p>
        </Card>
      ) : (
        <Card>
          <p className="text-[0.875rem] font-semibold text-text mb-3">Select rounds to compare</p>
          <div className="flex flex-col gap-2 mb-4">
            {rounds.map((r) => (
              <label
                key={r.id}
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.has(r.id)}
                  onChange={() => toggle(r.id)}
                  className="w-4 h-4 accent-accent"
                />
                <span className="text-[0.875rem] text-text">
                  {r.course_name ?? "Round"} &middot; {r.played_date}
                  {r.total_score != null && (
                    <span className="text-secondary ml-2">({r.total_score})</span>
                  )}
                </span>
              </label>
            ))}
          </div>
          <Button
            onClick={handleCompare}
            disabled={selected.size < 1 || comparing}
          >
            {comparing ? "Loading..." : `Compare ${selected.size} round${selected.size !== 1 ? "s" : ""}`}
          </Button>
        </Card>
      )}

      {overlayRounds && overlayRounds.length > 0 && (
        <Card>
          <p className="text-[0.875rem] font-semibold text-text mb-4">Shot Pattern Overlay</p>
          <ShotTrackerOverlay rounds={overlayRounds} />
        </Card>
      )}
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import type { RoundHole, CourseHole } from "@/lib/db/types";

const RESULT_LABEL: Record<string, string> = {
  FW:    "FIR",
  LEFT:  "Left",
  RIGHT: "Right",
  SHORT: "Short",
  OB:    "OB",
};

const RESULT_COLOR: Record<string, string> = {
  FW:    "text-green-600",
  LEFT:  "text-amber-600",
  RIGHT: "text-amber-600",
  SHORT: "text-amber-600",
  OB:    "text-red-600",
};

interface RoundSummaryProps {
  holes: RoundHole[];
  courseHoles: CourseHole[];
  onTotalScoreChange?: (totalScore: number) => void;
}

export function RoundSummary({
  holes,
  courseHoles,
  onTotalScoreChange,
}: RoundSummaryProps) {
  const holeMap = useMemo(() => {
    const map = new Map<number, RoundHole>();
    for (const h of holes) map.set(h.hole_number, h);
    return map;
  }, [holes]);

  const courseHoleMap = useMemo(() => {
    const map = new Map<number, CourseHole>();
    for (const ch of courseHoles) map.set(ch.hole_number, ch);
    return map;
  }, [courseHoles]);

  const stats = useMemo(() => {
    let totalScore = 0;
    let totalPutts = 0;
    let firCount = 0;
    let girCount = 0;
    let udCount = 0;
    let totalPar = 0;
    let holesWithScore = 0;

    for (const hole of holes) {
      if (hole.score !== null) { totalScore += hole.score; holesWithScore++; }
      if (hole.putts !== null) totalPutts += hole.putts;
      if (hole.tee_result === "FW") firCount++;
      if (hole.approach_distance === "GIR") girCount++;
      if (hole.up_down === true) udCount++;
    }
    for (const ch of courseHoles) totalPar += ch.par;

    return { totalScore, totalPutts, firCount, girCount, udCount, totalPar, holesWithScore };
  }, [holes, courseHoles]);

  useMemo(() => {
    if (stats.holesWithScore > 0 && onTotalScoreChange) {
      onTotalScoreChange(stats.totalScore);
    }
  }, [stats.totalScore, stats.holesWithScore, onTotalScoreChange]);

  const holeNumbers = useMemo(() => {
    const nums = new Set<number>();
    for (const ch of courseHoles) nums.add(ch.hole_number);
    for (const h of holes) nums.add(h.hole_number);
    return Array.from(nums).sort((a, b) => a - b);
  }, [courseHoles, holes]);

  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-[0.8125rem]">
        <thead>
          <tr className="border-b border-divider text-left">
            <th className="py-2 pr-2 font-semibold text-secondary">Hole</th>
            <th className="py-2 pr-2 font-semibold text-secondary">Par</th>
            <th className="py-2 pr-2 font-semibold text-secondary">Club</th>
            <th className="py-2 pr-2 font-semibold text-secondary">Result</th>
            <th className="py-2 pr-2 font-semibold text-secondary">GIR</th>
            <th className="py-2 pr-2 font-semibold text-secondary">U&amp;D</th>
            <th className="py-2 pr-2 font-semibold text-secondary">Score</th>
            <th className="py-2 font-semibold text-secondary">Putts</th>
          </tr>
        </thead>
        <tbody>
          {holeNumbers.map((num) => {
            const h = holeMap.get(num);
            const ch = courseHoleMap.get(num);

            return (
              <tr key={num} className="border-b border-divider/50">
                <td className="py-2 pr-2 font-medium text-text">{num}</td>
                <td className="py-2 pr-2 text-secondary">{ch?.par ?? "-"}</td>
                <td className="py-2 pr-2 text-text">{h?.tee_club ?? "-"}</td>
                <td className="py-2 pr-2">
                  {h?.tee_result ? (
                    <span className={`font-semibold ${RESULT_COLOR[h.tee_result] ?? "text-text"}`}>
                      {RESULT_LABEL[h.tee_result] ?? h.tee_result}
                    </span>
                  ) : "-"}
                </td>
                <td className="py-2 pr-2">
                  {h?.approach_distance === "GIR"
                    ? <span className="text-green-600 font-semibold">✓</span>
                    : <span className="text-secondary">—</span>}
                </td>
                <td className="py-2 pr-2">
                  {h?.up_down === true
                    ? <span className="text-green-600 font-semibold">✓</span>
                    : h?.up_down === false
                      ? <span className="text-red-500 font-semibold">✗</span>
                      : <span className="text-secondary">—</span>}
                </td>
                <td className="py-2 pr-2 text-text">{h?.score ?? "-"}</td>
                <td className="py-2 text-text">{h?.putts ?? "-"}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-divider font-semibold">
            <td className="py-2 pr-2 text-text">Total</td>
            <td className="py-2 pr-2 text-secondary">{stats.totalPar}</td>
            <td className="py-2 pr-2" />
            <td className="py-2 pr-2 text-green-600">FIR {stats.firCount}</td>
            <td className="py-2 pr-2 text-green-600">{stats.girCount}</td>
            <td className="py-2 pr-2 text-green-600">{stats.udCount}</td>
            <td className="py-2 pr-2 text-text">
              {stats.holesWithScore > 0 ? stats.totalScore : "-"}
            </td>
            <td className="py-2 text-text">
              {stats.totalPutts > 0 ? stats.totalPutts : "-"}
            </td>
          </tr>
          <tr>
            <td colSpan={8} className="pt-1 text-[0.75rem] text-secondary">
              FIR: {stats.firCount} &middot; GIR: {stats.girCount} &middot; U&amp;D: {stats.udCount} / {holeNumbers.length}
            </td>
          </tr>
        </tfoot>
      </table>
    </Card>
  );
}

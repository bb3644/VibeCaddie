"use client";

import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";

interface TrendsData {
  total_rounds: number;
  avg_score_last5: number | null;
  fw_rate_last5: number | null;
}

interface TrendsCardProps {
  trends: TrendsData;
  /** 来自 API 的 calm insight 文案 */
  insights?: string[];
}

/** 根据趋势数据生成 calm caddie 风格的 insight 文案 */
function generateInsights(trends: TrendsData): string[] {
  const lines: string[] = [];

  if (trends.fw_rate_last5 !== null) {
    if (trends.fw_rate_last5 >= 50) {
      lines.push("You've been safer off the tee lately.");
    } else {
      lines.push("Driver brings trouble on a few holes.");
    }
  }

  if (trends.avg_score_last5 !== null) {
    if (trends.avg_score_last5 <= 90) {
      lines.push("Your game is feeling steady.");
    } else {
      lines.push("Control clubs are working well for you.");
    }
  }

  if (trends.total_rounds >= 5) {
    lines.push("Good rhythm — keep playing regularly.");
  } else if (trends.total_rounds >= 2) {
    lines.push("A few more rounds and you'll see the patterns.");
  }

  lines.push("Shorter clubs keeping you out of trouble.");

  return lines;
}

/** "Your Game" 卡片 — calm insight 文案，不展示数字或百分比 */
export function TrendsCard({ trends, insights }: TrendsCardProps) {
  if (trends.total_rounds < 2) {
    return null;
  }

  const lines = insights ?? generateInsights(trends);

  return (
    <div className="flex flex-col gap-3">
      <SectionTitle>Your Game</SectionTitle>

      <Card>
        <ul className="flex flex-col gap-2.5">
          {lines.map((line, i) => (
            <li
              key={i}
              className="text-[0.9375rem] leading-[1.625rem] text-secondary"
            >
              {line}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

"use client";

import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { Button } from "@/components/ui/button";

interface RoundStats {
  fir: number;
  firTotal: number;
  gir: number;
  girTotal: number;
  putts: number | null;
  holesWithPutts: number;
}

interface HoleScore {
  hole: number;
  score: number;
  par: number;
}

interface RecapDisplayProps {
  recapText: string;
  courseName: string;
  teeName: string;
  playedDate: string;
  stats?: RoundStats;
  holeData?: HoleScore[];
}

function diffLabel(d: number) {
  return d === 0 ? "E" : d > 0 ? `+${d}` : `${d}`;
}

function diffChipClass(d: number) {
  if (d <= -2) return "bg-green-200 text-green-800";
  if (d === -1) return "bg-green-100 text-green-700";
  if (d === 0) return "bg-blue-100 text-blue-600";
  if (d === 1) return "bg-orange-100 text-orange-600";
  return "bg-red-100 text-red-600";
}

function dotFill(d: number) {
  if (d <= -2) return "#16a34a";
  if (d === -1) return "#22c55e";
  if (d === 0) return "#3b82f6";
  if (d === 1) return "#f97316";
  return "#ef4444";
}

function RoundTemperatureChart({ holeData }: { holeData: HoleScore[] }) {
  const data = holeData.filter((h) => h.score != null);
  if (data.length < 2) return null;

  const diffs = data.map((h) => h.score - h.par);
  const n = data.length;
  const is18 = n >= 16;

  const rawMin = Math.min(...diffs);
  const rawMax = Math.max(...diffs);
  const yMin = Math.min(rawMin - 0.6, -2);
  const yMax = Math.max(rawMax + 0.6, 2);

  const W = 340, H = 180;
  const padL = 30, padR = 10, padT = 22, padB = 24;
  const cW = W - padL - padR;
  const cH = H - padT - padB;

  const xOf = (i: number) => padL + (n === 1 ? cW / 2 : (i / (n - 1)) * cW);
  const yOf = (d: number) => padT + ((yMax - d) / (yMax - yMin)) * cH;

  const yTicks: number[] = [];
  for (let v = Math.ceil(yMin); v <= Math.floor(yMax); v++) yTicks.push(v);

  const pathD = data
    .map((_, i) => `${i === 0 ? "M" : "L"} ${xOf(i).toFixed(1)} ${yOf(diffs[i]).toFixed(1)}`)
    .join(" ");

  const bestDiff = Math.min(...diffs);
  const worstDiff = Math.max(...diffs);
  const bestIdx = diffs.lastIndexOf(bestDiff);
  const worstIdx = diffs.lastIndexOf(worstDiff);

  // Clamp annotation label so it doesn't overflow SVG horizontally
  const clampX = (cx: number, labelW: number) =>
    Math.max(padL, Math.min(cx - labelW / 2, W - padR - labelW));

  return (
    <div className="flex flex-col gap-2">
      {/* Per-hole score chips */}
      <div className="flex overflow-x-auto gap-0.5 pb-1 no-scrollbar">
        {data.map((h, i) => {
          const d = diffs[i];
          return (
            <div key={i} className="flex flex-col items-center shrink-0" style={{ minWidth: 26 }}>
              <span className="text-[0.625rem] text-secondary leading-none mb-0.5">{h.hole}</span>
              <span className={`text-[0.6875rem] font-bold rounded-sm px-1 py-0.5 leading-none ${diffChipClass(d)}`}>
                {diffLabel(d)}
              </span>
            </div>
          );
        })}
      </div>

      {/* SVG line chart */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 180 }}>
        {/* Y grid lines + labels */}
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={padL} y1={yOf(v)} x2={W - padR} y2={yOf(v)}
              stroke={v === 0 ? "#94a3b8" : "#e2e8f0"}
              strokeWidth={v === 0 ? 1.5 : 0.75}
              strokeDasharray={v === 0 ? "4 3" : undefined}
            />
            <text x={padL - 4} y={yOf(v) + 4} textAnchor="end" fontSize="10"
              fill={v === 0 ? "#475569" : "#94a3b8"}
              fontWeight={v === 0 ? "600" : "normal"}>
              {v === 0 ? "E" : v > 0 ? `+${v}` : `${v}`}
            </text>
          </g>
        ))}

        {/* OUT/IN turn marker */}
        {is18 && (() => {
          const tx = (xOf(8) + xOf(9)) / 2;
          return (
            <g>
              <line x1={tx} y1={padT} x2={tx} y2={padT + cH}
                stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 2" />
              <text x={tx} y={padT + cH + 14} textAnchor="middle" fontSize="8" fill="#cbd5e1">│</text>
            </g>
          );
        })()}

        {/* Line */}
        <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="2"
          strokeLinejoin="round" strokeLinecap="round" />

        {/* Best hole annotation (below dot — it's near the bottom) */}
        {bestDiff < 0 && (() => {
          const cx = xOf(bestIdx);
          const cy = yOf(bestDiff);
          const lw = 54;
          const lx = clampX(cx, lw);
          const spaceBelow = (padT + cH) - cy;
          const ay = spaceBelow >= 26 ? cy + 8 : cy - 24;
          return (
            <g>
              <rect x={lx} y={ay} width={lw} height={16} rx={3} fill="#16a34a" />
              <text x={lx + lw / 2} y={ay + 11} textAnchor="middle" fontSize="8.5" fill="white" fontWeight="600">
                Best hole
              </text>
            </g>
          );
        })()}

        {/* Worst hole annotation (above dot — it's near the top) */}
        {worstDiff > 1 && worstIdx !== bestIdx && (() => {
          const cx = xOf(worstIdx);
          const cy = yOf(worstDiff);
          const lw = 58;
          const lx = clampX(cx, lw);
          const spaceAbove = cy - padT;
          const ay = spaceAbove >= 26 ? cy - 24 : cy + 8;
          return (
            <g>
              <line x1={cx} y1={cy} x2={cx} y2={ay + (spaceAbove >= 26 ? 16 : 0)}
                stroke="#ef4444" strokeWidth="1" strokeDasharray="3 2" />
              <rect x={lx} y={ay} width={lw} height={16} rx={3} fill="#ef4444" />
              <text x={lx + lw / 2} y={ay + 11} textAnchor="middle" fontSize="8.5" fill="white" fontWeight="600">
                Worst hole
              </text>
            </g>
          );
        })()}

        {/* Dots (rendered last so they appear on top of annotations) */}
        {data.map((_, i) => {
          const isSpecial = i === bestIdx || i === worstIdx;
          return (
            <circle key={i}
              cx={xOf(i)} cy={yOf(diffs[i])}
              r={isSpecial ? 5.5 : 3.5}
              fill={dotFill(diffs[i])}
              stroke="white" strokeWidth={isSpecial ? 2 : 1}
            />
          );
        })}

        {/* X-axis hole numbers */}
        {data.map((h, i) => (
          <text key={i} x={xOf(i)} y={H - 5} textAnchor="middle" fontSize="9" fill="#94a3b8">
            {h.hole}
          </text>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-[0.75rem] text-secondary">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />Under par
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />Par (E)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />Over par
        </span>
      </div>
    </div>
  );
}

/** 将 recap text 按 ## 拆分并渲染为段落（同 briefing-display 方式） */
function RecapText({ text }: { text: string }) {
  const sections = text.split(/^## /m).filter(Boolean);

  return (
    <div className="flex flex-col gap-5">
      {sections.map((section, idx) => {
        const lines = section.split("\n");
        const title = lines[0]?.trim();
        const body = lines.slice(1).join("\n").trim();

        return (
          <div key={idx}>
            {title && (
              <h3 className="text-[1.0625rem] font-semibold text-text mb-2">
                {title}
              </h3>
            )}
            {body && (
              <div className="text-[0.9375rem] leading-[1.625rem] text-text/85 whitespace-pre-line">
                {body.split("\n").map((line, lineIdx) => {
                  const trimmed = line.trim();
                  // 渲染 bullet 列表行
                  if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                    return (
                      <div key={lineIdx} className="flex gap-2 ml-1">
                        <span className="text-secondary shrink-0">&#8226;</span>
                        <span>{trimmed.slice(2)}</span>
                      </div>
                    );
                  }
                  // 空行
                  if (!trimmed) {
                    return <div key={lineIdx} className="h-2" />;
                  }
                  // 普通文本行
                  return <p key={lineIdx}>{trimmed}</p>;
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function RecapDisplay({
  recapText,
  courseName,
  teeName,
  playedDate,
  stats,
  holeData,
}: RecapDisplayProps) {
  const formattedDate = new Date(playedDate + "T00:00:00").toLocaleDateString(
    "en-US",
    { weekday: "long", month: "long", day: "numeric", year: "numeric" }
  );

  return (
    <div className="flex flex-col gap-6">
      {/* 页头 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[1.875rem] font-semibold text-text">
            Vibe Caddie Recap
          </h1>
          <p className="text-[0.9375rem] text-secondary mt-1">
            {courseName && teeName
              ? `${courseName} — ${teeName}`
              : "Loading course info..."}
            {" "}&#183; {formattedDate}
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => window.print()}
          className="shrink-0"
        >
          <svg
            className="w-4 h-4 mr-1.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          Print
        </Button>
      </div>

      {/* Round Temperature chart */}
      {holeData && holeData.length >= 2 && (
        <Card>
          <SectionTitle className="mb-3">Round Temperature</SectionTitle>
          <p className="text-[0.75rem] text-secondary mb-3">Score vs par per hole — negative is better</p>
          <RoundTemperatureChart holeData={holeData} />
        </Card>
      )}

      {/* FIR / GIR / Putts stats */}
      {stats && (
        <Card>
          <SectionTitle className="mb-3">Round Stats</SectionTitle>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center gap-0.5">
              <p className="text-[1.375rem] font-bold text-text">
                {stats.firTotal > 0
                  ? `${Math.round((stats.fir / stats.firTotal) * 100)}%`
                  : "—"}
              </p>
              <p className="text-[0.75rem] text-secondary uppercase tracking-wide">FIR</p>
              <p className="text-[0.75rem] text-secondary">
                {stats.fir}/{stats.firTotal}
              </p>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <p className="text-[1.375rem] font-bold text-text">
                {stats.girTotal > 0
                  ? `${Math.round((stats.gir / stats.girTotal) * 100)}%`
                  : "—"}
              </p>
              <p className="text-[0.75rem] text-secondary uppercase tracking-wide">GIR</p>
              <p className="text-[0.75rem] text-secondary">
                {stats.gir}/{stats.girTotal}
              </p>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <p className="text-[1.375rem] font-bold text-text">
                {stats.holesWithPutts > 0 && stats.putts != null ? stats.putts : "—"}
              </p>
              <p className="text-[0.75rem] text-secondary uppercase tracking-wide">Putts</p>
              <p className="text-[0.75rem] text-secondary">
                {stats.holesWithPutts > 0 ? `${stats.holesWithPutts} holes` : "not tracked"}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* LLM 生成的回顾内容 */}
      <Card>
        <SectionTitle className="mb-4">Round Review</SectionTitle>
        <RecapText text={recapText} />
      </Card>
    </div>
  );
}

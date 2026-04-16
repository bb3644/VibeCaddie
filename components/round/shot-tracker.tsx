"use client";

import { useState, useCallback, useRef } from "react";
import type { RoundHole } from "@/lib/db/types";

// ─── Approach Tracker ─────────────────────────────────────────────

const APPROACH_W = 300;
const APPROACH_H = 300;
const CX = 150;
const CY = 150;
const RINGS = [
  { r: 130, label: "30ft / 9m", color: "#d1d5db" },
  { r: 85,  label: "20ft / 6m", color: "#9ca3af" },
  { r: 40,  label: "10ft / 3m", color: "#6b7280" },
];

function ApproachTracker({
  shots,
  selectedHole,
  readonly,
  overlayColor,
  onPlace,
}: {
  shots: { holeNumber: number; x: number; y: number }[];
  selectedHole: number | null;
  readonly?: boolean;
  overlayColor?: string;
  onPlace?: (x: number, y: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (readonly || !onPlace || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const rawX = ((e.clientX - rect.left) / rect.width) * APPROACH_W;
      const rawY = ((e.clientY - rect.top) / rect.height) * APPROACH_H;
      onPlace(rawX / APPROACH_W, rawY / APPROACH_H);
    },
    [readonly, onPlace]
  );

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${APPROACH_W} ${APPROACH_H}`}
      className={`w-full max-w-[280px] mx-auto select-none ${!readonly ? "cursor-crosshair" : ""}`}
      onClick={handleClick}
    >
      {/* Background */}
      <circle cx={CX} cy={CY} r={145} fill="#f3f4f6" />

      {/* Cardinal guide lines */}
      <line x1={CX} y1={5} x2={CX} y2={295} stroke="#e5e7eb" strokeWidth={1} />
      <line x1={5} y1={CY} x2={295} y2={CY} stroke="#e5e7eb" strokeWidth={1} />

      {/* Rings (outer to inner) */}
      {RINGS.map(({ r, label, color }) => (
        <g key={r}>
          <circle cx={CX} cy={CY} r={r} fill="none" stroke={color} strokeWidth={1.5} />
          <text
            x={CX + r - 4}
            y={CY + 11}
            textAnchor="end"
            fontSize={9}
            fill={color}
            fontFamily="sans-serif"
          >
            {label}
          </text>
        </g>
      ))}

      {/* Center pin */}
      <circle cx={CX} cy={CY} r={10} fill="#16a34a" />
      <text x={CX} y={CY + 4} textAnchor="middle" fontSize={12} fill="white">⛳</text>

      {/* Shot dots */}
      {shots.map(({ holeNumber, x, y }) => {
        const dotX = x * APPROACH_W;
        const dotY = y * APPROACH_H;
        const isSelected = holeNumber === selectedHole;
        const fill = overlayColor ?? (isSelected ? "#2563eb" : "#dc2626");
        return (
          <g key={holeNumber}>
            <circle cx={dotX} cy={dotY} r={11} fill={fill} opacity={overlayColor ? 0.6 : 0.9} />
            {!overlayColor && (
              <text
                x={dotX}
                y={dotY + 4}
                textAnchor="middle"
                fontSize={9}
                fontWeight="bold"
                fill="white"
                fontFamily="sans-serif"
              >
                {holeNumber}
              </text>
            )}
          </g>
        );
      })}

      {/* Tap hint when no shots placed yet */}
      {!readonly && shots.length === 0 && (
        <text x={CX} y={CY + 28} textAnchor="middle" fontSize={11} fill="#9ca3af" fontFamily="sans-serif">
          tap to mark landing spot
        </text>
      )}
    </svg>
  );
}

// ─── Drive Tracker ────────────────────────────────────────────────

const DRIVE_W = 220;
const DRIVE_H = 360;
const OVAL_CX = 110;
const OVAL_CY = 180;
const OVAL_RX = 94;
const OVAL_RY = 155;
// Zone boundaries (x values)
const ZONE_LEFT = OVAL_CX - OVAL_RX / 3;   // ≈ 79
const ZONE_RIGHT = OVAL_CX + OVAL_RX / 3;  // ≈ 141
// Distance y positions (top = far, bottom = close)
const DIST_200 = OVAL_CY - OVAL_RY * 0.55;  // ≈ 95
const DIST_150 = OVAL_CY;                    // ≈ 180
const DIST_100 = OVAL_CY + OVAL_RY * 0.55;  // ≈ 265

function DriveTracker({
  shots,
  selectedHole,
  readonly,
  overlayColor,
  onPlace,
}: {
  shots: { holeNumber: number; x: number; y: number }[];
  selectedHole: number | null;
  readonly?: boolean;
  overlayColor?: string;
  onPlace?: (x: number, y: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (readonly || !onPlace || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const rawX = ((e.clientX - rect.left) / rect.width) * DRIVE_W;
      const rawY = ((e.clientY - rect.top) / rect.height) * DRIVE_H;
      onPlace(rawX / DRIVE_W, rawY / DRIVE_H);
    },
    [readonly, onPlace]
  );

  const patternId = `stripe-${Math.random().toString(36).slice(2, 7)}`;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${DRIVE_W} ${DRIVE_H}`}
      className={`w-full max-w-[200px] mx-auto select-none ${!readonly ? "cursor-crosshair" : ""}`}
      onClick={handleClick}
    >
      <defs>
        <pattern id={patternId} width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={8} height={8} fill="#d1fae5" />
          <line x1={0} y1={0} x2={0} y2={8} stroke="#a7f3d0" strokeWidth={3} />
        </pattern>
        <clipPath id="oval-clip">
          <ellipse cx={OVAL_CX} cy={OVAL_CY} rx={OVAL_RX} ry={OVAL_RY} />
        </clipPath>
      </defs>

      {/* Fairway fill */}
      <ellipse cx={OVAL_CX} cy={OVAL_CY} rx={OVAL_RX} ry={OVAL_RY} fill={`url(#${patternId})`} />

      {/* Zone dividers (clipped to oval) */}
      <g clipPath="url(#oval-clip)">
        <line x1={ZONE_LEFT} y1={0} x2={ZONE_LEFT} y2={DRIVE_H} stroke="#6b7280" strokeWidth={1} strokeDasharray="4 3" />
        <line x1={ZONE_RIGHT} y1={0} x2={ZONE_RIGHT} y2={DRIVE_H} stroke="#6b7280" strokeWidth={1} strokeDasharray="4 3" />
        {/* Distance lines */}
        <line x1={0} y1={DIST_200} x2={DRIVE_W} y2={DIST_200} stroke="#9ca3af" strokeWidth={1} strokeDasharray="6 3" />
        <line x1={0} y1={DIST_150} x2={DRIVE_W} y2={DIST_150} stroke="#9ca3af" strokeWidth={1} strokeDasharray="6 3" />
        <line x1={0} y1={DIST_100} x2={DRIVE_W} y2={DIST_100} stroke="#9ca3af" strokeWidth={1} strokeDasharray="6 3" />
      </g>

      {/* Oval border */}
      <ellipse cx={OVAL_CX} cy={OVAL_CY} rx={OVAL_RX} ry={OVAL_RY} fill="none" stroke="#4b5563" strokeWidth={2} />

      {/* Zone labels */}
      <text x={ZONE_LEFT / 2 + OVAL_CX - OVAL_RX / 2} y={24} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#374151" fontFamily="sans-serif">LF</text>
      <text x={OVAL_CX} y={24} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#374151" fontFamily="sans-serif">CF</text>
      <text x={(ZONE_RIGHT + OVAL_CX + OVAL_RX) / 2} y={24} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#374151" fontFamily="sans-serif">RF</text>

      {/* Distance badges */}
      {[{ y: DIST_200, label: "200 yds" }, { y: DIST_150, label: "150 yds" }, { y: DIST_100, label: "100 yds" }].map(({ y, label }) => (
        <g key={label}>
          <rect x={DRIVE_W - 54} y={y - 9} width={52} height={14} rx={3} fill="white" fillOpacity={0.85} />
          <text x={DRIVE_W - 28} y={y + 2} textAnchor="middle" fontSize={8.5} fill="#4b5563" fontFamily="sans-serif">{label}</text>
        </g>
      ))}

      {/* Tee marker at bottom */}
      <rect x={OVAL_CX - 6} y={DRIVE_H - 22} width={12} height={8} rx={2} fill="#1d4ed8" />
      <text x={OVAL_CX} y={DRIVE_H - 15} textAnchor="middle" fontSize={7} fill="white" fontWeight="bold" fontFamily="sans-serif">TEE</text>

      {/* Shot dots */}
      {shots.map(({ holeNumber, x, y }) => {
        const dotX = x * DRIVE_W;
        const dotY = y * DRIVE_H;
        const isSelected = holeNumber === selectedHole;
        const fill = overlayColor ?? (isSelected ? "#2563eb" : "#dc2626");
        return (
          <g key={holeNumber}>
            <circle cx={dotX} cy={dotY} r={11} fill={fill} opacity={overlayColor ? 0.6 : 0.9} />
            {!overlayColor && (
              <text
                x={dotX}
                y={dotY + 4}
                textAnchor="middle"
                fontSize={9}
                fontWeight="bold"
                fill="white"
                fontFamily="sans-serif"
              >
                {holeNumber}
              </text>
            )}
          </g>
        );
      })}

      {/* Tap hint */}
      {!readonly && shots.length === 0 && (
        <text x={OVAL_CX} y={OVAL_CY + 20} textAnchor="middle" fontSize={10} fill="#6b7280" fontFamily="sans-serif">
          tap to mark drive
        </text>
      )}
    </svg>
  );
}

// ─── Shot Tracker Section ─────────────────────────────────────────

type TrackerTab = "approach" | "drive";

export interface ShotTrackerSectionProps {
  holes: RoundHole[];
  holesPlayed: number;
  onSavePosition: (
    holeNumber: number,
    type: "approach" | "drive",
    x: number,
    y: number
  ) => Promise<void>;
}

export function ShotTrackerSection({
  holes,
  holesPlayed,
  onSavePosition,
}: ShotTrackerSectionProps) {
  const [tab, setTab] = useState<TrackerTab>("approach");
  const [selectedHole, setSelectedHole] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  const holeNumbers = Array.from({ length: holesPlayed }, (_, i) => i + 1);

  const approachShots = holes
    .filter((h) => h.approach_x != null && h.approach_y != null)
    .map((h) => ({ holeNumber: h.hole_number, x: h.approach_x!, y: h.approach_y! }));

  const driveShots = holes
    .filter((h) => h.drive_x != null && h.drive_y != null)
    .map((h) => ({ holeNumber: h.hole_number, x: h.drive_x!, y: h.drive_y! }));

  const handlePlace = useCallback(
    async (x: number, y: number) => {
      setSaving(true);
      try {
        await onSavePosition(selectedHole, tab, x, y);
        // auto-advance to next untracked hole
        const tracked = tab === "approach" ? approachShots : driveShots;
        const trackedNums = new Set(tracked.map((s) => s.holeNumber));
        trackedNums.add(selectedHole); // just placed
        const next = holeNumbers.find((n) => !trackedNums.has(n));
        if (next) setSelectedHole(next);
      } finally {
        setSaving(false);
      }
    },
    [selectedHole, tab, approachShots, driveShots, holeNumbers, onSavePosition]
  );

  const trackedApproach = new Set(approachShots.map((s) => s.holeNumber));
  const trackedDrive = new Set(driveShots.map((s) => s.holeNumber));

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
        {(["approach", "drive"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-[0.875rem] font-medium rounded-md transition-colors ${
              tab === t
                ? "bg-white text-text shadow-sm"
                : "text-secondary hover:text-text"
            }`}
          >
            {t === "approach" ? "Approaches" : "Drives"}
          </button>
        ))}
      </div>

      {/* Hole selector */}
      <div className="flex flex-wrap gap-1.5">
        {holeNumbers.map((n) => {
          const isTracked =
            tab === "approach" ? trackedApproach.has(n) : trackedDrive.has(n);
          const isSelected = n === selectedHole;
          return (
            <button
              key={n}
              onClick={() => setSelectedHole(n)}
              className={`w-8 h-8 text-[0.75rem] font-semibold rounded-full border transition-colors ${
                isSelected
                  ? "bg-accent text-white border-accent"
                  : isTracked
                  ? "bg-green-100 text-green-700 border-green-300"
                  : "bg-white text-secondary border-divider hover:border-accent"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>

      {saving && (
        <p className="text-[0.75rem] text-secondary text-center">Saving...</p>
      )}

      {/* Tracker graphic */}
      <div className="flex justify-center">
        {tab === "approach" ? (
          <ApproachTracker
            shots={approachShots}
            selectedHole={selectedHole}
            onPlace={handlePlace}
          />
        ) : (
          <DriveTracker
            shots={driveShots}
            selectedHole={selectedHole}
            onPlace={handlePlace}
          />
        )}
      </div>

      <p className="text-[0.75rem] text-secondary text-center">
        Hole {selectedHole} selected &middot; tap graphic to place shot
      </p>
    </div>
  );
}

// ─── Multi-round Overlay (read-only) ─────────────────────────────

const OVERLAY_COLORS = [
  "#dc2626", "#2563eb", "#16a34a", "#d97706",
  "#7c3aed", "#db2777", "#0891b2", "#65a30d",
];

export interface OverlayRound {
  id: string;
  label: string; // e.g. "2024-05-10"
  holes: { holeNumber: number; approach_x: number | null; approach_y: number | null; drive_x: number | null; drive_y: number | null }[];
}

export function ShotTrackerOverlay({ rounds }: { rounds: OverlayRound[] }) {
  const [tab, setTab] = useState<TrackerTab>("approach");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
        {(["approach", "drive"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-[0.875rem] font-medium rounded-md transition-colors ${
              tab === t
                ? "bg-white text-text shadow-sm"
                : "text-secondary hover:text-text"
            }`}
          >
            {t === "approach" ? "Approaches" : "Drives"}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {rounds.map((r, i) => (
          <div key={r.id} className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-full opacity-70"
              style={{ backgroundColor: OVERLAY_COLORS[i % OVERLAY_COLORS.length] }}
            />
            <span className="text-[0.75rem] text-secondary">{r.label}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        {tab === "approach" ? (
          <svg
            viewBox={`0 0 ${APPROACH_W} ${APPROACH_H}`}
            className="w-full max-w-[280px] mx-auto select-none"
          >
            <circle cx={CX} cy={CY} r={145} fill="#f3f4f6" />
            <line x1={CX} y1={5} x2={CX} y2={295} stroke="#e5e7eb" strokeWidth={1} />
            <line x1={5} y1={CY} x2={295} y2={CY} stroke="#e5e7eb" strokeWidth={1} />
            {RINGS.map(({ r, label, color }) => (
              <g key={r}>
                <circle cx={CX} cy={CY} r={r} fill="none" stroke={color} strokeWidth={1.5} />
                <text x={CX + r - 4} y={CY + 11} textAnchor="end" fontSize={9} fill={color} fontFamily="sans-serif">{label}</text>
              </g>
            ))}
            <circle cx={CX} cy={CY} r={10} fill="#16a34a" />
            <text x={CX} y={CY + 4} textAnchor="middle" fontSize={12} fill="white">⛳</text>
            {rounds.map((r, i) => {
              const color = OVERLAY_COLORS[i % OVERLAY_COLORS.length];
              return r.holes
                .filter((h) => h.approach_x != null && h.approach_y != null)
                .map((h) => (
                  <circle
                    key={`${r.id}-${h.holeNumber}`}
                    cx={h.approach_x! * APPROACH_W}
                    cy={h.approach_y! * APPROACH_H}
                    r={9}
                    fill={color}
                    opacity={0.55}
                  />
                ));
            })}
          </svg>
        ) : (
          <DriveTracker
            shots={[]}
            selectedHole={null}
            readonly
          />
        )}
      </div>

      {tab === "drive" && (
        <div className="relative">
          <svg
            viewBox={`0 0 ${DRIVE_W} ${DRIVE_H}`}
            className="w-full max-w-[200px] mx-auto select-none"
          >
            <defs>
              <pattern id="stripe-overlay" width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width={8} height={8} fill="#d1fae5" />
                <line x1={0} y1={0} x2={0} y2={8} stroke="#a7f3d0" strokeWidth={3} />
              </pattern>
              <clipPath id="oval-clip-overlay">
                <ellipse cx={OVAL_CX} cy={OVAL_CY} rx={OVAL_RX} ry={OVAL_RY} />
              </clipPath>
            </defs>
            <ellipse cx={OVAL_CX} cy={OVAL_CY} rx={OVAL_RX} ry={OVAL_RY} fill="url(#stripe-overlay)" />
            <g clipPath="url(#oval-clip-overlay)">
              <line x1={ZONE_LEFT} y1={0} x2={ZONE_LEFT} y2={DRIVE_H} stroke="#6b7280" strokeWidth={1} strokeDasharray="4 3" />
              <line x1={ZONE_RIGHT} y1={0} x2={ZONE_RIGHT} y2={DRIVE_H} stroke="#6b7280" strokeWidth={1} strokeDasharray="4 3" />
              <line x1={0} y1={DIST_200} x2={DRIVE_W} y2={DIST_200} stroke="#9ca3af" strokeWidth={1} strokeDasharray="6 3" />
              <line x1={0} y1={DIST_150} x2={DRIVE_W} y2={DIST_150} stroke="#9ca3af" strokeWidth={1} strokeDasharray="6 3" />
              <line x1={0} y1={DIST_100} x2={DRIVE_W} y2={DIST_100} stroke="#9ca3af" strokeWidth={1} strokeDasharray="6 3" />
            </g>
            <ellipse cx={OVAL_CX} cy={OVAL_CY} rx={OVAL_RX} ry={OVAL_RY} fill="none" stroke="#4b5563" strokeWidth={2} />
            {[{ y: DIST_200, label: "200 yds" }, { y: DIST_150, label: "150 yds" }, { y: DIST_100, label: "100 yds" }].map(({ y, label }) => (
              <g key={label}>
                <rect x={DRIVE_W - 54} y={y - 9} width={52} height={14} rx={3} fill="white" fillOpacity={0.85} />
                <text x={DRIVE_W - 28} y={y + 2} textAnchor="middle" fontSize={8.5} fill="#4b5563" fontFamily="sans-serif">{label}</text>
              </g>
            ))}
            {rounds.map((r, i) => {
              const color = OVERLAY_COLORS[i % OVERLAY_COLORS.length];
              return r.holes
                .filter((h) => h.drive_x != null && h.drive_y != null)
                .map((h) => (
                  <circle
                    key={`${r.id}-${h.holeNumber}`}
                    cx={h.drive_x! * DRIVE_W}
                    cy={h.drive_y! * DRIVE_H}
                    r={9}
                    fill={color}
                    opacity={0.55}
                  />
                ));
            })}
          </svg>
        </div>
      )}
    </div>
  );
}

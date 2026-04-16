"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { CourseHole, OfficialHoleNote, PlayerHoleNote, BriefingJson } from "@/lib/db/types";

interface BriefingData {
  id: string;
  course_tee_id: string;
  course_id: string;
  course_name: string;
  tee_name: string;
  play_date: string;
  briefing_json: BriefingJson;
}

interface TeeInfo {
  id: string;
  tee_name: string;
  tee_color: string | null;
  course_rating: number | null;
  slope_rating: number | null;
  par_total: number;
}

interface HoleWithNotes {
  hole: CourseHole;
  official: OfficialHoleNote | null;
  playerNotes: PlayerHoleNote[];
}

const COLOR_DOT: Record<string, string> = {
  White: "#d1d5db",
  Yellow: "#facc15",
  Blue: "#3b82f6",
  Red: "#ef4444",
  Gold: "#f59e0b",
  Black: "#1f2937",
};

export default function PrintBriefingPage() {
  const params = useParams();
  const briefingId = params.briefingId as string;

  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [tee, setTee] = useState<TeeInfo | null>(null);
  const [courseName, setCourseName] = useState("");
  const [courseLocation, setCourseLocation] = useState("");
  const [rows, setRows] = useState<HoleWithNotes[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // 1. Load briefing
        const briefingRes = await fetch(`/api/briefing/${briefingId}`);
        if (!briefingRes.ok) return;
        const bData = (await briefingRes.json()) as BriefingData;
        setBriefing(bData);

        const courseId = bData.course_id;
        const teeId = bData.course_tee_id;

        // 2. Load course info, holes, and official notes in parallel
        const [courseRes, holesRes, notesRes] = await Promise.all([
          fetch(`/api/courses/${courseId}`),
          fetch(`/api/courses/${courseId}/tees/${teeId}/holes`),
          fetch(`/api/courses/${courseId}/official-notes`),
        ]);

        if (courseRes.ok) {
          const courseData = await courseRes.json();
          setCourseName(courseData.name ?? "");
          setCourseLocation(courseData.location_text ?? "");
          const teeData = courseData.tees?.find((t: TeeInfo) => t.id === teeId) ?? null;
          setTee(teeData);
        }

        const holes: CourseHole[] = holesRes.ok ? await holesRes.json() : [];
        const officialMap: Record<number, OfficialHoleNote> = notesRes.ok ? await notesRes.json() : {};

        // 3. Load player notes per hole
        const rowsData: HoleWithNotes[] = await Promise.all(
          holes.map(async (hole) => {
            const pnRes = await fetch(`/api/courses/holes/${hole.id}/player-notes`);
            const playerNotes: PlayerHoleNote[] = pnRes.ok ? await pnRes.json() : [];
            return {
              hole,
              official: officialMap[hole.hole_number] ?? null,
              playerNotes,
            };
          })
        );

        setRows(rowsData.sort((a, b) => a.hole.hole_number - b.hole.hole_number));
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [briefingId]);

  // Auto-print once loaded
  useEffect(() => {
    if (!loading && briefing) {
      setTimeout(() => window.print(), 500);
    }
  }, [loading, briefing]);

  if (loading) {
    return (
      <div style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", color: "#374151" }}>
        Loading…
      </div>
    );
  }

  if (!briefing) {
    return (
      <div style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", color: "#374151" }}>
        Briefing not found.
      </div>
    );
  }

  const bj = briefing.briefing_json;
  const rawDate = briefing.play_date?.split("T")[0] ?? "";
  const formattedDate = rawDate
    ? new Date(rawDate + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric", year: "numeric",
      })
    : "";

  const dotColor = tee?.tee_color ? (COLOR_DOT[tee.tee_color] ?? "#9ca3af") : "#9ca3af";

  // Strip markdown markers so they render as plain readable text
  function clean(text: string): string {
    return text
      .replace(/\*\*(.+?)\*\*/g, "$1")    // **bold** → bold
      .replace(/\*(.+?)\*/g, "$1")         // *italic* → italic
      .replace(/^#+\s*/gm, "")             // ## headings → plain
      .replace(/`(.+?)`/g, "$1");          // `code` → plain
  }

  // Parse briefing text into sections
  const briefingSections = bj.display_text
    .split(/^## /m)
    .filter(Boolean)
    .map((s) => {
      const lines = s.split("\n");
      return { title: lines[0]?.trim() ?? "", body: lines.slice(1).join("\n").trim() };
    });

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family:
            -apple-system, BlinkMacSystemFont,
            "SF Pro Text", "SF Pro Display",
            "PingFang SC", "PingFang TC",
            "Hiragino Sans GB",
            "Noto Sans SC", "Noto Sans CJK SC",
            "Microsoft YaHei", "SimHei",
            "WenQuanYi Micro Hei",
            "Helvetica Neue", Arial, sans-serif;
          background: white;
          color: #1d1d1f;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }

        @media screen {
          body { background: #f5f5f7; }
          .page { width: 210mm; margin: 2rem auto; background: white; padding: 16mm 14mm; box-shadow: 0 2px 20px rgba(0,0,0,0.08); border-radius: 4px; }
          .print-btn { display: flex; justify-content: center; gap: 10px; padding: 1.25rem 0; }
          .print-btn button {
            padding: 9px 22px; border: none; border-radius: 980px; font-size: 13px; font-weight: 500;
            font-family: inherit; cursor: pointer; letter-spacing: -0.01em;
          }
          .print-btn .btn-primary { background: #1d1d1f; color: white; }
          .print-btn .btn-primary:hover { background: #3a3a3c; }
          .print-btn .btn-secondary { background: #e8e8ed; color: #1d1d1f; }
          .print-btn .btn-secondary:hover { background: #d2d2d7; }
          .course-section { margin-top: 0; }
        }

        @media print {
          @page { size: A4 portrait; margin: 10mm 12mm; }
          body { background: white; }
          .page { padding: 0; box-shadow: none; border-radius: 0; }
          .print-btn { display: none; }
          .page-break { page-break-after: always; }
          .course-name { font-size: 16px !important; }
          .tee-label { font-size: 11px !important; }
          .meta { font-size: 9.5px !important; margin-top: 3px !important; }
          .header { padding-bottom: 7px !important; margin-bottom: 10px !important; }
          thead th { padding: 4px 6px !important; font-size: 9px !important; }
          td { padding: 3px 6px !important; font-size: 10px !important; line-height: 1.3 !important; }
          .note-label { font-size: 7.5px !important; }
          .note-text, .player-note { font-size: 9.5px !important; }
          .footer { margin-top: 8px !important; font-size: 8px !important; }
          .briefing-section-title { font-size: 12px !important; margin-bottom: 4px !important; margin-top: 12px !important; }
          .briefing-section-body { font-size: 10.5px !important; line-height: 1.45 !important; }
          .pill { font-size: 9px !important; padding: 2px 8px !important; min-width: 24px !important; height: auto !important; }
          .pill-row { gap: 4px !important; margin-bottom: 6px !important; }
          .pill-label { font-size: 9px !important; margin-bottom: 2px !important; }
          .avoid-box { font-size: 9.5px !important; padding: 5px 8px !important; margin-top: 6px !important; }
          .structured-card { padding: 10px 12px !important; margin-bottom: 10px !important; }
        }

        /* Shared header */
        .header { border-bottom: 1px solid #d2d2d7; padding-bottom: 12px; margin-bottom: 18px; }
        .brand { font-size: 11px; font-weight: 500; color: #86868b; letter-spacing: 0.02em; text-transform: uppercase; margin-bottom: 6px; }
        .course-name { font-size: 22px; font-weight: 600; color: #1d1d1f; letter-spacing: -0.4px; line-height: 1.2; }
        .tee-line { display: flex; align-items: center; gap: 7px; margin-top: 5px; }
        .tee-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; border: 1px solid rgba(0,0,0,0.12); }
        .tee-label { font-size: 13px; font-weight: 400; color: #3a3a3c; letter-spacing: -0.01em; }
        .meta { font-size: 11px; color: #86868b; margin-top: 5px; letter-spacing: -0.01em; }

        /* Structured briefing card */
        .structured-card { background: #f5f5f7; border-radius: 8px; padding: 14px 16px; margin-bottom: 18px; }
        .pill-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #86868b; margin-bottom: 5px; }
        .pill-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
        .pill {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 28px; height: 26px; padding: 0 9px;
          border-radius: 980px; font-size: 11px; font-weight: 500;
          border: 1px solid;
        }
        .pill-driver { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
        .pill-control { background: #fffbeb; color: #b45309; border-color: #fde68a; }
        .avoid-box { display: flex; align-items: center; gap: 7px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 8px 12px; font-size: 12px; color: #92400e; }

        /* Briefing text sections */
        .briefing-sections { display: flex; flex-direction: column; gap: 12px; }
        .briefing-section-title { font-size: 13.5px; font-weight: 600; color: #1d1d1f; margin-bottom: 5px; margin-top: 16px; }
        .briefing-section-body { font-size: 12px; color: #3a3a3c; line-height: 1.55; }
        .briefing-bullet { display: flex; gap: 6px; }
        .briefing-bullet-dot { flex-shrink: 0; color: #86868b; }

        /* Course notes section */
        .section-divider { border: none; border-top: 1px solid #d2d2d7; margin: 24px 0 20px; }
        .section-heading { font-size: 15px; font-weight: 600; color: #1d1d1f; margin-bottom: 4px; }
        .section-sub { font-size: 11px; color: #86868b; margin-bottom: 14px; }

        /* Table */
        table { width: 100%; border-collapse: collapse; }
        thead tr { background: #1d1d1f; color: white; }
        thead th {
          padding: 7px 8px; text-align: left; font-weight: 500;
          font-size: 10.5px; letter-spacing: 0.02em; text-transform: uppercase;
        }
        thead th.num { text-align: center; width: 34px; }
        thead th.par { text-align: center; width: 30px; }
        thead th.yds { text-align: center; width: 44px; }
        thead th.si  { text-align: center; width: 28px; }

        tbody tr { border-bottom: 1px solid #e8e8ed; vertical-align: top; page-break-inside: avoid; }
        tbody tr:nth-child(even) { background: #f5f5f7; }
        td { padding: 7px 8px; font-size: 12px; line-height: 1.4; color: #1d1d1f; }
        td.num { text-align: center; font-weight: 600; font-variant-numeric: tabular-nums; }
        td.par { text-align: center; font-variant-numeric: tabular-nums; }
        td.yds { text-align: center; color: #3a3a3c; font-variant-numeric: tabular-nums; }
        td.si  { text-align: center; color: #86868b; font-variant-numeric: tabular-nums; }

        /* Notes */
        .note-block { margin-bottom: 5px; }
        .note-block:last-child { margin-bottom: 0; }
        .note-label {
          font-size: 9.5px; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.06em; color: #86868b; margin-bottom: 2px;
        }
        .note-text { font-size: 11.5px; color: #1d1d1f; line-height: 1.4; }
        .player-note { display: flex; gap: 5px; font-size: 11.5px; color: #1d1d1f; line-height: 1.4; }
        .player-name { font-weight: 500; flex-shrink: 0; color: #1d1d1f; }

        /* Footer */
        .footer {
          margin-top: 20px; padding-top: 10px; border-top: 1px solid #e8e8ed;
          display: flex; justify-content: space-between; align-items: center;
        }
        .footer-brand { font-size: 11px; font-weight: 500; color: #1d1d1f; }
        .footer-credit { font-size: 10px; color: #86868b; }
        .footer-date { font-size: 10px; color: #86868b; }
      `}</style>

      {/* lang="zh-Hans" helps browser pick the correct CJK glyph set */}
      <div lang="zh-Hans" className="print-btn">
        <button className="btn-primary" onClick={() => window.print()}>
          Save as PDF / Print
        </button>
        <button className="btn-secondary" onClick={() => window.close()}>
          Close
        </button>
      </div>

      <div className="page" lang="zh-Hans">
        {/* ── SECTION 1: PRE-ROUND BRIEFING ── */}
        <div className="header">
          <div className="brand">Vibe Caddie · Pre-Round Briefing</div>
          <div className="course-name">{courseName}</div>
          <div className="tee-line">
            <div className="tee-dot" style={{ background: dotColor }} />
            <span className="tee-label">
              {tee?.tee_name ?? briefing.tee_name} Tee
              {tee?.par_total ? ` · Par ${tee.par_total}` : ""}
              {tee?.course_rating != null ? ` · CR ${tee.course_rating}` : ""}
              {tee?.slope_rating != null ? ` · SL ${tee.slope_rating}` : ""}
            </span>
          </div>
          {courseLocation && <div className="meta">{courseLocation}</div>}
          <div className="meta">{formattedDate}</div>
        </div>

        {/* Structured: driver / control / avoid */}
        <div className="structured-card">
          {bj.driver_ok_holes.length > 0 && (
            <div>
              <div className="pill-label">Driver OK</div>
              <div className="pill-row">
                {bj.driver_ok_holes.map((h) => (
                  <span key={h} className="pill pill-driver">{h}</span>
                ))}
              </div>
            </div>
          )}
          {bj.control_holes.length > 0 && (
            <div>
              <div className="pill-label">Control Club</div>
              <div className="pill-row">
                {bj.control_holes.map((h) => (
                  <span key={h} className="pill pill-control">{h}</span>
                ))}
              </div>
            </div>
          )}
          {bj.avoid_side !== "none" && (
            <div className="avoid-box">
              <span>⚠</span>
              <span>Most trouble is on the <strong>{bj.avoid_side}</strong> — favour the opposite side off the tee.</span>
            </div>
          )}
        </div>

        {/* Caddie notes text */}
        <div className="briefing-sections">
          {briefingSections.map((section, idx) => (
            <div key={idx}>
              {section.title && (
                <div className="briefing-section-title">{section.title}</div>
              )}
              {section.body && (
                <div className="briefing-section-body">
                  {section.body.split("\n").map((line, lineIdx) => {
                    const trimmed = line.trim();
                    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                      return (
                        <div key={lineIdx} className="briefing-bullet">
                          <span className="briefing-bullet-dot">•</span>
                          <span>{clean(trimmed.slice(2))}</span>
                        </div>
                      );
                    }
                    if (!trimmed) return <div key={lineIdx} style={{ height: "4px" }} />;
                    return <p key={lineIdx}>{clean(trimmed)}</p>;
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── PAGE BREAK ── */}
        <div className="page-break" />

        {/* ── SECTION 2: COURSE NOTES ── */}
        <div className="header" style={{ marginTop: "16mm" }}>
          <div className="brand">Vibe Caddie · Course Notes</div>
          <div className="course-name">{courseName}</div>
          <div className="tee-line">
            <div className="tee-dot" style={{ background: dotColor }} />
            <span className="tee-label">
              {tee?.tee_name ?? briefing.tee_name} Tee
              {tee?.par_total ? ` · Par ${tee.par_total}` : ""}
            </span>
          </div>
          {courseLocation && <div className="meta">{courseLocation}</div>}
        </div>

        {rows.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th className="num">Hole</th>
                <th className="par">Par</th>
                <th className="yds">Yds</th>
                <th className="si">SI</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ hole, official, playerNotes }) => {
                const hasNote = hole.hole_note || official || playerNotes.length > 0;
                return (
                  <tr key={hole.hole_number}>
                    <td className="num">{hole.hole_number}</td>
                    <td className="par">{hole.par || "—"}</td>
                    <td className="yds">{hole.yardage || "—"}</td>
                    <td className="si">{hole.si || "—"}</td>
                    <td>
                      {hole.hole_note && (
                        <div className="note-block">
                          <div className="note-label">Scorecard</div>
                          <div className="note-text">{hole.hole_note}</div>
                        </div>
                      )}
                      {official?.note && (
                        <div className="note-block">
                          <div className="note-label">Official</div>
                          <div className="note-text">{clean(official.note)}</div>
                        </div>
                      )}
                      {playerNotes.length > 0 && (
                        <div className="note-block">
                          <div className="note-label">Player Notes</div>
                          {playerNotes.map((n) => (
                            <div key={n.id} className="player-note">
                              <span className="player-name">{n.user_name}:</span>
                              <span>{clean(n.note)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {!hasNote && <span style={{ color: "#d1d5db" }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: "center", padding: "32px", color: "#86868b", fontSize: "13px" }}>
            No hole data added yet.
          </div>
        )}

        <div className="footer">
          <div>
            <span className="footer-brand">Vibe Caddie</span>
            <span className="footer-credit"> · created by Fan &amp; Fan</span>
          </div>
          <span className="footer-date">
            {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </span>
        </div>
      </div>
    </>
  );
}

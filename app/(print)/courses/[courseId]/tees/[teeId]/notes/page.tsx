"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { CourseHole, OfficialHoleNote, PlayerHoleNote } from "@/lib/db/types";

interface HoleWithNotes {
  hole: CourseHole;
  official: OfficialHoleNote | null;
  playerNotes: PlayerHoleNote[];
}

interface TeeInfo {
  tee_name: string;
  tee_color: string | null;
  course_rating: number | null;
  slope_rating: number | null;
  par_total: number;
}

interface CourseInfo {
  name: string;
  location_text: string | null;
  tees: (TeeInfo & { id: string })[];
}

const COLOR_DOT: Record<string, string> = {
  White: "#d1d5db",
  Yellow: "#facc15",
  Blue: "#3b82f6",
  Red: "#ef4444",
  Gold: "#f59e0b",
  Black: "#1f2937",
};

export default function PrintNotesPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const teeId = params.teeId as string;

  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [tee, setTee] = useState<TeeInfo | null>(null);
  const [rows, setRows] = useState<HoleWithNotes[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [courseRes, holesRes, notesRes] = await Promise.all([
          fetch(`/api/courses/${courseId}`),
          fetch(`/api/courses/${courseId}/tees/${teeId}/holes`),
          fetch(`/api/courses/${courseId}/official-notes`),
        ]);

        const courseData = courseRes.ok ? (await courseRes.json()) as CourseInfo & { tees: (TeeInfo & { id: string })[] } : null;
        const holes: CourseHole[] = holesRes.ok ? await holesRes.json() : [];
        const officialMap: Record<number, OfficialHoleNote> = notesRes.ok ? await notesRes.json() : {};

        if (courseData) {
          setCourse(courseData);
          const teeData = courseData.tees.find(t => t.id === teeId) ?? null;
          setTee(teeData);
        }

        // Fetch player notes for each hole
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
  }, [courseId, teeId]);

  // Auto-print once loaded
  useEffect(() => {
    if (!loading && rows.length > 0) {
      setTimeout(() => window.print(), 400);
    }
  }, [loading, rows]);

  if (loading) {
    return (
      <div style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", color: "#374151" }}>
        Loading…
      </div>
    );
  }

  const dotColor = tee?.tee_color ? (COLOR_DOT[tee.tee_color] ?? "#9ca3af") : "#9ca3af";
  const hasAnyNote = rows.some(r => r.official || r.playerNotes.length > 0 || r.hole.hole_note);

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        /* Apple.com system font stack */
        body {
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Arial, sans-serif;
          background: white;
          color: #1d1d1f;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }

        @media screen {
          body { background: #f5f5f7; }
          .page { width: 210mm; min-height: 297mm; margin: 2rem auto; background: white; padding: 16mm 14mm; box-shadow: 0 2px 20px rgba(0,0,0,0.08); border-radius: 4px; }
          .print-btn { display: flex; justify-content: center; gap: 10px; padding: 1.25rem 0; }
          .print-btn button {
            padding: 9px 22px; border: none; border-radius: 980px; font-size: 13px; font-weight: 500;
            font-family: inherit; cursor: pointer; letter-spacing: -0.01em;
          }
          .print-btn .btn-primary { background: #1d1d1f; color: white; }
          .print-btn .btn-primary:hover { background: #3a3a3c; }
          .print-btn .btn-secondary { background: #e8e8ed; color: #1d1d1f; }
          .print-btn .btn-secondary:hover { background: #d2d2d7; }
        }

        @media print {
          @page { size: A4 portrait; margin: 10mm 12mm; }
          body { background: white; }
          .page { padding: 0; box-shadow: none; border-radius: 0; }
          .print-btn { display: none; }
          .course-name { font-size: 16px !important; }
          .tee-label { font-size: 11px !important; }
          .meta { font-size: 9.5px !important; margin-top: 3px !important; }
          .header { padding-bottom: 7px !important; margin-bottom: 10px !important; }
          thead th { padding: 4px 6px !important; font-size: 9px !important; }
          td { padding: 3px 6px !important; font-size: 10px !important; line-height: 1.3 !important; }
          .note-label { font-size: 7.5px !important; }
          .note-text, .player-note { font-size: 9.5px !important; }
          .footer { margin-top: 8px !important; font-size: 8px !important; }
        }

        /* Header */
        .header { border-bottom: 1px solid #d2d2d7; padding-bottom: 12px; margin-bottom: 18px; }
        .brand { font-size: 11px; font-weight: 500; color: #86868b; letter-spacing: 0.02em; text-transform: uppercase; margin-bottom: 6px; }
        .course-name { font-size: 22px; font-weight: 600; color: #1d1d1f; letter-spacing: -0.4px; line-height: 1.2; }
        .tee-line { display: flex; align-items: center; gap: 7px; margin-top: 5px; }
        .tee-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; border: 1px solid rgba(0,0,0,0.12); }
        .tee-label { font-size: 13px; font-weight: 400; color: #3a3a3c; letter-spacing: -0.01em; }
        .meta { font-size: 11px; color: #86868b; margin-top: 5px; letter-spacing: -0.01em; }

        /* Table */
        table { width: 100%; border-collapse: collapse; }
        thead tr { background: #1d1d1f; color: white; }
        thead th {
          padding: 7px 8px; text-align: left; font-weight: 500;
          font-size: 10.5px; letter-spacing: 0.02em; text-transform: uppercase;
        }
        thead th.num { text-align: center; width: 34px; }
        thead th.par { text-align: center; width: 30px; }
        thead th.yds { text-align: center; width: 42px; }
        thead th.si  { text-align: center; width: 28px; }

        tbody tr { border-bottom: 1px solid #e8e8ed; vertical-align: top; page-break-inside: avoid; }
        tbody tr:nth-child(even) { background: #f5f5f7; }
        td { padding: 7px 8px; font-size: 12px; line-height: 1.4; color: #1d1d1f; }
        td.num { text-align: center; font-weight: 600; color: #1d1d1f; font-variant-numeric: tabular-nums; }
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
        .player-note { display: flex; gap: 5px; font-size: 11.5px; color: #3a3a3c; line-height: 1.4; }
        .player-name { font-weight: 500; flex-shrink: 0; color: #1d1d1f; }

        .empty { text-align: center; padding: 32px; color: #86868b; font-size: 13px; }

        /* Footer */
        .footer {
          margin-top: 20px; padding-top: 10px; border-top: 1px solid #e8e8ed;
          display: flex; justify-content: space-between; align-items: center;
        }
        .footer-brand { font-size: 11px; font-weight: 500; color: #1d1d1f; letter-spacing: -0.01em; }
        .footer-credit { font-size: 10px; color: #86868b; letter-spacing: -0.01em; }
        .footer-date { font-size: 10px; color: #86868b; letter-spacing: -0.01em; }
      `}</style>

      <div className="print-btn">
        <button className="btn-primary" onClick={() => window.print()}>
          Save as PDF / Print
        </button>
        <button className="btn-secondary" onClick={() => window.close()}>
          Close
        </button>
      </div>

      <div className="page">
        {/* Header */}
        <div className="header">
          <div className="course-name">{course?.name ?? "Course"}</div>
          <div className="tee-line">
            <div className="tee-dot" style={{ background: dotColor }} />
            <span className="tee-label">
              {tee?.tee_name ?? ""} Tee
              {tee?.par_total ? ` · Par ${tee.par_total}` : ""}
              {tee?.course_rating != null ? ` · CR ${tee.course_rating}` : ""}
              {tee?.slope_rating != null ? ` · SL ${tee.slope_rating}` : ""}
            </span>
          </div>
          {course?.location_text && (
            <div className="meta">{course.location_text}</div>
          )}
          <div className="meta">Official Notes &amp; Player Notes</div>
        </div>

        {/* Table */}
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
                  <td className="notes">
                    {hole.hole_note && (
                      <div className="note-block">
                        <div className="note-label">Scorecard</div>
                        <div className="note-text">{hole.hole_note}</div>
                      </div>
                    )}
                    {official?.note && (
                      <div className="note-block">
                        <div className="note-label">Official Notes</div>
                        <div className="note-text">{official.note}</div>
                      </div>
                    )}
                    {playerNotes.length > 0 && (
                      <div className="note-block">
                        <div className="note-label">Player Notes</div>
                        {playerNotes.map(n => (
                          <div key={n.id} className="player-note">
                            <span className="player-name">{n.user_name}:</span>
                            <span>{n.note}</span>
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

        {!hasAnyNote && (
          <div className="empty">No notes have been added for this tee yet.</div>
        )}

        <div className="footer">
          <div>
            <span className="footer-brand">Vibe Caddie</span>
            <span className="footer-credit"> · created by Fan &amp; Fan</span>
          </div>
          <span className="footer-date">{new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
        </div>
      </div>
    </>
  );
}

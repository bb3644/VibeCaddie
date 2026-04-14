"use client";

import { useState, useEffect } from "react";
import type { OfficialHoleNote } from "@/lib/db/types";

interface HoleRowProps {
  holeNumber: number;
  par: number;
  yardage: number;
  si: number;
  holeNote: string;
  holeId: string | null;
  courseId: string;
  officialNote: OfficialHoleNote | null;
  onChange: (data: {
    par: number;
    yardage: number;
    si: number;
    holeNote: string;
  }) => void;
  onOfficialNoteSave: (note: OfficialHoleNote | null) => void;
}

const PAR_OPTIONS = [3, 4, 5];

export function HoleRow({
  holeNumber,
  par,
  yardage,
  si,
  holeNote,
  courseId,
  officialNote,
  onChange,
  onOfficialNoteSave,
}: HoleRowProps) {
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(holeNote);
  const [showNotes, setShowNotes] = useState(false);
  const [officialDraft, setOfficialDraft] = useState(officialNote?.note ?? "");
  const [savingOfficial, setSavingOfficial] = useState(false);

  useEffect(() => {
    if (officialNote?.note) {
      setOfficialDraft(officialNote.note);
      setShowNotes(true);
    }
  }, [officialNote?.note]);

  function commitNote() {
    onChange({ par, yardage, si, holeNote: noteDraft });
    setEditingNote(false);
  }

  async function saveNote() {
    if (officialDraft === (officialNote?.note ?? "")) return;
    setSavingOfficial(true);
    try {
      const res = await fetch(
        `/api/courses/${courseId}/official-notes/${holeNumber}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: officialDraft }),
        }
      );
      if (res.status === 204) {
        onOfficialNoteSave(null);
      } else if (res.ok) {
        const saved = (await res.json()) as OfficialHoleNote;
        onOfficialNoteSave(saved);
      }
    } catch {
      // silent
    } finally {
      setSavingOfficial(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 py-3 border-b border-divider last:border-b-0">
      {/* Main row */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[0.9375rem] font-semibold text-text w-10 shrink-0">
          #{holeNumber}
        </span>

        <div className="flex items-center gap-1">
          <span className="text-[0.75rem] text-secondary mr-0.5">Par</span>
          {PAR_OPTIONS.map((p) => (
            <button
              key={p}
              onClick={() => onChange({ par: p, yardage, si, holeNote })}
              className={`
                w-9 h-9 rounded-md text-[0.875rem] font-medium transition-colors cursor-pointer
                ${par === p ? "bg-accent text-pink" : "bg-white border border-divider text-text hover:bg-gray-50"}
              `}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[0.75rem] text-secondary">Yds</span>
          <input
            type="number"
            value={yardage || ""}
            onChange={(e) => onChange({ par, yardage: parseInt(e.target.value, 10) || 0, si, holeNote })}
            placeholder="—"
            className="w-16 rounded-md border border-divider px-2 py-2 text-[0.875rem] text-text text-center placeholder:text-secondary outline-none focus:border-accent focus:ring-1 focus:ring-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[0.75rem] text-secondary">SI</span>
          <input
            type="number"
            min={1}
            max={18}
            value={si || ""}
            onChange={(e) => onChange({ par, yardage, si: parseInt(e.target.value, 10) || 0, holeNote })}
            placeholder="—"
            className="w-14 rounded-md border border-divider px-2 py-2 text-[0.875rem] text-text text-center placeholder:text-secondary outline-none focus:border-accent focus:ring-1 focus:ring-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        <button
          onClick={() => setShowNotes((prev) => !prev)}
          className="ml-auto text-[0.75rem] text-secondary hover:text-text cursor-pointer"
        >
          {showNotes ? "Hide notes ▲" : "Notes ▼"}
        </button>
      </div>

      {/* Scorecard note */}
      {holeNote && (
        <div className="ml-10">
          {editingNote ? (
            <input
              autoFocus
              type="text"
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              onBlur={commitNote}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitNote();
                if (e.key === "Escape") { setNoteDraft(holeNote); setEditingNote(false); }
              }}
              placeholder="Add a note..."
              className="w-full rounded-md border border-divider px-2.5 py-2 text-[0.8125rem] text-text placeholder:text-secondary outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          ) : (
            <span
              onClick={() => { setNoteDraft(holeNote); setEditingNote(true); }}
              className="text-[0.8125rem] text-secondary cursor-pointer hover:text-text group inline-flex items-start gap-1.5"
              title="Click to edit"
            >
              {holeNote}
              <svg className="w-3 h-3 mt-0.5 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" fill="currentColor" viewBox="0 0 18 18">
                <path d="M3 13.5V15H4.5L12.06 7.44L10.56 5.94L3 13.5ZM14.46 5.04C14.61 4.89 14.61 4.64 14.46 4.49L13.01 3.04C12.86 2.89 12.61 2.89 12.46 3.04L11.69 3.81L13.19 5.31L14.46 5.04Z" />
              </svg>
            </span>
          )}
        </div>
      )}

      {/* Notes panel */}
      {showNotes && (
        <div className="ml-10 flex flex-col gap-1 pt-1">
          <span className="text-[0.75rem] font-medium text-secondary uppercase tracking-wide">
            Notes
          </span>
          <textarea
            rows={2}
            value={officialDraft}
            onChange={(e) => setOfficialDraft(e.target.value)}
            onBlur={saveNote}
            placeholder="Add a note for this hole…"
            className="w-full rounded-md border border-divider px-2.5 py-2 text-[0.8125rem] text-text placeholder:text-secondary outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none"
          />
          {savingOfficial && (
            <span className="text-[0.75rem] text-secondary">Saving…</span>
          )}
        </div>
      )}
    </div>
  );
}

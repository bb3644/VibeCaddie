"use client";

import { useState } from "react";
import type { OfficialHoleNote, PlayerHoleNote } from "@/lib/db/types";

interface HoleRowProps {
  holeNumber: number;
  par: number;
  yardage: number;
  si: number;
  holeNote: string;
  holeId: string | null;
  courseId: string;
  officialNote: OfficialHoleNote | null;
  playerNotes: PlayerHoleNote[];
  onChange: (data: {
    par: number;
    yardage: number;
    si: number;
    holeNote: string;
  }) => void;
  onOfficialNoteSave: (note: OfficialHoleNote | null) => void;
  onPlayerNotesChange: (notes: PlayerHoleNote[]) => void;
}

const PAR_OPTIONS = [3, 4, 5];

/** 单个球洞行：Hole# → Par → Yards → SI → Note（inline 编辑） + Official/Player Notes */
export function HoleRow({
  holeNumber,
  par,
  yardage,
  si,
  holeNote,
  holeId,
  courseId,
  officialNote,
  playerNotes,
  onChange,
  onOfficialNoteSave,
  onPlayerNotesChange,
}: HoleRowProps) {
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(holeNote);

  const [showNotes, setShowNotes] = useState(!!(officialNote?.note) || playerNotes.length > 0);
  const [officialDraft, setOfficialDraft] = useState(officialNote?.note ?? "");

  const [savingOfficial, setSavingOfficial] = useState(false);
  const [playerDraft, setPlayerDraft] = useState("");
  const [savingPlayer, setSavingPlayer] = useState(false);
  const [playerNoteError, setPlayerNoteError] = useState("");
  const [playerNoteSaved, setPlayerNoteSaved] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  function commitNote() {
    onChange({ par, yardage, si, holeNote: noteDraft });
    setEditingNote(false);
  }

  async function saveOfficialNote() {
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

  async function postPlayerNote() {
    if (!holeId || !playerDraft.trim()) return;
    setSavingPlayer(true);
    setPlayerNoteError("");
    setPlayerNoteSaved(false);
    try {
      const res = await fetch(`/api/courses/holes/${holeId}/player-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: playerDraft.trim() }),
      });
      if (res.ok) {
        const saved = (await res.json()) as PlayerHoleNote;
        setPlayerDraft("");
        // Upsert: replace existing note from same user, or append
        const updated = playerNotes.some((n) => n.is_mine)
          ? playerNotes.map((n) => (n.is_mine ? saved : n))
          : [...playerNotes, saved];
        onPlayerNotesChange(updated);
        setPlayerNoteSaved(true);
        setTimeout(() => setPlayerNoteSaved(false), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        setPlayerNoteError(`Failed to save: ${(data as { error?: string }).error ?? res.status}`);
      }
    } catch {
      setPlayerNoteError("Network error. Please try again.");
    } finally {
      setSavingPlayer(false);
    }
  }

  async function saveEditedNote(noteId: string) {
    if (!holeId || !editDraft.trim()) return;
    setSavingPlayer(true);
    try {
      const res = await fetch(`/api/courses/holes/${holeId}/player-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: editDraft.trim() }),
      });
      if (res.ok) {
        const saved = (await res.json()) as PlayerHoleNote;
        onPlayerNotesChange(playerNotes.map((n) => (n.id === noteId ? saved : n)));
        setEditingNoteId(null);
      }
    } catch {
      // silent
    } finally {
      setSavingPlayer(false);
    }
  }

  async function deletePlayerNote(noteId: string) {
    if (!holeId) return;
    try {
      const res = await fetch(
        `/api/courses/holes/${holeId}/player-notes/${noteId}`,
        { method: "DELETE" }
      );
      if (res.ok || res.status === 204) {
        onPlayerNotesChange(playerNotes.filter((n) => n.id !== noteId));
      }
    } catch {
      // silent
    }
  }

  return (
    <div className="flex flex-col gap-2 py-3 border-b border-divider last:border-b-0">
      {/* 主行：Hole# | Par toggles | Yardage | SI */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* 洞号 */}
        <span className="text-[0.9375rem] font-semibold text-text w-10 shrink-0">
          #{holeNumber}
        </span>

        {/* Par 选择 */}
        <div className="flex items-center gap-1">
          <span className="text-[0.75rem] text-secondary mr-0.5">Par</span>
          {PAR_OPTIONS.map((p) => (
            <button
              key={p}
              onClick={() => onChange({ par: p, yardage, si, holeNote })}
              className={`
                w-9 h-9 rounded-md
                text-[0.875rem] font-medium transition-colors cursor-pointer
                ${
                  par === p
                    ? "bg-accent text-pink"
                    : "bg-white border border-divider text-text hover:bg-gray-50"
                }
              `}
            >
              {p}
            </button>
          ))}
        </div>

        {/* 码数输入 */}
        <div className="flex items-center gap-1">
          <span className="text-[0.75rem] text-secondary">Yds</span>
          <input
            type="number"
            value={yardage || ""}
            onChange={(e) =>
              onChange({
                par,
                yardage: parseInt(e.target.value, 10) || 0,
                si,
                holeNote,
              })
            }
            placeholder="—"
            className="w-16 rounded-md border border-divider px-2 py-2 text-[0.875rem] text-text text-center placeholder:text-secondary outline-none focus:border-accent focus:ring-1 focus:ring-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        {/* Stroke Index 输入 */}
        <div className="flex items-center gap-1">
          <span className="text-[0.75rem] text-secondary">SI</span>
          <input
            type="number"
            min={1}
            max={18}
            value={si || ""}
            onChange={(e) =>
              onChange({
                par,
                yardage,
                si: parseInt(e.target.value, 10) || 0,
                holeNote,
              })
            }
            placeholder="—"
            className="w-14 rounded-md border border-divider px-2 py-2 text-[0.875rem] text-text text-center placeholder:text-secondary outline-none focus:border-accent focus:ring-1 focus:ring-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        {/* Notes toggle */}
        <button
          onClick={() => setShowNotes((prev) => !prev)}
          className="ml-auto text-[0.75rem] text-secondary hover:text-text cursor-pointer"
        >
          {showNotes ? "Hide notes ▲" : `Notes${playerNotes.length > 0 ? ` (${playerNotes.length})` : ""} ▼`}
        </button>
      </div>

      {/* 洞注释 — 有内容时显示，点击内联编辑 */}
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
                if (e.key === "Escape") {
                  setNoteDraft(holeNote);
                  setEditingNote(false);
                }
              }}
              placeholder="Add a note..."
              className="w-full rounded-md border border-divider px-2.5 py-2 text-[0.8125rem] text-text placeholder:text-secondary outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          ) : (
            <span
              onClick={() => {
                setNoteDraft(holeNote);
                setEditingNote(true);
              }}
              className="text-[0.8125rem] text-secondary cursor-pointer hover:text-text group inline-flex items-start gap-1.5"
              title="Click to edit"
            >
              {holeNote}
              <svg
                className="w-3 h-3 mt-0.5 opacity-0 group-hover:opacity-60 transition-opacity shrink-0"
                fill="currentColor"
                viewBox="0 0 18 18"
              >
                <path d="M3 13.5V15H4.5L12.06 7.44L10.56 5.94L3 13.5ZM14.46 5.04C14.61 4.89 14.61 4.64 14.46 4.49L13.01 3.04C12.86 2.89 12.61 2.89 12.46 3.04L11.69 3.81L13.19 5.31L14.46 5.04Z" />
              </svg>
            </span>
          )}
        </div>
      )}

      {/* Official + Player Notes panel */}
      {showNotes && (
        <div className="ml-10 flex flex-col gap-3 pt-1">
          {/* Official note */}
          <div className="flex flex-col gap-1">
            <span className="text-[0.75rem] font-medium text-secondary uppercase tracking-wide">
              Official Notes
            </span>
            <textarea
              rows={2}
              value={officialDraft}
              onChange={(e) => setOfficialDraft(e.target.value)}
              onBlur={saveOfficialNote}
              placeholder="Add an official course note for this hole…"
              className="w-full rounded-md border border-divider px-2.5 py-2 text-[0.8125rem] text-text placeholder:text-secondary outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none"
            />
            {savingOfficial && (
              <span className="text-[0.75rem] text-secondary">Saving…</span>
            )}
          </div>

          {/* Player notes */}
          <div className="flex flex-col gap-1">
            <span className="text-[0.75rem] font-medium text-secondary uppercase tracking-wide">
              Player notes
            </span>
            {playerNotes.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {playerNotes.map((n) =>
                  editingNoteId === n.id ? (
                    <div key={n.id} className="flex gap-2">
                      <input
                        autoFocus
                        type="text"
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEditedNote(n.id);
                          if (e.key === "Escape") setEditingNoteId(null);
                        }}
                        className="flex-1 rounded-md border border-divider px-2.5 py-1.5 text-[0.8125rem] outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                      />
                      <button
                        onClick={() => saveEditedNote(n.id)}
                        disabled={savingPlayer}
                        className="text-[0.8125rem] text-accent font-medium cursor-pointer"
                      >
                        {savingPlayer ? "…" : "Save"}
                      </button>
                    </div>
                  ) : (
                    <div key={n.id} className="flex items-start gap-2 group">
                      <div className="flex-1">
                        <span className="text-[0.75rem] font-medium text-secondary">
                          {n.user_name}:{" "}
                        </span>
                        <span className="text-[0.8125rem] text-text">{n.note}</span>
                      </div>
                      {n.is_mine && (
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditingNoteId(n.id);
                              setEditDraft(n.note);
                            }}
                            className="text-[0.75rem] text-secondary hover:text-text cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deletePlayerNote(n.id)}
                            className="text-[0.75rem] text-red-400 hover:text-red-600 cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
            {!holeId ? (
              <span className="text-[0.75rem] text-secondary/60 italic">
                Save holes first to add player notes.
              </span>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={playerDraft}
                    onChange={(e) => setPlayerDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") postPlayerNote();
                    }}
                    placeholder="Add your note…"
                    className="flex-1 rounded-md border border-divider px-2.5 py-1.5 text-[0.8125rem] text-text placeholder:text-secondary outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                  <button
                    onClick={postPlayerNote}
                    disabled={savingPlayer || !playerDraft.trim()}
                    className="text-[0.8125rem] text-accent font-medium disabled:opacity-40 cursor-pointer"
                  >
                    {savingPlayer ? "Saving…" : "Post note"}
                  </button>
                </div>
                {playerNoteError && (
                  <span className="text-[0.75rem] text-red-500">{playerNoteError}</span>
                )}
                {playerNoteSaved && (
                  <span className="text-[0.75rem] text-accent">Saved ✓</span>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

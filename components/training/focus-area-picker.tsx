"use client";

export const FOCUS_AREAS = [
  "Driving",
  "Fairway woods",
  "Long irons",
  "Mid irons",
  "Short irons",
  "Chipping",
  "Pitching",
  "Bunker shots",
  "Putting",
  "Short game",
  "Course management",
  "Mental game",
  "Full swing",
  "Other",
];

export function FocusAreaPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (areas: string[]) => void;
}) {
  function toggle(area: string) {
    onChange(
      selected.includes(area)
        ? selected.filter((a) => a !== area)
        : [...selected, area]
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {FOCUS_AREAS.map((area) => {
        const active = selected.includes(area);
        return (
          <button
            key={area}
            type="button"
            onClick={() => toggle(area)}
            className={`px-3 py-1.5 rounded-full text-[0.8125rem] font-medium border transition-colors cursor-pointer ${
              active
                ? "bg-accent text-white border-accent"
                : "bg-white text-secondary border-divider hover:border-accent/50 hover:text-text"
            }`}
          >
            {area}
          </button>
        );
      })}
    </div>
  );
}

"use client";

interface LogoProps {
  className?: string;
}

/** Vibe Caddie inline SVG logo — scales with container width */
export function Logo({ className = "" }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 260 80"
      className={className}
      role="img"
      aria-label="Vibe Caddie"
    >
      {/* "Vibe Caddie" — bold serif, large */}
      <text
        x="130"
        y="46"
        fontFamily="var(--font-inter), 'Inter', ui-sans-serif, system-ui, sans-serif"
        fontSize="38"
        fontWeight="700"
        fill="#007749"
        letterSpacing="-1.5"
        textAnchor="middle"
      >
        Vibe Caddie
      </text>

      {/* Pink accent line */}
      <line x1="20" y1="56" x2="240" y2="56" stroke="#F4B8B0" strokeWidth="1.2" />

      {/* "GOLF CURATION" */}
      <text
        x="130"
        y="70"
        fontFamily="var(--font-inter), 'Inter', ui-sans-serif, system-ui, sans-serif"
        fontSize="8"
        fontWeight="500"
        fill="#F4B8B0"
        letterSpacing="4"
        textAnchor="middle"
      >
        GOLF CURATION
      </text>
    </svg>
  );
}

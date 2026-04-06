"use client";

interface LogoProps {
  className?: string;
}

/** Vibe Caddie inline SVG logo — scales with container width */
export function Logo({ className = "" }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 260 64"
      className={className}
      role="img"
      aria-label="Vibe Caddie"
    >
      {/* "Vibe Caddie" */}
      <text
        x="130"
        y="38"
        fontFamily="var(--font-cormorant), 'Palatino Linotype', Palatino, Georgia, serif"
        fontSize="36"
        fontWeight="600"
        fill="#235D3E"
        letterSpacing="-0.5"
        textAnchor="middle"
      >
        Vibe Caddie
      </text>

      {/* Rose-gold divider line */}
      <line x1="30" y1="46" x2="230" y2="46" stroke="#C49A8A" strokeWidth="0.8" />

      {/* "GOLF CURATION" */}
      <text
        x="130"
        y="58"
        fontFamily="var(--font-inter), 'Helvetica Neue', Arial, sans-serif"
        fontSize="8.5"
        fontWeight="400"
        fill="#C49A8A"
        letterSpacing="3"
        textAnchor="middle"
      >
        GOLF CURATION
      </text>
    </svg>
  );
}

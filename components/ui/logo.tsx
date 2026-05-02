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
        fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', ui-sans-serif, system-ui, sans-serif"
        fontSize="38"
        fontWeight="700"
        fill="#1D1D1F"
        letterSpacing="-1.5"
        textAnchor="middle"
      >
        Vibe Caddie
      </text>

      {/* Subtle divider line */}
      <line x1="20" y1="56" x2="240" y2="56" stroke="#D2D2D7" strokeWidth="1" />

      {/* "GOLF CURATION" */}
      <text
        x="130"
        y="70"
        fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', ui-sans-serif, system-ui, sans-serif"
        fontSize="8"
        fontWeight="500"
        fill="#6E6E73"
        letterSpacing="4"
        textAnchor="middle"
      >
        GOLF CURATION
      </text>
    </svg>
  );
}

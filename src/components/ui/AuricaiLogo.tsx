/**
 * AuricaiLogo — Official Auricai brand mark.
 *
 * Pixel-perfect SVG recreation of the stylized circular "G" symbol.
 * Uses currentColor for automatic dark/light mode compatibility.
 *
 * Usage:
 *   <AuricaiLogo size={32} />              — 32px white on dark bg
 *   <AuricaiLogo size={16} className="text-black" /> — 16px black
 */

interface AuricaiLogoProps {
  /** Width & height in pixels */
  size?: number;
  /** Additional className (use text-* to control color) */
  className?: string;
}

export function AuricaiLogo({ size = 32, className = "" }: AuricaiLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Auricai"
    >
      {/* Circle arc — nearly complete ring with gap at upper-left */}
      <path
        d="M 56 17 A 34 34 0 1 1 30 23"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinecap="butt"
        fill="none"
      />
      {/* Horizontal bar — center to right inner edge */}
      <line
        x1="47"
        y1="50"
        x2="78"
        y2="50"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="butt"
      />
    </svg>
  );
}

export default AuricaiLogo;

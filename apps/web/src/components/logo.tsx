/**
 * The mark. A hippo shows you its eyes and keeps the rest below the waterline,
 * which is also what the memory does: held somewhere else, surfaced on ask.
 *
 * Drawn in `currentColor` so it inherits the theme rather than needing a second
 * asset for dark mode. Five candidates are in `docs/brand/`; swapping is a
 * matter of replacing the paths here and in `public/favicon.svg`.
 */
export function Logo({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role="img"
      aria-label="hippo"
    >
      <path d="M6 9.5a2 2 0 1 1 1.6-3.2" />
      <path d="M18 9.5a2 2 0 1 0-1.6-3.2" />
      <path d="M4.5 14c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6" />
      <circle cx="9.3" cy="11.6" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="14.7" cy="11.6" r="0.9" fill="currentColor" stroke="none" />
      <path d="M2 14h20" />
      <path d="M5 17.5h3M10.5 17.5h3M16 17.5h3" opacity="0.45" />
    </svg>
  );
}

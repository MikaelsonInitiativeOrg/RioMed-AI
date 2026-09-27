/** The RioMed mark (riomed-mark.svg): deep-green tile, pulse line, mint dot. */
export function RioMedLogo({ size = 32, title }: { size?: number; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title} className="shrink-0">
      <rect width="48" height="48" rx="14" fill="#0A5347" />
      <path d="M9 25h6l3-9 5 17 4-14 3 6h9" stroke="#F3FAF8" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="37" cy="25" r="3.4" fill="#8FE0CE" />
    </svg>
  );
}

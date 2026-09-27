export function RioMedLogo({
  size = 32,
  inverted = false,
}: {
  size?: number;
  inverted?: boolean;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
      <rect width="48" height="48" rx="14" fill={inverted ? "#155E75" : "#0E7490"} />
      <path
        d="M9 25h6l3-9 5 17 4-14 3 6h9"
        stroke="#FFFFFF"
        strokeWidth="2.6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="37" cy="25" r="3.4" fill="#6EE7B7" />
    </svg>
  );
}

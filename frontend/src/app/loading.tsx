export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      {/* Header status */}
      <div className="flex items-center gap-2 text-sm font-medium text-primary animate-pulse">
        <svg className="h-4 w-4 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span>Matching registry facilities &amp; checking live slots…</span>
      </div>

      {/* Filter skeleton */}
      <div className="h-20 w-full rounded-2xl bg-surface/80 border border-border-strong p-4 shadow-xs animate-pulse">
        <div className="h-3 w-1/3 bg-slate-200 rounded mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="h-8 bg-border-soft rounded-lg" />
          <div className="h-8 bg-border-soft rounded-lg" />
          <div className="h-8 bg-border-soft rounded-lg" />
          <div className="h-8 bg-border-soft rounded-lg" />
        </div>
      </div>

      {/* Facility card skeletons */}
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-border-strong bg-surface p-4 sm:p-5 shadow-xs animate-pulse space-y-3"
          >
            <div className="flex justify-between items-start gap-2">
              <div className="space-y-2 flex-1">
                <div className="h-5 w-2/3 bg-slate-200 rounded" />
                <div className="h-3 w-1/2 bg-border-soft rounded" />
              </div>
              <div className="h-6 w-20 bg-primary-soft/60 rounded-full" />
            </div>
            <div className="h-3 w-3/4 bg-border-soft rounded" />
            <div className="pt-3 border-t border-border flex justify-between items-center">
              <div className="h-4 w-1/3 bg-slate-200 rounded" />
              <div className="h-9 w-24 bg-cyan-200 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

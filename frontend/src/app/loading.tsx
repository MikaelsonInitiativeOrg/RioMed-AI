export default function Loading() {
  return (
    <div className="animate-pulse space-y-3" aria-busy="true" aria-live="polite">
      <p className="text-sm text-slate-600">Finding facilities…</p>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 rounded-xl bg-white border border-emerald-900/10" />
      ))}
    </div>
  );
}

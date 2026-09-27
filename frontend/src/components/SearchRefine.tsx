import { TEST_CATALOG } from "@riomed/backend/core/catalog";
import { PLACES } from "@riomed/backend/core/geo";

/** FR-015 + FR-025: what we understood, editable; also the structured search form. */
export function SearchRefine(props: { test?: string; area?: string | null; day?: string | null; part?: string | null; title?: string }) {
  const days = ["today", "tomorrow", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const sel = "w-full rounded-lg border border-emerald-900/20 bg-white px-2 py-2 text-sm";
  return (
    <form action="/" method="get" className="rounded-xl border border-emerald-900/10 bg-white p-3">
      <p className="text-xs font-medium text-slate-600 mb-2">{props.title ?? "What we understood (tap to change)"}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <label className="text-xs">
          Test
          <select name="test" defaultValue={props.test ?? ""} className={sel}>
            <option value="">Any test</option>
            {TEST_CATALOG.map((t) => (
              <option key={t.code} value={t.code}>{t.name}</option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          Area
          <select name="area" defaultValue={props.area ?? ""} className={sel} required>
            <option value="" disabled>Choose area</option>
            {PLACES.map((p) => (
              <option key={p.name} value={p.name}>{p.name}</option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          Day
          <select name="day" defaultValue={props.day ?? ""} className={sel}>
            <option value="">Any day</option>
            {days.map((d) => (
              <option key={d} value={d}>{d[0].toUpperCase() + d.slice(1)}</option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          Time
          <select name="part" defaultValue={props.part ?? ""} className={sel}>
            <option value="">Any time</option>
            <option value="morning">Morning (7–12)</option>
            <option value="afternoon">Afternoon (12–5)</option>
            <option value="evening">Evening (5–9)</option>
          </select>
        </label>
      </div>
      <button className="mt-3 w-full sm:w-auto rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800">Update results</button>
    </form>
  );
}

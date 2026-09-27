import { TEST_CATALOG, getTest } from "@riomed/backend/core/catalog";
import { PLACES } from "@riomed/backend/core/geo";
import { CalendarDays, FlaskConical, MapPin, Search, SlidersHorizontal } from "lucide-react";

interface SearchRefineProps {
  test?: string;
  area?: string | null;
  day?: string | null;
  part?: string | null;
  title?: string;
  /** Results page: show what was understood as a summary, with the form behind "Edit". */
  compact?: boolean;
}

const DAYS = ["today", "tomorrow", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const field =
  "w-full min-h-[44px] rounded-lg border border-border-strong bg-surface px-3 py-2 text-base sm:text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
const label = "mb-1 block text-sm font-bold text-foreground";

/** FR-015 + FR-025: what we understood, editable; also the structured search form. */
export function SearchRefine({ test, area, day, part, title, compact }: SearchRefineProps) {
  const testName = test ? (getTest(test)?.name ?? test) : null;
  const shownArea = area && area !== "your location" ? area : area === "your location" ? "Your location" : null;
  const timeDesc = day ? (part && part !== "any" ? `${cap(day)}, ${part}` : cap(day)) : part && part !== "any" ? cap(part) : null;

  const form = (
    <form action="/" method="get" aria-label="Search by test, area and time">
      {title && <p className="mb-3 text-sm font-bold text-foreground">{title}</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="refine-test" className={label}>Test</label>
          <select id="refine-test" name="test" defaultValue={test ?? ""} className={field}>
            <option value="">Any test</option>
            {TEST_CATALOG.map((t) => (
              <option key={t.code} value={t.code}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="refine-area" className={label}>
            Area or city <span className="text-danger" aria-hidden>*</span>
          </label>
          {/* Any place worldwide (geocoded on the server); known Lagos areas are suggested */}
          <input
            id="refine-area"
            name="area"
            list="refine-area-suggestions"
            defaultValue={area && area !== "your location" ? area : ""}
            placeholder="e.g. Ikeja, Wuse 2 Abuja, Accra"
            maxLength={100}
            autoComplete="address-level2"
            className={field}
            required
          />
          <datalist id="refine-area-suggestions">
            {PLACES.map((p) => (
              <option key={p.name} value={p.name} />
            ))}
          </datalist>
        </div>
        <div>
          <label htmlFor="refine-day" className={label}>Day</label>
          <select id="refine-day" name="day" defaultValue={day ?? ""} className={field}>
            <option value="">Any day</option>
            {DAYS.map((d) => (
              <option key={d} value={d}>{cap(d)}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="refine-part" className={label}>Time</label>
          <select id="refine-part" name="part" defaultValue={part ?? ""} className={field}>
            <option value="">Any time</option>
            <option value="morning">Morning (7:00–12:00)</option>
            <option value="afternoon">Afternoon (12:00–17:00)</option>
            <option value="evening">Evening (17:00–21:00)</option>
          </select>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-white shadow-sm transition-colors duration-150 hover:bg-primary-strong sm:w-auto"
        >
          <Search className="h-4 w-4" aria-hidden />
          {compact ? "Update results" : "Search"}
        </button>
      </div>
    </form>
  );

  if (!compact) return form;

  return (
    <details className="group rounded-xl border border-border bg-surface shadow-sm">
      <summary className="flex min-h-[52px] list-none items-center gap-2 px-4 py-2 [&::-webkit-details-marker]:hidden">
        <span className="sr-only">Understood as:</span>
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground">
          <Chip icon={<FlaskConical className="h-4 w-4" aria-hidden />} text={testName ?? "Any test"} />
          <Chip icon={<MapPin className="h-4 w-4" aria-hidden />} text={shownArea ?? "No area yet"} />
          <Chip icon={<CalendarDays className="h-4 w-4" aria-hidden />} text={timeDesc ?? "Any time"} />
        </span>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border-strong px-3 py-1.5 text-sm font-bold text-primary group-open:bg-primary-soft">
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          Edit
        </span>
      </summary>
      <div className="border-t border-border-soft p-4">{form}</div>
    </details>
  );
}

function Chip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-primary">{icon}</span>
      <span className="font-bold">{text}</span>
    </span>
  );
}

function cap(s: string) {
  return s[0].toUpperCase() + s.slice(1);
}

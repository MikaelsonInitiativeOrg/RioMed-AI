import { TEST_CATALOG, getTest } from "@riomed/backend/core/catalog";
import { PLACES } from "@riomed/backend/core/geo";
import { Search } from "lucide-react";
import { BorderBeam } from "@/components/ui/border-beam-search";

interface SearchRefineProps {
  test?: string;
  area?: string | null;
  day?: string | null;
  part?: string | null;
  title?: string;
}

/** FR-015 + FR-025: what we understood, editable; also the structured search form. */
export function SearchRefine({ test, area, day, part, title }: SearchRefineProps) {
  const days = ["today", "tomorrow", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  const selectClasses =
    "w-full min-h-[44px] rounded-xl border border-[#E3E0D6] bg-white px-3 py-2 text-sm text-[#12262B] shadow-2xs focus:border-[#0E6B5C] focus:outline-none focus:ring-2 focus:ring-[#0E6B5C]/20";

  const testName = test ? getTest(test)?.name ?? test : null;
  const timeDesc = day ? (part && part !== "any" ? `${day}, ${part}` : day) : part && part !== "any" ? part : null;

  return (
    <form
      action="/"
      method="get"
      className="rounded-2xl border border-[#E3E0D6] bg-white p-4 sm:p-5 shadow-xs"
      aria-label="Filter or refine search criteria"
    >
      {/* Design System "Understood as" editable chip preview */}
      {(testName || area || timeDesc) && (
        <div className="mb-4 pb-3 border-b border-[#F0EEE7]">
          <p className="text-xs font-bold uppercase tracking-wider text-[#4B6560] mb-2">
            Understood as (tap fields below to adjust)
          </p>
          <div className="flex flex-wrap gap-2">
            {testName && (
              <span className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[#0E6B5C] bg-white px-3 py-1 text-xs font-semibold text-[#0A5347] shadow-2xs">
                {testName}
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#F3FAF8] text-[9px]">
                  ✎
                </span>
              </span>
            )}
            {area && (
              <span className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[#0E6B5C] bg-white px-3 py-1 text-xs font-semibold text-[#0A5347] shadow-2xs">
                {area}
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#F3FAF8] text-[9px]">
                  ✎
                </span>
              </span>
            )}
            {timeDesc && (
              <span className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[#0E6B5C] bg-white px-3 py-1 text-xs font-semibold text-[#0A5347] shadow-2xs">
                {timeDesc}
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#F3FAF8] text-[9px]">
                  ✎
                </span>
              </span>
            )}
          </div>
        </div>
      )}

      {title && (
        <p className="text-xs font-bold uppercase tracking-wider text-[#0A5347] mb-3">
          {title}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="refine-test" className="mb-1 block text-xs font-semibold text-[#4B6560]">
            Medical test
          </label>
          <select
            id="refine-test"
            name="test"
            defaultValue={test ?? ""}
            className={selectClasses}
          >
            <option value="">Any test</option>
            {TEST_CATALOG.map((t) => (
              <option key={t.code} value={t.code}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="refine-area" className="mb-1 block text-xs font-semibold text-[#4B6560]">
            Area in Lagos <span className="text-[#0E6B5C] font-bold">*</span>
          </label>
          <select
            id="refine-area"
            name="area"
            defaultValue={area ?? ""}
            className={selectClasses}
            required
          >
            <option value="" disabled>
              Select area
            </option>
            {PLACES.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="refine-day" className="mb-1 block text-xs font-semibold text-[#4B6560]">
            Day
          </label>
          <select
            id="refine-day"
            name="day"
            defaultValue={day ?? ""}
            className={selectClasses}
          >
            <option value="">Any day</option>
            {days.map((d) => (
              <option key={d} value={d}>
                {d[0].toUpperCase() + d.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="refine-part" className="mb-1 block text-xs font-semibold text-[#4B6560]">
            Time window
          </label>
          <select
            id="refine-part"
            name="part"
            defaultValue={part ?? ""}
            className={selectClasses}
          >
            <option value="">Any time</option>
            <option value="morning">Morning (7:00 – 12:00)</option>
            <option value="afternoon">Afternoon (12:00 – 17:00)</option>
            <option value="evening">Evening (17:00 – 21:00)</option>
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
        <BorderBeam
          size="line"
          colorVariant="colorful"
          duration={3.1}
          borderRadius={14}
          theme="dark"
          className="inline-flex self-end rounded-xl overflow-hidden"
        >
          <button
            type="submit"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#0E6B5C] px-5 py-2.5 text-xs sm:text-sm font-heading font-bold text-white shadow-xs hover:bg-[#0A5347] active:scale-[0.98] transition cursor-pointer"
          >
            <Search className="w-4 h-4 shrink-0" strokeWidth={2.4} aria-hidden="true" />
            Update results
          </button>
        </BorderBeam>
      </div>
    </form>
  );
}

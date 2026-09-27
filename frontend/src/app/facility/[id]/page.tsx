import Link from "next/link";
import { notFound } from "next/navigation";
import { getTest } from "@riomed/backend/core/catalog";
import { formatNaira } from "@riomed/backend/core/money";
import { holdAction } from "@/app/actions";
import { FACILITY_TYPE_LABEL, lagosDay, lagosDayKey, lagosTimeOnly } from "@/lib/format";
import { getFacilityBooking } from "@riomed/backend/server/queries";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function FacilityPage(props: PageProps<"/facility/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const data = await getFacilityBooking(id);
  if (!data) notFound();
  const { facility, tests, slots: bookable } = data;

  const testCode = one(sp.test) || tests[0]?.testCode || "";
  const offer = tests.find((t) => t.testCode === testCode);
  const from = one(sp.from) ? new Date(one(sp.from)!) : null;
  const to = one(sp.to) ? new Date(one(sp.to)!) : null;
  const error = one(sp.error);

  const inWindow = (s: { start: Date; end: Date }) => !from || !to || (s.start < to && s.end > from);
  const byDay = new Map<string, typeof bookable>();
  for (const s of bookable) {
    const k = lagosDayKey(s.start);
    byDay.set(k, [...(byDay.get(k) ?? []), s]);
  }
  const back = `/facility/${id}?test=${encodeURIComponent(testCode)}${from && to ? `&from=${from.toISOString()}&to=${to.toISOString()}` : ""}`;

  return (
    <div className="space-y-5">
      {/* Back button */}
      <div>
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-[#0E6B5C] hover:text-[#0A5347] transition"
        >
          ← Back to search
        </Link>
      </div>

      {/* Facility Header Card */}
      <section className="rounded-2xl border border-[#E3E0D6] bg-white p-4 sm:p-6 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-xl sm:text-2xl font-bold text-[#0A5347]">
                {facility.name}
              </h1>
              {facility.isPartner ? (
                <span className="inline-flex items-center rounded-full bg-[#0E6B5C] px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                  PARTNER
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-[#E3E0D6] bg-[#F7F5F0] px-2.5 py-0.5 text-[10px] font-semibold text-[#4B6560]">
                  Listed only
                </span>
              )}
            </div>

            <p className="mt-1 text-xs sm:text-sm text-[#4B6560]">
              {facility.address} · {FACILITY_TYPE_LABEL[facility.type] ?? facility.type} · {facility.ownership === "public" ? "Public" : "Private"}
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-[#F0EEE7] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full border border-[#0E6B5C] bg-[#F3FAF8] px-2.5 py-0.5 text-[11px] font-semibold text-[#0A5347]">
              ✓ Registry verified
            </span>
            <span className="text-[11px] text-[#8B9490]">
              NHFR record {facility.nhfrId ?? "none"} · <span className="font-medium text-[#4B6560]">demo data</span> · synced{" "}
              {facility.sourceSyncedAt.toISOString().slice(0, 10)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {facility.phone && (
              <a
                href={`tel:${facility.phone.replace(/\s/g, "")}`}
                className="inline-flex min-h-[38px] items-center rounded-xl border border-[#0E6B5C] px-3.5 py-1 text-xs font-bold text-[#0E6B5C] hover:bg-[#F3FAF8] transition"
              >
                Call {facility.phone}
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Non-partner info */}
      {!facility.isPartner ? (
        <div className="rounded-2xl border border-[#E3E0D6] bg-white p-5 text-sm text-[#4B6560] space-y-3">
          <p className="font-bold text-[#12262B]">Online booking not available</p>
          <p>
            This facility is listed in the registry but doesn&apos;t take bookings through RioMed yet.{" "}
            {facility.phone && <>Call {facility.phone}.</>}
          </p>
          <div className="pt-1">
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#0E6B5C] px-5 py-2.5 text-xs sm:text-sm font-heading font-bold text-white hover:bg-[#0A5347]"
            >
              Find bookable facilities
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Test selection form */}
          <section className="rounded-2xl border border-[#E3E0D6] bg-white p-4 sm:p-5 shadow-xs space-y-3">
            <form method="get" className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
              <div className="flex-1">
                <label htmlFor="facility-test-select" className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#4B6560]">
                  Select medical test
                </label>
                <select
                  id="facility-test-select"
                  name="test"
                  defaultValue={testCode}
                  className="w-full min-h-[44px] rounded-xl border border-[#E3E0D6] bg-white px-3 py-2 text-sm text-[#12262B] shadow-2xs focus:border-[#0E6B5C] focus:outline-none focus:ring-2 focus:ring-[#0E6B5C]/20"
                >
                  {tests.map((t) => (
                    <option key={t.testCode} value={t.testCode}>
                      {getTest(t.testCode)?.name ?? t.testCode}: {formatNaira(t.priceKobo)}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#0E6B5C] bg-white px-4 py-2 text-xs sm:text-sm font-heading font-bold text-[#0E6B5C] hover:bg-[#F3FAF8] active:scale-[0.98] transition shrink-0"
              >
                Change
              </button>
            </form>

            {/* Offer details & reassurance */}
            {offer ? (
              <div className="rounded-xl bg-[#F3FAF8] border border-[#CDE8E1] p-3.5 text-sm text-[#12262B] space-y-1">
                <div className="flex flex-wrap items-baseline justify-between gap-1">
                  <span className="font-bold text-[#0A5347] text-base">
                    {getTest(offer.testCode)?.name}
                  </span>
                  <span className="text-base font-extrabold text-[#0A5347]">
                    {formatNaira(offer.priceKobo)}
                  </span>
                </div>
                <p className="text-xs text-[#4B6560]">
                  Result in about {offer.turnaroundHours} h. You&apos;ll have 15 minutes to pay after choosing a time.
                </p>
              </div>
            ) : (
              <p className="text-sm font-semibold text-[#C98A1D]">
                This facility doesn&apos;t offer that test. Choose another above.
              </p>
            )}
          </section>

          {/* Booking Error Banner */}
          {error && (
            <div role="alert" className="rounded-2xl border border-[#FBE9E7] bg-[#FBE9E7] p-4 text-sm text-[#8A251C]">
              <p className="font-semibold">{error}</p>
            </div>
          )}

          {/* Slot Picker by Day */}
          {offer && (
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <h2 className="font-heading text-base sm:text-lg font-bold text-[#0A5347]">
                  Available slots
                </h2>
                {from && to && (
                  <span className="text-xs font-semibold text-[#0A5347] bg-[#F3FAF8] px-2.5 py-0.5 rounded-full border border-[#0E6B5C]/30">
                    Highlighted times match your request
                  </span>
                )}
              </div>

              {byDay.size === 0 ? (
                <EmptyState
                  title="No free times in the next 7 days"
                  description="All appointment slots for this test are currently filled. Try selecting another test or check other nearby labs."
                  actionHref="/"
                  actionLabel="Search other facilities"
                />
              ) : (
                <div className="space-y-4">
                  {[...byDay.entries()].map(([day, list]) => (
                    <div
                      key={day}
                      className="rounded-2xl border border-[#E3E0D6] bg-white p-4 shadow-xs space-y-3"
                    >
                      <h3 className="font-heading text-sm font-bold text-[#12262B]">
                        {lagosDay(list[0].start)}
                      </h3>

                      <div className="flex flex-wrap gap-2">
                        {list.map((s) => {
                          const full = s.remaining === 0;
                          const matchesQuery = inWindow(s);

                          return (
                            <form key={s.id} action={holdAction}>
                              <input type="hidden" name="slotId" value={s.id} />
                              <input type="hidden" name="testCode" value={testCode} />
                              <input type="hidden" name="back" value={back} />
                              <button
                                type="submit"
                                disabled={full}
                                className={`min-h-[44px] min-w-[76px] rounded-xl px-3.5 py-2 text-xs sm:text-sm font-heading font-semibold transition border ${
                                  full
                                    ? "bg-[#F0EEE7] text-[#B7BDB8] border-[#E3E0D6] line-through cursor-not-allowed"
                                    : matchesQuery
                                      ? "bg-[#0E6B5C] text-white border-[#0E6B5C] shadow-xs hover:bg-[#0A5347] active:scale-[0.98]"
                                      : "bg-[#F7F5F0] text-[#4B6560] border-[#E3E0D6] hover:bg-[#F3FAF8] hover:text-[#0A5347] hover:border-[#0E6B5C] active:scale-[0.98]"
                                }`}
                                aria-label={`${lagosTimeOnly(s.start)}${full ? ", full" : `, ${s.remaining} left`}`}
                              >
                                {lagosTimeOnly(s.start)}
                              </button>
                            </form>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

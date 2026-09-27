import Link from "next/link";
import { notFound } from "next/navigation";
import { getTest } from "@riomed/backend/core/catalog";
import { formatNaira } from "@riomed/backend/core/money";
import { holdAction } from "@/app/actions";
import { FACILITY_TYPE_LABEL, lagosDay, lagosDayKey, lagosTimeOnly } from "@/lib/format";
import { getFacilityBooking } from "@riomed/backend/server/queries";

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
      <Link href="/" className="text-sm text-emerald-800 hover:underline">← Back to search</Link>
      <section className="rounded-xl bg-white border border-emerald-900/10 p-4">
        <h1 className="text-xl font-bold text-emerald-950">{facility.name}</h1>
        <p className="text-sm text-slate-600">{FACILITY_TYPE_LABEL[facility.type]} · {facility.ownership} · {facility.address}</p>
        <p className="text-xs text-slate-500 mt-1">Registry record {facility.nhfrId} · demo data · synced {facility.sourceSyncedAt.toISOString().slice(0, 10)}</p>
      </section>

      {!facility.isPartner ? (
        <p className="rounded-lg bg-white border p-3 text-sm">This facility is listed in the registry but doesn&apos;t take bookings through RioMed yet. {facility.phone && <>Call {facility.phone}.</>}</p>
      ) : (
        <>
          <form method="get" className="flex flex-wrap items-end gap-2">
            <label className="text-sm">
              Test
              <select name="test" defaultValue={testCode} className="block rounded-lg border border-emerald-900/20 bg-white px-2 py-2 text-sm">
                {tests.map((t) => (
                  <option key={t.testCode} value={t.testCode}>
                    {getTest(t.testCode)?.name ?? t.testCode}: {formatNaira(t.priceKobo)}
                  </option>
                ))}
              </select>
            </label>
            <button className="rounded-lg border border-emerald-900/20 bg-white px-3 py-2 text-sm">Change</button>
          </form>

          {offer ? (
            <p className="text-sm">
              <strong>{getTest(offer.testCode)?.name}</strong>: {formatNaira(offer.priceKobo)} · result in about {offer.turnaroundHours} h.
              You&apos;ll have 15 minutes to pay after choosing a time.
            </p>
          ) : (
            <p className="text-sm text-amber-800">This facility doesn&apos;t offer that test. Choose another above.</p>
          )}
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

          {offer &&
            [...byDay.entries()].map(([day, list]) => (
              <section key={day}>
                <h2 className="text-sm font-semibold text-slate-700 mb-2">{lagosDay(list[0].start)}</h2>
                <div className="flex flex-wrap gap-2">
                  {list.map((s) => {
                    const full = s.remaining === 0;
                    return (
                      <form key={s.id} action={holdAction}>
                        <input type="hidden" name="slotId" value={s.id} />
                        <input type="hidden" name="testCode" value={testCode} />
                        <input type="hidden" name="back" value={back} />
                        <button
                          disabled={full}
                          className={`rounded-lg px-3 py-2 text-sm border ${
                            full
                              ? "bg-slate-100 text-slate-400 border-slate-200 line-through"
                              : inWindow(s)
                                ? "bg-emerald-700 text-white border-emerald-700 hover:bg-emerald-800"
                                : "bg-white text-emerald-900 border-emerald-900/20 hover:bg-emerald-50"
                          }`}
                          aria-label={`${lagosTimeOnly(s.start)}${full ? ", full" : `, ${s.remaining} left`}`}
                        >
                          {lagosTimeOnly(s.start)}
                        </button>
                      </form>
                    );
                  })}
                </div>
              </section>
            ))}
          {offer && byDay.size === 0 && <p className="text-sm">No free times in the next 7 days.</p>}
          {from && to && <p className="text-xs text-slate-500">Highlighted times match the time you asked for.</p>}
        </>
      )}
    </div>
  );
}

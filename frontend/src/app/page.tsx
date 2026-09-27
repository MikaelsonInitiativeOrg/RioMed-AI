import Link from "next/link";
import { getTest, isKnownTestCode } from "@riomed/backend/core/catalog";
import { DAY_PARTS, type DayPart, type SearchIntent } from "@riomed/backend/core/intent";
import { formatNaira } from "@riomed/backend/core/money";
import { EmergencyBanner } from "@/components/EmergencyBanner";
import { SearchRefine } from "@/components/SearchRefine";
import { FACILITY_TYPE_LABEL, lagosDateTime } from "@/lib/format";
import { runPromptSearch, searchWithIntent, type Found, type SearchView } from "@riomed/backend/server/search";

export const dynamic = "force-dynamic";

const EXAMPLES = [
  "I need a malaria test around Ikeja tomorrow morning",
  "abeg where I fit do typhoid and PCV for Yaba today?",
  "Full blood count and genotype near Surulere on Saturday",
  "chest x-ray in Maryland this evening",
];

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function Home(props: PageProps<"/">) {
  const sp = await props.searchParams;
  const q = one(sp.q)?.trim() ?? "";
  const area = one(sp.area);
  let view: (Found & { intent: SearchIntent } & Partial<Pick<SearchView, "ai" | "emergency" | "totalMs">>) | null = null;
  let error: string | null = null;

  if (q) {
    if (q.length > 1000) error = "Please keep your request under 1,000 characters.";
    else view = await runPromptSearch(q);
  } else if (area) {
    const test = one(sp.test);
    const day = one(sp.day) || null;
    const partRaw = one(sp.part);
    const part: DayPart = (DAY_PARTS as readonly string[]).includes(partRaw ?? "") ? (partRaw as DayPart) : "any";
    const intent: SearchIntent = {
      intent: test ? "find_test" : "find_facility",
      tests: test && isKnownTestCode(test) ? [test] : [],
      locationQuery: area,
      when: day || partRaw ? { day, part } : null,
      facilityType: null,
      confidence: 1,
    };
    view = { intent, ...(await searchWithIntent(intent)) };
  }

  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-2xl font-bold text-emerald-900">Find, book and pay for a medical test</h1>
        <p className="text-sm text-slate-600 mt-1">Say what you need in your own words. We show registry-listed facilities near you, and you can book and pay at partner labs.</p>
        <form action="/" method="get" className="mt-4 flex flex-col sm:flex-row gap-2">
          <label htmlFor="q" className="sr-only">What do you need?</label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            maxLength={1000}
            required
            placeholder="e.g. I need a malaria test around Ikeja tomorrow morning"
            className="flex-1 rounded-xl border border-emerald-900/20 bg-white px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
          <button className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800">Search</button>
        </form>
        {!view && !error && (
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((e) => (
              <Link key={e} href={`/?q=${encodeURIComponent(e)}`} className="rounded-full bg-white border border-emerald-900/15 px-3 py-1.5 text-xs text-emerald-900 hover:bg-emerald-50">
                {e}
              </Link>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-slate-500">
          Don&apos;t type your name, phone number or other personal details. Your text is sent to an AI service only to understand the request (not in mock mode).
        </p>
      </section>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      {view && (
        <>
          {view.emergency?.isEmergency && <EmergencyBanner matched={view.emergency.matched} />}

          {view.ai && (
            <p className="text-xs text-slate-500">
              {view.ai.source === "llm" && <>Understood by AI ({view.ai.mode}{view.ai.model ? ` · ${view.ai.model}` : ""}) in {view.ai.latencyMs} ms.</>}
              {view.ai.source === "mock" && <>Mock mode: understood by the rule-based parser. No AI inference.</>}
              {view.ai.source === "fallback" && <>AI unavailable ({view.ai.fallbackReason}), so the rule-based parser was used instead.</>}
              {typeof view.totalMs === "number" && <> Search total: {view.totalMs} ms.</>}
            </p>
          )}

          <SearchRefine
            test={view.intent.tests[0]}
            area={view.place?.name ?? null}
            day={view.intent.when?.day ?? null}
            part={view.intent.when && view.intent.when.part !== "any" ? view.intent.when.part : null}
          />
          {view.intent.tests.length > 1 && (
            <p className="text-xs text-slate-600">Tests requested: {view.intent.tests.map((t) => getTest(t)?.name ?? t).join(", ")}. The form above edits the first one.</p>
          )}

          {view.intent.intent === "unsupported" && !view.place && (
            <p className="rounded-lg bg-white border p-3 text-sm">
              I couldn&apos;t tell which test or area you mean. Pick them above. RioMed can&apos;t answer medical questions or suggest a diagnosis. Please talk to a clinician for that.
            </p>
          )}
          {view.intent.tests.length === 0 && view.intent.intent !== "unsupported" && view.intent.intent !== "emergency" && view.place && (
            <p className="rounded-lg bg-white border p-3 text-sm">
              No specific test named. RioMed doesn&apos;t choose tests from symptoms. A clinic can advise you. Here are facilities near {view.place.name}.
            </p>
          )}
          {!view.place && view.intent.intent !== "unsupported" && (
            <p className="rounded-lg bg-white border p-3 text-sm">Where are you? Choose an area above so we can find facilities near you.</p>
          )}

          {view.place && (
            <section aria-label="Results" className="space-y-3">
              <h2 className="font-semibold">
                {view.results.length} facilities within {view.radiusKm} km of {view.place.name}
              </h2>
              {view.widened && <p className="text-xs text-amber-800">Few results nearby, so we widened the search to {view.radiusKm} km.</p>}
              {view.results.length === 0 && (
                <p className="rounded-lg bg-white border p-3 text-sm">No listed facility offers this within 50 km. Try another test or area.</p>
              )}
              {view.results.map((r) => {
                const bookHref = `/facility/${r.id}?test=${encodeURIComponent(view!.intent.tests[0] ?? "")}${view!.window ? `&from=${view!.window.start.toISOString()}&to=${view!.window.end.toISOString()}` : ""}`;
                return (
                  <article key={r.id} className="rounded-xl bg-white border border-emerald-900/10 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-emerald-950">{r.name}</h3>
                        <p className="text-xs text-slate-600">
                          {FACILITY_TYPE_LABEL[r.type] ?? r.type} · {r.area} · {r.distanceKm.toFixed(1)} km
                        </p>
                      </div>
                      {r.isPartner ? (
                        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">Bookable</span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">Listed only</span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Registry record {r.nhfrId ?? "none"} · <span className="font-medium">demo data</span>
                    </p>
                    {r.isPartner ? (
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        {view!.intent.tests.length > 0 &&
                          (r.offersTests ? (
                            <span>{r.minPriceKobo != null ? formatNaira(r.minPriceKobo) : "Price on request"}</span>
                          ) : (
                            <span className="text-amber-800">Doesn&apos;t offer all requested tests</span>
                          ))}
                        <span className="text-slate-700">{r.nextSlot ? `Next free: ${lagosDateTime(r.nextSlot)}` : "No free slot in this window"}</span>
                        {r.offersTests && (
                          <Link href={bookHref} className="ml-auto rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800">
                            See times
                          </Link>
                        )}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-700">
                        Listed in registry, booking not available.{" "}
                        {r.phone && (
                          <a className="underline" href={`tel:${r.phone.replace(/\s/g, "")}`}>
                            Call {r.phone}
                          </a>
                        )}
                      </p>
                    )}
                  </article>
                );
              })}
            </section>
          )}
        </>
      )}

      {!view && !error && (
        <section className="grid sm:grid-cols-3 gap-3 text-sm">
          {[
            ["1. Say it", "Type what you need, in English or Pidgin."],
            ["2. Book & pay", "Pick a time at a partner lab and pay online with Paystack."],
            ["3. Keep your result", "Your result arrives as a secure PDF in your account, not on paper."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-xl bg-white border border-emerald-900/10 p-4">
              <p className="font-semibold text-emerald-900">{t}</p>
              <p className="text-slate-600 mt-1">{d}</p>
            </div>
          ))}
          <div className="sm:col-span-3">
            <SearchRefine title="Prefer not to type? Search with the form" />
          </div>
        </section>
      )}
    </div>
  );
}

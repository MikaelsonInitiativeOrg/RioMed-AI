import Link from "next/link";
import { getTest, isKnownTestCode } from "@riomed/backend/core/catalog";
import { DAY_PARTS, type DayPart, type SearchIntent } from "@riomed/backend/core/intent";
import { EmergencyBanner } from "@/components/EmergencyBanner";
import { SearchRefine } from "@/components/SearchRefine";
import { FacilityCard } from "@/components/FacilityCard";
import { EmptyState } from "@/components/EmptyState";
import { LiveNearby } from "@/components/LiveNearby";
import { RioMedLogo } from "@/components/Logo";
import { redirect } from "next/navigation";
import { detectAccountIntent, looksLikeCredential } from "@riomed/backend/core/intent/account";
import { HomeComposer } from "@/components/HomeComposer";
import { runPromptSearch, searchWithIntent, type Found, type SearchView } from "@riomed/backend/server/search";

export const dynamic = "force-dynamic";

const SUGGESTIONS = [
  { label: "Malaria test in Ikeja, tomorrow morning", text: "I need a malaria test around Ikeja tomorrow morning" },
  { label: "Widal test near Yaba, this evening", text: "Book a widal test near Yaba this evening" },
  { label: "Severe chest pain, can't breathe", text: "severe chest pain and I can't breathe properly" },
  { label: "Create an account", text: "create an account" },
  { label: "Access dashboard", text: "access dashboard" },
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

  // Account prompts open the real account popup (FR-008); src/proxy.ts normally redirects first.
  if (q && looksLikeCredential(q)) redirect("/account?mode=warning");
  const account = q ? detectAccountIntent(q) : null;
  if (account) redirect(`/account?mode=${account.action === "create" ? "signup" : "access"}&type=${account.type}`);

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
    <div className="flex-1 flex flex-col justify-between min-h-[calc(100vh-100px)] py-4 sm:py-6 px-3 sm:px-6">
      {/* ================= CHAT / CONTENT AREA ================= */}
      <div className="flex-1 flex flex-col justify-center">
        {/* State 1: Empty Home State matching uploaded screenshot exactly */}
        {!view && !error && (
          <div className="my-auto py-8 sm:py-12 flex flex-col items-center justify-center text-center gap-5">
            {/* Center Logo Mark (width 56, height 56) */}
            <RioMedLogo size={56} />

            {/* Main Heading in Sora */}
            <h1 className="font-heading font-bold text-2xl sm:text-3xl md:text-[28px] text-[#0A5347] tracking-tight">
              What do you need to find today?
            </h1>

            {/* Subheading */}
            <p className="max-w-[460px] text-sm sm:text-[15px] text-[#4B6560] leading-relaxed -mt-1">
              Describe the test or care you&apos;re looking for, in plain language. RioMed helps you find, book and pay — it never diagnoses.
            </p>

            {/* Suggestion Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg mt-1">
              {SUGGESTIONS.map((s) => (
                <Link
                  key={s.label}
                  href={`/?q=${encodeURIComponent(s.text)}`}
                  className="rounded-full bg-[#F3FAF8] border border-[#CDE8E1] px-4 py-2 text-xs sm:text-[13px] font-semibold text-[#0A5347] transition hover:bg-[#CDE8E1]/60 shadow-2xs"
                >
                  {s.label}
                </Link>
              ))}
            </div>

            {/* Structured Search Accordion Option */}
            <div className="mt-4 w-full max-w-xl text-left">
              <details className="group rounded-2xl border border-[#E3E0D6] bg-white p-3.5 shadow-2xs transition">
                <summary className="text-xs font-semibold text-[#0E6B5C] cursor-pointer flex items-center justify-between">
                  <span>Prefer not to type? Search with the form</span>
                  <span className="text-xs group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="mt-3 pt-3 border-t border-[#F0EEE7]">
                  <SearchRefine title="Filter by test, area & time" />
                </div>
              </details>
            </div>
          </div>
        )}

        {/* State 2: Account Creation or Dashboard Access Flow via Prompt */}
        {/* State 3: Error query */}
        {error && (
          <div className="my-auto max-w-xl mx-auto w-full p-4 rounded-2xl border border-[#FBE9E7] bg-[#FBE9E7] text-sm text-[#8A251C]">
            <p className="font-semibold">{error}</p>
          </div>
        )}

        {/* State 4: Active Prompt Search / Results Conversation */}
        {view && (
          <div className="w-full max-w-3xl mx-auto space-y-6 pb-6 animate-in fade-in duration-300">
            {/* User message bubble */}
            {(q || area) && (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-xs bg-[#0E6B5C] px-4 py-3 text-sm text-white shadow-xs">
                  {q || `Search for ${view.intent.tests[0] ?? "tests"} in ${area}`}
                </div>
              </div>
            )}

            {/* Assistant message response */}
            <div className="flex items-start gap-3">
              <div className="mt-1 shrink-0">
                <RioMedLogo size={28} />
              </div>

              <div className="flex-1 min-w-0 space-y-4">
                {/* AI-020: Emergency banner MUST come first before all results */}
                {view.emergency?.isEmergency && (
                  <EmergencyBanner matched={view.emergency.matched} />
                )}

                {/* Normal assistant introductory bubble */}
                {!view.emergency?.isEmergency && (
                  <div className="rounded-2xl rounded-bl-xs border border-[#E3E0D6] bg-white p-4 text-sm text-[#12262B] shadow-2xs space-y-2">
                    <p>
                      Here&apos;s what I understood. Tap a chip to change it, or check nearby facilities below.
                    </p>

                    {/* AI latency & mode badge */}
                    {view.ai && (
                      <div className="pt-2 border-t border-[#F0EEE7] flex flex-wrap items-center gap-2 text-xs text-[#4B6560]">
                        {view.ai.source === "mock" && (
                          <span className="rounded-full border border-dashed border-[#C98A1D] bg-white px-2 py-0.5 text-[10.5px] font-bold text-[#8A6212]">
                            MOCK AI
                          </span>
                        )}
                        {view.ai.source === "llm" && (
                          <span className="rounded-full bg-[#CDE8E1] px-2 py-0.5 text-[10.5px] font-bold text-[#0A5347]">
                            LIVE · {view.ai.mode.toUpperCase()}
                          </span>
                        )}
                        {view.ai.source === "fallback" && (
                          <span className="rounded-full bg-[#FFF4E5] px-2 py-0.5 text-[10.5px] font-bold text-[#8A6212]">
                            FALLBACK
                          </span>
                        )}
                        <span>
                          {view.ai.source === "llm" && (
                            <>Understood in {view.ai.latencyMs} ms.</>
                          )}
                          {view.ai.source === "mock" && (
                            <>Mock mode: understood by rule-based parser.</>
                          )}
                          {view.ai.source === "fallback" && (
                            <>AI unavailable ({view.ai.fallbackReason}), rule-based parser used.</>
                          )}
                          {typeof view.totalMs === "number" && (
                            <> (Search: {view.totalMs} ms)</>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Editable intent chips & parameter refine */}
                <SearchRefine
                  test={view.intent.tests[0]}
                  area={view.place?.name ?? null}
                  day={view.intent.when?.day ?? null}
                  part={view.intent.when && view.intent.when.part !== "any" ? view.intent.when.part : null}
                />

                {view.intent.tests.length > 1 && (
                  <div className="rounded-xl bg-[#F3FAF8] border border-[#0E6B5C]/20 p-3 text-xs text-[#0A5347]">
                    <span className="font-bold">Tests requested:</span>{" "}
                    {view.intent.tests.map((t) => getTest(t)?.name ?? t).join(", ")}. The form above edits the first one.
                  </div>
                )}

                {/* Clarification notes */}
                {view.intent.intent === "unsupported" && !view.place && (
                  <div className="rounded-2xl border border-[#C98A1D]/30 bg-[#FFF4E5] p-4 text-sm text-[#8A6212]">
                    <p className="font-bold">Request clarification</p>
                    <p className="mt-1">
                      I couldn&apos;t tell which test or area you mean. Pick them above. RioMed can&apos;t answer medical questions or suggest a diagnosis. Please talk to a clinician for that.
                    </p>
                  </div>
                )}

                {view.intent.tests.length === 0 && view.intent.intent !== "unsupported" && view.intent.intent !== "emergency" && view.place && (
                  <div className="rounded-2xl border border-[#E3E0D6] bg-white p-4 text-sm text-[#12262B]">
                    <p className="font-bold text-[#0A5347]">General facility search</p>
                    <p className="mt-1 text-[#4B6560]">
                      No specific test named. RioMed doesn&apos;t choose tests from symptoms. A clinic can advise you. Here are facilities near {view.place.name}.
                    </p>
                  </div>
                )}

                {!view.place && view.intent.intent !== "unsupported" && !view.intent.locationQuery && (
                  <div className="rounded-2xl border border-[#C98A1D]/30 bg-[#FFF4E5] p-4 text-sm text-[#8A6212]">
                    <p className="font-bold">Location required</p>
                    <p className="mt-1">
                      Where are you? Choose an area above so we can find facilities near you.
                    </p>
                  </div>
                )}
                {!view.place && view.intent.locationQuery && (
                  <p className="rounded-2xl border border-[#E3E0D6] bg-white p-4 text-sm text-[#4B6560]">
                    RioMed has no partner facilities in {view.intent.locationQuery} yet, so booking isn&apos;t available there. Here are places from Google Maps you can contact.
                  </p>
                )}

                {/* Facilities List */}
                {view.place && (
                  <section aria-label="Results" className="space-y-3 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                      <h2 className="font-heading text-lg font-bold text-[#0A5347] sm:text-xl">
                        Facilities near {view.place.name}
                      </h2>
                      {view.widened && (
                        <span className="text-xs font-semibold text-[#8A6212] bg-[#FFF4E5] px-2.5 py-0.5 rounded-full border border-[#C98A1D]/30">
                          Few results nearby, search widened to {view.radiusKm} km
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#8B9490]">
                      Ranked by distance, test availability and partner status
                    </p>

                    {view.results.length === 0 ? (
                      <EmptyState
                        title="No facilities found nearby"
                        description={`No listed facility offers this test within 50 km of ${view.place.name}. Try selecting another test or expanding to adjacent Lagos areas.`}
                        actionHref="/?area=Ikeja"
                        actionLabel="Search in Ikeja"
                        hint="You can also call nearby general hospitals directly."
                      />
                    ) : (
                      <div className="space-y-3">
                        {view.results.map((r) => (
                          <FacilityCard
                            key={r.id}
                            facility={r}
                            testCode={view!.intent.tests[0]}
                            window={view!.window}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {/* FR-027: live nearby places from Google Maps (unverified, not bookable) */}
                {!view.emergency?.isEmergency && (view.intent.locationQuery || view.place?.name) && (
                  <LiveNearby address={(view.intent.locationQuery ?? view.place?.name)!} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= COMPOSER (STICKY AT BOTTOM) ================= */}
      <footer className="w-full max-w-3xl mx-auto pt-4 shrink-0">
        <HomeComposer initialQuery={q} />

        {/* Required Medical Disclaimer from screenshot & PRD AI-022 */}
        <p className="text-center text-[10.5px] sm:text-[11px] text-[#4B6560] mt-2 mb-1">
          RioMed helps you find and book care. It does not give medical advice.
        </p>
      </footer>
    </div>
  );
}

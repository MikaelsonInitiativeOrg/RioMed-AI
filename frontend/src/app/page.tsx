import Link from "next/link";
import { AlertTriangle, CalendarCheck, ChevronDown, FileLock2, Info, LocateFixed, Search, Sparkles, Stethoscope } from "lucide-react";
import { getTest, isKnownTestCode } from "@riomed/backend/core/catalog";
import { DAY_PARTS, type DayPart, type SearchIntent } from "@riomed/backend/core/intent";
import { EmergencyBanner } from "@/components/EmergencyBanner";
import { SearchRefine } from "@/components/SearchRefine";
import { FacilityCard } from "@/components/FacilityCard";
import { LiveNearby } from "@/components/LiveNearby";
import { NearMeButton } from "@/components/NearMeButton";
import { PromptBookCard } from "@/components/PromptBookCard";
import { SymptomHelp } from "@/components/SymptomHelp";
import { suggestTestsForSymptoms } from "@riomed/backend/core/symptoms";
import { redirect } from "next/navigation";
import { detectAccountIntent, looksLikeCredential, wantsNearMe } from "@riomed/backend/core/intent/account";
import { HomeComposer } from "@/components/HomeComposer";
import { parseDeviceOrigin, runPromptSearch, searchWithIntent, type Found, type SearchView } from "@riomed/backend/server/search";

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
  // Set from ?lat=&lng= after NearMeButton's automatic browser request (tap is the retry fallback).
  const deviceOrigin = parseDeviceOrigin(one(sp.lat), one(sp.lng));
  let view: (Found & { intent: SearchIntent } & Partial<Pick<SearchView, "ai" | "emergency" | "totalMs">>) | null = null;
  let error: string | null = null;

  // Account prompts open the real account popup (FR-008); src/proxy.ts normally redirects first.
  if (q && looksLikeCredential(q)) redirect("/account?mode=warning");
  const account = q ? detectAccountIntent(q) : null;
  if (account) redirect(`/account?mode=${account.action === "create" ? "signup" : "access"}&type=${account.type}`);

  if (q) {
    if (q.length > 1000) error = "Please keep your request under 1,000 characters.";
    else view = await runPromptSearch(q, { deviceOrigin });
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

  // Symptom help: fixed, clinician-reviewable list; only when no test was named and it's not an emergency.
  const symptomHelp = view && q && view.intent.tests.length === 0 && !view.emergency?.isEmergency ? suggestTestsForSymptoms(q) : { matched: [], tests: [] };
  const hasSymptomHelp = symptomHelp.tests.length > 0;

  const aiBadge = view?.ai && (
    <span className="inline-flex items-center gap-1.5 text-xs text-subtle-foreground">
      {view.ai.source === "llm" && (
        <>
          <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 font-bold text-accent">
            <Sparkles className="h-3 w-3" aria-hidden /> Understood by {view.ai.mode}
          </span>
          {view.ai.latencyMs} ms
        </>
      )}
      {view.ai.source === "mock" && <span className="rounded-full bg-warning-soft px-2 py-0.5 font-bold text-warning-foreground">Mock AI</span>}
      {view.ai.source === "fallback" && (
        <span className="rounded-full bg-warning-soft px-2 py-0.5 font-bold text-warning-foreground" title={`AI unavailable (${view.ai.fallbackReason}); the rule-based parser was used`}>
          Offline parser ({view.ai.fallbackReason})
        </span>
      )}
    </span>
  );

  return (
    <div className="flex flex-1 flex-col py-6 sm:py-10">
      {/* ================= HOME ================= */}
      {!view && !error && (
        <div className="flex flex-col gap-10">
          <section className="mx-auto w-full max-w-2xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-bold text-muted-foreground">
              <Stethoscope className="h-3.5 w-3.5 text-primary" aria-hidden />
              Find, book and pay for medical tests
            </p>
            <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
              What do you need to find today?
            </h1>
            <p className="mx-auto mt-3 max-w-lg text-base leading-relaxed text-muted-foreground">
              Describe the test or care you need in plain words. RioMed finds nearby clinics with open slots. It never diagnoses.
            </p>
            <div className="mt-6 text-left">
              <HomeComposer initialQuery={q} />
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <Link
                  key={s.label}
                  href={`/?q=${encodeURIComponent(s.text)}`}
                  className="inline-flex min-h-[40px] items-center rounded-full border border-border bg-surface px-4 text-sm text-muted-foreground transition-colors duration-150 hover:border-primary hover:text-primary"
                >
                  {s.label}
                </Link>
              ))}
            </div>
          </section>

          {/* Closest facilities: the browser asks for location on load; nearest first */}
          <section aria-labelledby="near-title" className="mx-auto w-full max-w-2xl rounded-xl border border-border bg-surface p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <LocateFixed className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="near-title" className="text-base font-bold text-foreground">Closest to you</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">Hospitals, clinics and health centres near you, nearest first, anywhere you are.</p>
                <div className="mt-3">
                  <NearMeButton query="" />
                </div>
              </div>
            </div>
          </section>

          <section aria-label="How RioMed works" className="grid gap-3 sm:grid-cols-3">
            {[
              [Search, "Describe it", "Type what you need, like “malaria test in Ikeja tomorrow”. The AI reads it; it never diagnoses."],
              [CalendarCheck, "Book a slot", "See nearby clinics, prices and open times. Hold a slot and pay securely with Paystack."],
              [FileLock2, "Keep your results", "Results go to one private account, so your history follows you if you move."],
            ].map(([Icon, title, text]) => {
              const I = Icon as typeof Search;
              return (
                <div key={title as string} className="rounded-xl border border-border bg-surface p-5">
                  <I className="h-5 w-5 text-primary" aria-hidden />
                  <h3 className="mt-3 text-base font-bold text-foreground">{title as string}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text as string}</p>
                </div>
              );
            })}
          </section>

          <details className="group mx-auto w-full max-w-2xl rounded-xl border border-border bg-surface">
            <summary className="flex min-h-[52px] list-none items-center justify-between gap-2 px-5 text-sm font-bold text-foreground [&::-webkit-details-marker]:hidden">
              Prefer a form? Search by test, area and time
              <ChevronDown className="h-4 w-4 text-subtle-foreground transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="border-t border-border-soft p-5">
              <SearchRefine />
            </div>
          </details>
        </div>
      )}

      {error && (
        <div role="alert" className="mx-auto w-full max-w-2xl rounded-xl border border-danger/30 bg-danger-soft p-4 text-sm font-bold text-danger-foreground">
          {error}
        </div>
      )}

      {/* ================= RESULTS ================= */}
      {view && (
        <div className="mx-auto w-full max-w-3xl space-y-5">
          <div className="space-y-3">
            <HomeComposer initialQuery={q || ""} />
            {!view.emergency?.isEmergency && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  {q ? <>Results for <span className="font-bold text-foreground">“{q}”</span></> : <>Search in <span className="font-bold text-foreground">{area}</span></>}
                </p>
                {aiBadge}
              </div>
            )}
          </div>

          {/* AI-020: emergency guidance comes first, before any results */}
          {view.emergency?.isEmergency && <EmergencyBanner matched={view.emergency.matched} />}

          {/* FR-015: what was understood, editable */}
          <SearchRefine
            compact
            test={view.intent.tests[0]}
            area={view.place?.name ?? view.intent.locationQuery ?? null}
            day={view.intent.when?.day ?? null}
            part={view.intent.when && view.intent.when.part !== "any" ? view.intent.when.part : null}
          />

          {view.intent.tests.length > 1 && (
            <Note>
              <span className="font-bold">Tests requested:</span> {view.intent.tests.map((t) => getTest(t)?.name ?? t).join(", ")}. Editing changes the first one.
            </Note>
          )}

          {hasSymptomHelp && <SymptomHelp help={symptomHelp} place={view.place?.name ?? view.intent.locationQuery ?? null} origin={deviceOrigin} />}

          {view.intent.intent === "unsupported" && !view.place && !wantsNearMe(q) && !hasSymptomHelp && (
            <Note tone="warning" title="Tell me the test or the area">
              I couldn&apos;t tell which test or area you mean. Use Edit above, or try “FBC test in Yaba”. RioMed can&apos;t answer medical questions or suggest a diagnosis; please talk to a clinician for that.
            </Note>
          )}

          {view.intent.tests.length === 0 && view.intent.intent !== "unsupported" && view.intent.intent !== "emergency" && view.place && !hasSymptomHelp && (
            <Note>
              No specific test named, so these are all facilities near {view.place.name === "your location" ? "you" : view.place.name}. RioMed doesn&apos;t choose tests from symptoms; a clinic can advise you.
            </Note>
          )}

          {!view.place && !view.intent.locationQuery && view.intent.intent !== "emergency" && (view.intent.intent !== "unsupported" || wantsNearMe(q)) && (
            <Note tone="warning" title="Where are you?">
              <span className="mb-3 block">Allow location to see hospitals, clinics and health centres near you, or add an area with Edit above.</span>
              <NearMeButton query={q} />
            </Note>
          )}
          {!view.place && view.intent.locationQuery && (
            <Note>
              RioMed has no partner facilities in {view.intent.locationQuery} yet, so booking isn&apos;t available there. Places from Google Maps are below.
            </Note>
          )}

          {/* Book-for-me from a prompt that names a clinic (hold; pay on the appointment page) */}
          {q && !view.emergency?.isEmergency && <PromptBookCard query={q} />}

          {view.place && (
            <section aria-labelledby="results-title" className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 id="results-title" className="text-xl font-bold text-foreground">
                    Book on RioMed near {view.place.name === "your location" ? "you" : view.place.name}
                  </h2>
                  <p className="text-sm text-subtle-foreground">Nearest first, with test availability and open slots</p>
                </div>
                {view.widened && (
                  <span className="rounded-full bg-warning-soft px-2.5 py-1 text-xs font-bold text-warning-foreground">Widened to {view.radiusKm} km</span>
                )}
              </div>

              {view.results.length === 0 ? (
                <Note>
                  {view.place.name === "your location"
                    ? "No RioMed partner near you yet, so online booking isn't available here. The nearest places from Google Maps are below."
                    : `No RioMed partner near ${view.place.name} yet, so online booking isn't available there. Places from Google Maps are below.`}{" "}
                  Clinics can <Link href="/account?mode=signup&type=facility" className="font-bold text-primary underline underline-offset-2">register on RioMed</Link> to take bookings.
                </Note>
              ) : (
                <div className="space-y-3">
                  {view.results.map((r) => (
                    <FacilityCard key={r.id} facility={r} testCode={view!.intent.tests[0]} window={view!.window} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* FR-027: live nearby places from Google Maps (unverified, not bookable) */}
          {!view.emergency?.isEmergency && (view.intent.locationQuery || view.place) && (
            <LiveNearby
              address={view.intent.locationQuery ?? (deviceOrigin && view.place?.name === "your location" ? "" : view.place?.name ?? "")}
              lat={deviceOrigin && !view.intent.locationQuery ? deviceOrigin.lat : undefined}
              lng={deviceOrigin && !view.intent.locationQuery ? deviceOrigin.lng : undefined}
            />
          )}

          <p className="pt-2 text-center text-xs text-subtle-foreground sm:hidden">
            RioMed helps you find and book care. It does not give medical advice. Emergency: call 112.
          </p>
        </div>
      )}
    </div>
  );
}

function Note({ children, title, tone = "info" }: { children: React.ReactNode; title?: string; tone?: "info" | "warning" }) {
  const Icon = tone === "warning" ? AlertTriangle : Info;
  return (
    <div className={`flex gap-3 rounded-xl border p-4 text-sm ${tone === "warning" ? "border-warning/30 bg-warning-soft text-warning-foreground" : "border-border bg-surface text-muted-foreground"}`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone === "warning" ? "" : "text-primary"}`} aria-hidden />
      <div className="min-w-0">
        {title && <p className="mb-0.5 font-bold text-foreground">{title}</p>}
        {children}
      </div>
    </div>
  );
}

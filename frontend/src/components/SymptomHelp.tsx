import Link from "next/link";
import { HeartPulse, Info } from "lucide-react";
import { getTest } from "@riomed/backend/core/catalog";
import { SYMPTOM_LIST_STATUS, type SymptomHelp as Help } from "@riomed/backend/core/symptoms";
import { getTestInfo } from "@riomed/backend/core/testInfo";

/**
 * Tests OFTEN REQUESTED for the symptoms described, as choices the person taps (never added on
 * their own). Only a clinician can decide what they need. Hidden for emergencies upstream.
 */
export function SymptomHelp({ help, place, origin }: { help: Help; place: string | null; origin: { lat: number; lng: number } | null }) {
  if (help.tests.length === 0) return null;
  const hrefFor = (name: string) => {
    const where = place && place !== "your location" ? ` near ${place}` : " near me";
    const coords = origin ? `&lat=${origin.lat}&lng=${origin.lng}` : "";
    return `/?q=${encodeURIComponent(`${name}${where}`)}${coords}`;
  };

  return (
    <section aria-labelledby="symptom-help-title" className="rounded-xl border border-primary/25 bg-primary-soft p-4 sm:p-5">
      <h2 id="symptom-help-title" className="inline-flex items-center gap-2 text-base font-bold text-foreground">
        <HeartPulse className="h-5 w-5 text-primary" aria-hidden />
        Tests often requested for {help.matched.join(" and ")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Tap one to find where to do it. This isn&apos;t a diagnosis, and only a clinician can decide which tests you need. If you feel very unwell or it gets worse, see a doctor or call 112.
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {help.tests.map((code) => {
          const name = getTest(code)?.name ?? code;
          return (
            <li key={code}>
              <Link
                href={hrefFor(name)}
                className="flex min-h-[56px] flex-col justify-center rounded-lg border border-border bg-surface px-3 py-2 transition-colors hover:border-primary"
              >
                <span className="text-sm font-bold text-primary">{name}</span>
                <span className="text-xs text-subtle-foreground">{getTestInfo(code)?.measures}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-subtle-foreground">
        <Info className="h-3.5 w-3.5" aria-hidden />
        Symptom list: {SYMPTOM_LIST_STATUS}. Not chosen by AI.
      </p>
    </section>
  );
}

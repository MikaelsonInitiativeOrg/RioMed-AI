import { BookOpen } from "lucide-react";
import { getTest } from "@riomed/backend/core/catalog";
import { getTestInfo, TEST_INFO_DISCLAIMER } from "@riomed/backend/core/testInfo";

/** Plain-language glossary for a test. General information only; never reads the patient's values. */
export function AboutTest({ testCode }: { testCode: string }) {
  const info = getTestInfo(testCode);
  if (!info) return null;
  return (
    <section aria-labelledby="about-test" className="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5">
      <h2 id="about-test" className="inline-flex items-center gap-2 text-base font-bold text-foreground">
        <BookOpen className="h-5 w-5 text-primary" aria-hidden />
        About the {getTest(testCode)?.name ?? testCode} test
      </h2>
      <dl className="mt-3 space-y-2 text-sm">
        <div><dt className="font-bold text-foreground">What it checks</dt><dd className="text-muted-foreground">{info.measures}</dd></div>
        <div><dt className="font-bold text-foreground">How to prepare</dt><dd className="text-muted-foreground">{info.prepare}</dd></div>
      </dl>
      <p className="mt-3 text-xs text-subtle-foreground">{TEST_INFO_DISCLAIMER}</p>
    </section>
  );
}

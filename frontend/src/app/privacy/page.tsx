import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { PrivacyManager } from "@/components/PrivacyManager";

export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const actor = await getSessionUser();
  if (!actor) redirect("/account?mode=access&next=/privacy");

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 py-4 sm:py-6 pb-16">
      {/* Back Link */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-strong transition"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="font-heading text-xl sm:text-2xl font-bold text-primary-strong">
          Privacy &amp; your data
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Download a copy of your data. More controls are coming as RioMed works toward the Nigeria Data Protection Act (NDPA) requirements.
        </p>
      </div>

      {/* Privacy Manager interactive tools */}
      <PrivacyManager />
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { PrivacyManager } from "@/components/PrivacyManager";

export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const actor = await getSessionUser();
  if (!actor) redirect("/demo-login?next=/privacy");

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 py-4 sm:py-6 pb-16">
      {/* Back Link */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-[#0E6B5C] hover:text-[#0A5347] transition"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="font-heading text-xl sm:text-2xl font-bold text-[#0A5347]">
          Privacy, Dependants &amp; Data Rights
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[#4B6560]">
          Exercise your rights under the Nigeria Data Protection Act (NDPA): manage family dependants, download your personal records, or request data deletion.
        </p>
      </div>

      {/* Privacy Manager interactive tools */}
      <PrivacyManager userName={actor.name} />
    </div>
  );
}

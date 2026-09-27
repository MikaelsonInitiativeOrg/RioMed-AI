import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { listAuditForPatient } from "@riomed/backend/server/queries";
import { lagosDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AuditPage(props: PageProps<"/audit">) {
  const sp = await props.searchParams;
  const actor = await getSessionUser();
  if (!actor) redirect("/demo-login?next=/audit");

  const filterRef = typeof sp.ref === "string" ? sp.ref.toUpperCase() : "";

  // Real audit events (FR-064), not reconstructed from bookings.
  const events = await listAuditForPatient(actor);
  const filtered = filterRef ? events.filter((e) => e.reference?.toUpperCase().includes(filterRef)) : events;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 py-4 sm:py-6 pb-16">
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
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0A5347] text-white text-sm">
            🛡️
          </span>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-[#0A5347]">
            Access &amp; Security Audit Trail
          </h1>
        </div>
        <p className="mt-1 text-xs sm:text-sm text-[#4B6560]">
          Sign-ins, check-ins, result uploads and every time a result PDF is opened are recorded here, with who did it.
        </p>
      </div>

      {/* NDPA Compliance Banner */}
      <div className="rounded-2xl border border-[#0E6B5C]/30 bg-[#F3FAF8] p-4 sm:p-5 text-xs sm:text-sm text-[#0A5347] space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-heading font-bold text-sm">
            Built toward Nigeria Data Protection Act (NDPA) requirements
          </span>
          <span className="rounded-full bg-[#0A5347] px-2.5 py-0.5 text-[10px] font-bold text-white uppercase">
            Not yet legally reviewed
          </span>
        </div>
        <p className="text-xs text-[#4B6560] leading-relaxed">
          Only the text you type into search goes to the AI. Your account, results and location never do. Result links expire after 5 minutes. The database is encrypted at rest by the hosting provider. This hackathon demo uses synthetic data.
        </p>
      </div>

      {/* Audit Events List */}
      <div className="rounded-2xl border border-[#E3E0D6] bg-white overflow-hidden shadow-2xs">
        <div className="bg-[#F7F5F0] px-4 py-3 border-b border-[#E3E0D6] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="font-heading font-bold text-xs uppercase tracking-wider text-[#4B6560]">
            Audit events ({filtered.length})
          </h2>
          {filterRef && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#0A5347] font-semibold">
                Filtering by ref: {filterRef}
              </span>
              <Link href="/audit" className="text-xs text-[#8B9490] hover:text-[#12262B]">
                Clear ✕
              </Link>
            </div>
          )}
        </div>

        <div className="divide-y divide-[#F0EEE7]">
          {filtered.length === 0 && (
            <p className="p-4 text-xs text-[#4B6560]">No recorded events yet. They appear when you sign in, check in, or when a result is uploaded or opened.</p>
          )}
          {filtered.map((e) => (
            <div key={e.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-[#F3FAF8]/40 transition">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#12262B]">{e.action}</span>
                  {!e.byYou && (
                    <span className="bg-[#FFF4E0] text-[#7A4B00] text-[10px] font-bold px-2 py-0.5 rounded-full">BY SOMEONE ELSE</span>
                  )}
                </div>
                <p className="text-[#4B6560]">
                  By: <strong className="text-[#12262B]">{e.byName}</strong>
                  {e.reference && (
                    <>
                      {" "}· Ref: <strong className="font-mono text-[#12262B]">{e.reference}</strong> · {e.facilityName}
                    </>
                  )}
                </p>
              </div>
              <div className="text-right text-[11.5px] text-[#8B9490]">{lagosDateTime(e.at)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Export & Retention Rules */}
      <div className="rounded-xl border border-[#E3E0D6] bg-white p-4 text-xs text-[#4B6560] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="font-bold text-[#12262B]">Audit Retention Notice</span>
          <p className="text-[11px] text-[#8B9490]">
            Users cannot edit or delete audit events. The retention period is still to be decided (PRD section 11.5).
          </p>
        </div>
        <Link
          href="/privacy"
          className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-[#0E6B5C] px-3.5 py-1.5 text-xs font-bold text-[#0E6B5C] hover:bg-[#F3FAF8] shrink-0"
        >
          Manage Data &amp; Privacy →
        </Link>
      </div>
    </div>
  );
}

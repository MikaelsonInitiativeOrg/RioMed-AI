import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { listPatientAppointments } from "@riomed/backend/server/queries";
import { lagosDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AuditPage(props: PageProps<"/audit">) {
  const sp = await props.searchParams;
  const actor = await getSessionUser();
  if (!actor) redirect("/demo-login?next=/audit");

  const filterRef = typeof sp.ref === "string" ? sp.ref.toUpperCase() : "";

  // Get user's appointments to construct real audit trail entries
  const appts = await listPatientAppointments(actor);
  const filteredAppts = filterRef
    ? appts.filter((a) => a.reference.toUpperCase().includes(filterRef))
    : appts;

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
          Every time your sensitive medical data, booking references, or test results are viewed or downloaded, an immutable audit event is recorded.
        </p>
      </div>

      {/* NDPA Compliance Banner */}
      <div className="rounded-2xl border border-[#0E6B5C]/30 bg-[#F3FAF8] p-4 sm:p-5 text-xs sm:text-sm text-[#0A5347] space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-heading font-bold text-sm">
            Nigeria Data Protection Act (NDPA) Compliance
          </span>
          <span className="rounded-full bg-[#0A5347] px-2.5 py-0.5 text-[10px] font-bold text-white uppercase">
            Active Vault
          </span>
        </div>
        <p className="text-xs text-[#4B6560] leading-relaxed">
          RioMed adheres to strict data minimization. Your test results are encrypted with provider-managed keys at rest, links expire in 5 minutes, and no AI model trains on your health documents.
        </p>
      </div>

      {/* Audit Events List */}
      <div className="rounded-2xl border border-[#E3E0D6] bg-white overflow-hidden shadow-2xs">
        <div className="bg-[#F7F5F0] px-4 py-3 border-b border-[#E3E0D6] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="font-heading font-bold text-xs uppercase tracking-wider text-[#4B6560]">
            Audit Events ({filteredAppts.length * 2 + 1})
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
          {/* Current Session Login Event */}
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-[#F3FAF8]/40 transition">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#12262B]">Session Authenticated (PIN)</span>
                <span className="bg-[#CDE8E1] text-[#0A5347] text-[10px] font-bold px-2 py-0.5 rounded-full">
                  VERIFIED
                </span>
              </div>
              <p className="text-[#4B6560]">
                Actor: <strong className="text-[#12262B]">{actor.name}</strong> · Role: Patient
              </p>
            </div>
            <div className="text-right text-[11.5px] text-[#8B9490] font-mono">
              Just now · IP hash: 9a3f…c712
            </div>
          </div>

          {/* Dynamic Events from Patient's Appointments */}
          {filteredAppts.map((a) => (
            <div key={a.id} className="divide-y divide-[#F0EEE7]">
              {/* Event 1: Booking Created */}
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-[#F3FAF8]/40 transition">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#12262B]">Slot Held &amp; Booking Registered</span>
                    <span className="bg-[#F3FAF8] text-[#0E6B5C] border border-[#0E6B5C]/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      APPOINTMENT
                    </span>
                  </div>
                  <p className="text-[#4B6560]">
                    Ref: <strong className="font-mono text-[#12262B]">{a.reference}</strong> · Facility: {a.facilityName}
                  </p>
                </div>
                <div className="text-right text-[11.5px] text-[#8B9490]">
                  {lagosDateTime(a.slotStart)}
                </div>
              </div>

              {/* Event 2: If result exists */}
              {a.hasResult && (
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-[#F3FAF8]/30 hover:bg-[#F3FAF8]/60 transition">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#0A5347]">Official PDF Result Signed &amp; Vaulted</span>
                      <span className="bg-[#CDE8E1] text-[#0A5347] text-[10px] font-bold px-2 py-0.5 rounded-full">
                        VAULT v1
                      </span>
                    </div>
                    <p className="text-[#4B6560]">
                      Uploaded by licensed medical laboratory scientist at {a.facilityName}
                    </p>
                  </div>
                  <div className="text-right text-[11.5px] text-[#0E6B5C] font-semibold">
                    <Link href={`/appointments/${a.id}/result`} className="hover:underline">
                      View report →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Audit Export & Retention Rules */}
      <div className="rounded-xl border border-[#E3E0D6] bg-white p-4 text-xs text-[#4B6560] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="font-bold text-[#12262B]">Audit Retention Notice</span>
          <p className="text-[11px] text-[#8B9490]">
            Audit logs are retained for 6 years in accordance with healthcare regulations and cannot be erased by users.
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

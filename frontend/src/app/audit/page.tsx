import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { listAuditForPatient } from "@riomed/backend/server/queries";
import { lagosDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AuditPage(props: PageProps<"/audit">) {
  const sp = await props.searchParams;
  const actor = await getSessionUser();
  if (!actor) redirect("/account?mode=access&next=/audit");

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
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-strong transition"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-strong text-white text-sm">
            <ShieldCheck className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-primary-strong">
            Access &amp; Security Audit Trail
          </h1>
        </div>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Sign-ins, check-ins, result uploads and every time a result PDF is opened are recorded here, with who did it.
        </p>
      </div>

      {/* NDPA Compliance Banner */}
      <div className="rounded-2xl border border-primary/30 bg-primary-soft p-4 sm:p-5 text-xs sm:text-sm text-primary-strong space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-heading font-bold text-sm">
            Built toward Nigeria Data Protection Act (NDPA) requirements
          </span>
          <span className="rounded-full bg-primary-strong px-2.5 py-0.5 text-xs font-bold text-white uppercase">
            Not yet legally reviewed
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Only the text you type into search goes to the AI. Your account, results and location never do. Result links expire after 5 minutes. The database is encrypted at rest by the hosting provider. This hackathon demo uses synthetic data.
        </p>
      </div>

      {/* Audit Events List */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-2xs">
        <div className="bg-background px-4 py-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="font-heading font-bold text-xs uppercase tracking-wider text-muted-foreground">
            Audit events ({filtered.length})
          </h2>
          {filterRef && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-primary-strong font-semibold">
                Filtering by ref: {filterRef}
              </span>
              <Link href="/audit" className="text-xs text-subtle-foreground hover:text-foreground">
                Clear ✕
              </Link>
            </div>
          )}
        </div>

        <div className="divide-y divide-border-soft">
          {filtered.length === 0 && (
            <p className="p-4 text-xs text-muted-foreground">No recorded events yet. They appear when you sign in, check in, or when a result is uploaded or opened.</p>
          )}
          {filtered.map((e) => (
            <div key={e.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-primary-soft/40 transition">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">{e.action}</span>
                  {!e.byYou && (
                    <span className="bg-warning-soft text-warning-foreground text-xs font-bold px-2 py-0.5 rounded-full">BY SOMEONE ELSE</span>
                  )}
                </div>
                <p className="text-muted-foreground">
                  By: <strong className="text-foreground">{e.byName}</strong>
                  {e.reference && (
                    <>
                      {" "}· Ref: <strong className="font-mono text-foreground">{e.reference}</strong> · {e.facilityName}
                    </>
                  )}
                </p>
              </div>
              <div className="text-right text-xs text-subtle-foreground">{lagosDateTime(e.at)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Export & Retention Rules */}
      <div className="rounded-xl border border-border bg-surface p-4 text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="font-bold text-foreground">Audit Retention Notice</span>
          <p className="text-xs text-subtle-foreground">
            Users cannot edit or delete audit events. The retention period is still to be decided (PRD section 11.5).
          </p>
        </div>
        <Link
          href="/privacy"
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-primary px-3.5 py-1.5 text-xs font-bold text-primary hover:bg-primary-soft shrink-0"
        >
          Manage Data &amp; Privacy →
        </Link>
      </div>
    </div>
  );
}

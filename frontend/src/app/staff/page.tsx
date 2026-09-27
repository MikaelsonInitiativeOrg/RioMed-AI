import Link from "next/link";
import { FacilityShell } from "@/components/FacilityShell";
import { redirect } from "next/navigation";
import { getTest } from "@riomed/backend/core/catalog";
import { checkInAction } from "@/app/actions";
import { lagosDayMonth, lagosTimeOnly } from "@/lib/format";
import { listFacilityAppointments } from "@riomed/backend/server/queries";
import { getSessionUser } from "@/lib/session";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { StaffResultUploader } from "@/components/StaffResultUploader";

export const dynamic = "force-dynamic";

export default async function StaffPage(props: PageProps<"/staff">) {
  const sp = await props.searchParams;
  const actor = await getSessionUser();
  if (!actor) redirect("/account?mode=access&next=/staff");
  const q = typeof sp.q === "string" ? sp.q.trim().toUpperCase() : "";
  const desk = await listFacilityAppointments(actor, { referenceQuery: q });
  if (!desk) redirect(actor.role === "patient" ? "/dashboard" : "/account?mode=access"); // pending facility accounts: approval popup
  const { facility, appointments: appts } = desk;

  const todayLabel = `Today · ${lagosDayMonth()}`;

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Uploaded success notification */}
      {sp.uploaded && (
        <div
          role="status"
          className="rounded-2xl border border-primary/30 bg-primary-soft p-4 text-sm text-primary-strong font-semibold flex items-center justify-between"
        >
          <span>✓ Result uploaded successfully. The patient can now view it on their dashboard.</span>
          <Link href="/staff" className="text-xs underline hover:text-primary-strong">
            Dismiss
          </Link>
        </div>
      )}

      {/* Error alert */}
      {typeof sp.error === "string" && (
        <div
          role="alert"
          className="rounded-2xl border border-danger-soft bg-danger-soft p-4 text-sm text-danger-foreground font-semibold"
        >
          {sp.error}
        </div>
      )}

      <FacilityShell facilityName={facility?.name ?? "Your facility"} operatorName={actor.name} active="schedule">
            {/* Main Header: Date + Booking Reference Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <h1 className="font-heading font-bold text-xl sm:text-2xl text-foreground">
                {todayLabel}
              </h1>

              {/* Search by booking reference form matching mockup */}
              <form method="get" className="flex items-center gap-2">
                <div className="relative flex-1 sm:flex-none">
                  <input
                    name="q"
                    defaultValue={q}
                    placeholder="Search by booking reference"
                    className="w-full sm:w-64 min-h-[44px] rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {q && (
                    <Link
                      href="/staff"
                      className="absolute right-2 top-2 text-xs text-subtle-foreground hover:text-foreground"
                      title="Clear search"
                    >
                      ✕
                    </Link>
                  )}
                </div>
                <button
                  type="submit"
                  className="min-h-[44px] rounded-lg border border-primary bg-surface px-3 py-1.5 text-xs font-heading font-bold text-primary hover:bg-primary-soft active:scale-[0.98] transition"
                >
                  Find
                </button>
              </form>
            </div>

            {/* Empty appointments */}
            {appts.length === 0 ? (
              <div className="bg-surface rounded-xl border border-border p-6">
                <EmptyState
                  title={`No bookings${q ? " match reference " + q : " on today's schedule"}`}
                  description={
                    q
                      ? `No appointment found for reference "${q}". Please check the booking reference code.`
                      : "Patient bookings confirmed through RioMed will appear here for arrivals check-in and PDF result upload."
                  }
                  actionHref={q ? "/staff" : undefined}
                  actionLabel={q ? "Show all bookings" : undefined}
                />
              </div>
            ) : (
              <>
                {/* Phones and tablets: one card per booking, actions full width */}
                <ul className="lg:hidden grid gap-3 md:grid-cols-2">
                  {appts.map((a) => {
                    const testLabel = getTest(a.testCode)?.name ?? a.testCode;
                    return (
                      <li key={a.id} className="rounded-xl border border-border bg-surface p-4 space-y-3 shadow-2xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-heading font-bold text-base text-foreground">{lagosTimeOnly(a.slotStart)}</span>
                          <StatusBadge status={a.status} />
                        </div>
                        <div>
                          <p className="font-heading font-semibold text-sm text-foreground">{testLabel}</p>
                          <p className="font-mono text-sm font-bold text-foreground">{a.reference}</p>
                          <p className="text-sm text-muted-foreground">{a.patientName}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          {a.status === "CONFIRMED" && (
                            <form action={checkInAction}>
                              <input type="hidden" name="appointmentId" value={a.id} />
                              <button type="submit" className="w-full min-h-[44px] rounded-lg bg-primary px-4 text-sm font-heading font-bold text-white hover:bg-primary-strong">
                                Check in
                              </button>
                            </form>
                          )}
                          {["CHECKED_IN", "COMPLETED", "RESULT_AVAILABLE"].includes(a.status) && (
                            <StaffResultUploader appointmentId={a.id} reference={a.reference} testName={testLabel} resultCount={a.resultCount} />
                          )}
                          <Link href={`/appointments/${a.id}`} className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-border text-sm font-semibold text-primary">
                            Booking details →
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Laptop and up: table */}
                <div className="hidden lg:block rounded-xl border border-border bg-surface overflow-x-auto shadow-2xs">
                <div className="min-w-[640px]">
                  {/* Table Header Row */}
                  <div className="grid grid-cols-[90px_1fr_1fr_120px_200px] bg-background px-4 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
                    <span>Time</span>
                    <span>Reference</span>
                    <span>Test</span>
                    <span>Status</span>
                    <span>Action</span>
                  </div>

                  {/* Table Rows */}
                  <div className="divide-y divide-border-soft">
                    {appts.map((a) => {
                      const testObj = getTest(a.testCode);
                      const testLabel = testObj?.name ?? a.testCode;

                      return (
                        <div
                          key={a.id}
                          className="grid grid-cols-[90px_1fr_1fr_120px_200px] px-4 py-3.5 items-center text-xs hover:bg-primary-soft/50 transition"
                        >
                          {/* Time */}
                          <span className="font-semibold text-foreground">
                            {lagosTimeOnly(a.slotStart)}
                          </span>

                          {/* Reference */}
                          <div>
                            <span className="font-mono font-bold text-foreground">
                              {a.reference}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {a.patientName}
                            </span>
                          </div>

                          {/* Test */}
                          <div>
                            <span className="font-heading font-semibold text-foreground">
                              {testLabel}
                            </span>
                          </div>

                          {/* Status Badge */}
                          <div>
                            <StatusBadge status={a.status} />
                          </div>

                          {/* Action Cell matching mockup */}
                          <div className="flex items-center gap-2">
                            {/* CONFIRMED -> Check In button */}
                            {a.status === "CONFIRMED" && (
                              <form action={checkInAction}>
                                <input type="hidden" name="appointmentId" value={a.id} />
                                <button
                                  type="submit"
                                  className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-primary px-3.5 py-1.5 text-xs font-heading font-bold text-white shadow-2xs hover:bg-primary-strong active:scale-[0.98] transition"
                                >
                                  Check In
                                </button>
                              </form>
                            )}

                            {/* CHECKED_IN or RESULT_AVAILABLE -> Upload result button */}
                            {["CHECKED_IN", "COMPLETED", "RESULT_AVAILABLE"].includes(a.status) && (
                              <StaffResultUploader
                                appointmentId={a.id}
                                reference={a.reference}
                                testName={testLabel}
                                resultCount={a.resultCount}
                              />
                            )}

                            {/* HELD -> Awaiting payment */}
                            {["HELD", "PENDING_PAYMENT"].includes(a.status) && (
                              <span className="text-xs text-subtle-foreground">
                                Awaiting payment
                              </span>
                            )}

                            {/* View details link */}
                            <Link
                              href={`/appointments/${a.id}`}
                              className="inline-flex min-h-[44px] items-center text-xs font-semibold text-primary hover:underline ml-auto"
                            >
                              Details →
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              </>
            )}
      </FacilityShell>
    </div>
  );
}

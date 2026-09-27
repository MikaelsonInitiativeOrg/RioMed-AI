import Link from "next/link";
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
  if (!actor) redirect("/demo-login?next=/staff");
  const q = typeof sp.q === "string" ? sp.q.trim().toUpperCase() : "";
  const desk = await listFacilityAppointments(actor, { referenceQuery: q });
  if (!desk) redirect("/dashboard");
  const { facility, appointments: appts } = desk;

  const todayLabel = `Today · ${lagosDayMonth()}`;

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Uploaded success notification */}
      {sp.uploaded && (
        <div
          role="status"
          className="rounded-2xl border border-[#0E6B5C]/30 bg-[#F3FAF8] p-4 text-sm text-[#0A5347] font-semibold flex items-center justify-between"
        >
          <span>✓ Result uploaded successfully. The patient can now view it on their dashboard.</span>
          <Link href="/staff" className="text-xs underline hover:text-[#063D34]">
            Dismiss
          </Link>
        </div>
      )}

      {/* Error alert */}
      {typeof sp.error === "string" && (
        <div
          role="alert"
          className="rounded-2xl border border-[#FBE9E7] bg-[#FBE9E7] p-4 text-sm text-[#8A251C] font-semibold"
        >
          {sp.error}
        </div>
      )}

      {/* BROWSER WINDOW WRAPPER (Matching app.riomed.ai/facility/schedule) */}
      <div className="rounded-2xl border border-[#202124] overflow-hidden shadow-2xl bg-[#202124]">
        {/* macOS Chrome Browser Tab Bar & Controls */}
        <div className="flex items-center h-10 px-3 bg-[#202124] text-[#e8eaed] text-xs select-none">
          {/* Traffic lights */}
          <div className="flex items-center gap-2 pr-3">
            <span className="w-3 h-3 rounded-full bg-[#ff5f57] inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#febc2e] inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#28c840] inline-block" />
          </div>

          {/* Active Tab */}
          <div className="flex items-center gap-2 bg-[#35363a] px-3.5 py-1.5 rounded-t-lg text-xs font-medium text-[#e8eaed] border-t border-[#4B6560]/40 max-w-[200px]">
            <span className="w-2 h-2 rounded-full bg-[#8FE0CE]" />
            <span className="truncate">app.riomed.ai/facility</span>
          </div>
        </div>

        {/* Browser URL Toolbar */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#35363a] border-b border-[#202124]">
          <div className="flex items-center gap-1.5 text-[#9aa0a6] text-xs">
            <span className="hover:text-white cursor-pointer px-1">‹</span>
            <span className="hover:text-white cursor-pointer px-1">›</span>
            <span className="hover:text-white cursor-pointer px-1">↻</span>
          </div>

          {/* Address Bar */}
          <div className="flex-1 flex items-center gap-2 bg-[#282a2d] px-3 py-1 rounded-full text-xs text-[#e8eaed] font-mono mx-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-[#8FE0CE] shrink-0">
              <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span className="text-[#9aa0a6]">https://</span>
            <span className="text-white">app.riomed.ai/facility/schedule</span>
          </div>
        </div>

        {/* BROWSER INTERIOR: SIDEBAR + MAIN CONTENT */}
        <div className="flex flex-col md:flex-row min-h-[580px] bg-[#F7F5F0]">
          {/* Left Dark Teal Sidebar */}
          <aside className="w-full md:w-[220px] bg-[#0A5347] text-[#F3FAF8] p-5 flex flex-col justify-between shrink-0">
            <div className="space-y-6">
              {/* Facility Brand Header */}
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#0E6B5C] flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 48 48">
                    <path
                      d="M9 25h6l3-9 5 17 4-14 3 6h9"
                      stroke="#F3FAF8"
                      strokeWidth="3.4"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="37" cy="25" r="4.4" fill="#8FE0CE" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h2 className="font-heading font-bold text-sm text-white truncate">
                    {facility?.name ?? "Grace Diagnostics"}
                  </h2>
                  <p className="text-[10px] text-[#CDE8E1] truncate">
                    Lagos Desk · Active
                  </p>
                </div>
              </div>

              {/* Navigation Menu */}
              <nav aria-label="Facility Navigation" className="space-y-1">
                <Link
                  href="/staff"
                  className="flex items-center gap-2 bg-white/12 text-white font-heading font-bold text-xs rounded-lg px-3 py-2 transition"
                >
                  <span className="text-[#8FE0CE]">📅</span>
                  <span>Today&apos;s schedule</span>
                </Link>

                <a
                  href="#search"
                  className="flex items-center gap-2 text-[#CDE8E1] hover:text-white hover:bg-white/5 text-xs rounded-lg px-3 py-2 transition"
                >
                  <span>🔍</span>
                  <span>Bookings search</span>
                </a>

                <a
                  href="#results"
                  className="flex items-center gap-2 text-[#CDE8E1] hover:text-white hover:bg-white/5 text-xs rounded-lg px-3 py-2 transition"
                >
                  <span>📋</span>
                  <span>Results</span>
                </a>

                <Link
                  href="/staff/catalogue"
                  className="flex items-center gap-2 text-[#CDE8E1] hover:text-white hover:bg-white/5 text-xs rounded-lg px-3 py-2 transition"
                >
                  <span>🏷️</span>
                  <span>Catalogue &amp; prices</span>
                </Link>

                <a
                  href="#staff"
                  className="flex items-center gap-2 text-[#CDE8E1] hover:text-white hover:bg-white/5 text-xs rounded-lg px-3 py-2 transition"
                >
                  <span>👥</span>
                  <span>Staff</span>
                </a>
              </nav>
            </div>

            {/* Sidebar Footer */}
            <div className="pt-6 border-t border-white/10 text-[11px] text-[#CDE8E1] space-y-1">
              <p>Operator: {actor.name}</p>
              <div className="flex gap-2">
                <Link href="/demo-login?next=/staff" className="underline hover:text-white">
                  Switch profile
                </Link>
                <span>·</span>
                <Link href="/dashboard" className="underline hover:text-white">
                  Patient view
                </Link>
              </div>
            </div>
          </aside>

          {/* Main Schedule Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-7 overflow-x-auto">
            {/* Main Header: Date + Booking Reference Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <h1 className="font-heading font-bold text-xl sm:text-2xl text-[#12262B]">
                {todayLabel}
              </h1>

              {/* Search by booking reference form matching mockup */}
              <form method="get" className="flex items-center gap-2">
                <div className="relative">
                  <input
                    name="q"
                    defaultValue={q}
                    placeholder="Search by booking reference"
                    className="w-full sm:w-64 min-h-[38px] rounded-lg border border-[#E3E0D6] bg-white px-3 py-1.5 text-xs text-[#12262B] placeholder:text-[#4B6560]/70 focus:border-[#0E6B5C] focus:outline-none focus:ring-1 focus:ring-[#0E6B5C]"
                  />
                  {q && (
                    <Link
                      href="/staff"
                      className="absolute right-2 top-2 text-xs text-[#8B9490] hover:text-[#12262B]"
                      title="Clear search"
                    >
                      ✕
                    </Link>
                  )}
                </div>
                <button
                  type="submit"
                  className="min-h-[38px] rounded-lg border border-[#0E6B5C] bg-white px-3 py-1.5 text-xs font-heading font-bold text-[#0E6B5C] hover:bg-[#F3FAF8] active:scale-[0.98] transition"
                >
                  Find
                </button>
              </form>
            </div>

            {/* Empty appointments */}
            {appts.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#E3E0D6] p-6">
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
              /* SCHEDULE TABLE CONTAINER (Exact Layout from Mockup) */
              <div className="rounded-xl border border-[#E3E0D6] bg-white overflow-hidden shadow-2xs">
                {/* Desktop Grid Table */}
                <div className="min-w-[640px]">
                  {/* Table Header Row */}
                  <div className="grid grid-cols-[90px_1fr_1fr_120px_200px] bg-[#F7F5F0] px-4 py-2.5 text-[11px] font-bold text-[#4B6560] uppercase tracking-wider border-b border-[#E3E0D6]">
                    <span>Time</span>
                    <span>Reference</span>
                    <span>Test</span>
                    <span>Status</span>
                    <span>Action</span>
                  </div>

                  {/* Table Rows */}
                  <div className="divide-y divide-[#F0EEE7]">
                    {appts.map((a) => {
                      const testObj = getTest(a.testCode);
                      const testLabel = testObj?.name ?? a.testCode;

                      return (
                        <div
                          key={a.id}
                          className="grid grid-cols-[90px_1fr_1fr_120px_200px] px-4 py-3.5 items-center text-xs hover:bg-[#F3FAF8]/50 transition"
                        >
                          {/* Time */}
                          <span className="font-semibold text-[#12262B]">
                            {lagosTimeOnly(a.slotStart)}
                          </span>

                          {/* Reference */}
                          <div>
                            <span className="font-mono font-bold text-[#12262B]">
                              {a.reference}
                            </span>
                            <span className="block text-[11px] text-[#4B6560]">
                              {a.patientName}
                            </span>
                          </div>

                          {/* Test */}
                          <div>
                            <span className="font-heading font-semibold text-[#12262B]">
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
                                  className="inline-flex items-center justify-center rounded-md bg-[#0E6B5C] px-3.5 py-1.5 text-xs font-heading font-bold text-white shadow-2xs hover:bg-[#0A5347] active:scale-[0.98] transition"
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
                              <span className="text-xs text-[#8B9490]">
                                Awaiting payment
                              </span>
                            )}

                            {/* View details link */}
                            <Link
                              href={`/appointments/${a.id}`}
                              className="text-xs font-semibold text-[#0E6B5C] hover:underline ml-auto"
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
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

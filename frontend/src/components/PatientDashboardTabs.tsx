"use client";

import { useState } from "react";
import Link from "next/link";
import { getTest } from "@riomed/backend/core/catalog";
import { formatNaira } from "@riomed/backend/core/money";
import { lagosDateTime } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";

interface AppointmentItem {
  id: string;
  testCode: string;
  status: string;
  facilityName: string;
  slotStart: Date;
  amountKobo: number;
  reference: string;
  hasResult: boolean;
}

interface PatientDashboardTabsProps {
  appointments: AppointmentItem[];
}

export function PatientDashboardTabs({ appointments }: PatientDashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past" | "results">("upcoming");

  // Upcoming: active statuses or slotStart in future
  const upcomingAppts = appointments.filter(
    (a) => ["CONFIRMED", "HELD", "PENDING_PAYMENT", "CHECKED_IN"].includes(a.status)
  );

  // Past: completed, cancelled, expired
  const pastAppts = appointments.filter(
    (a) => ["COMPLETED", "CANCELLED_BY_PATIENT", "CANCELLED_BY_FACILITY", "EXPIRED", "NO_SHOW"].includes(a.status) ||
           (!["CONFIRMED", "HELD", "PENDING_PAYMENT", "CHECKED_IN"].includes(a.status))
  );

  // Results: anything with hasResult === true or RESULT_AVAILABLE / COMPLETED
  const resultAppts = appointments.filter((a) => a.hasResult || a.status === "RESULT_AVAILABLE");

  const displayedList =
    activeTab === "upcoming"
      ? upcomingAppts
      : activeTab === "past"
      ? pastAppts
      : resultAppts;

  return (
    <div className="space-y-6">
      {/* Tabs matching Design System Mockup 4 */}
      <div className="flex gap-6 border-b border-[#E3E0D6] text-xs sm:text-sm">
        <button
          type="button"
          onClick={() => setActiveTab("upcoming")}
          className={`pb-3 font-heading transition ${
            activeTab === "upcoming"
              ? "font-bold text-[#0A5347] border-b-2 border-[#0A5347]"
              : "text-[#8B9490] hover:text-[#12262B]"
          }`}
        >
          Upcoming ({upcomingAppts.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("past")}
          className={`pb-3 font-heading transition ${
            activeTab === "past"
              ? "font-bold text-[#0A5347] border-b-2 border-[#0A5347]"
              : "text-[#8B9490] hover:text-[#12262B]"
          }`}
        >
          Past ({pastAppts.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("results")}
          className={`pb-3 font-heading transition ${
            activeTab === "results"
              ? "font-bold text-[#0A5347] border-b-2 border-[#0A5347]"
              : "text-[#8B9490] hover:text-[#12262B]"
          }`}
        >
          Results ({resultAppts.length})
        </button>
      </div>

      {/* Content based on Active Tab */}
      {displayedList.length === 0 ? (
        <EmptyState
          title={
            activeTab === "upcoming"
              ? "No upcoming appointments"
              : activeTab === "results"
              ? "No test results ready yet"
              : "No past bookings recorded"
          }
          description={
            activeTab === "results"
              ? "Once a partner laboratory completes testing and uploads your official PDF result, it will appear here."
              : "Search for a test in plain language, pick a time at a partner clinic or lab, and your booking will appear here."
          }
          actionHref="/"
          actionLabel="Find a test or clinic"
        />
      ) : (
        <div className="space-y-3" aria-label="Appointments list">
          {displayedList.map((a) => {
            const testObj = getTest(a.testCode);
            const testLabel = testObj?.name ?? a.testCode;

            return (
              <div
                key={a.id}
                className="rounded-2xl border border-[#E3E0D6] bg-white p-4 sm:p-5 shadow-2xs transition hover:border-[#0E6B5C]/40"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-heading font-bold text-sm sm:text-base text-[#12262B]">
                    {testLabel}
                  </h3>
                  <StatusBadge status={a.status} />
                </div>

                <p className="text-xs sm:text-sm text-[#4B6560]">
                  {a.facilityName} · {lagosDateTime(a.slotStart)}
                  {a.amountKobo > 0 && ` · ${formatNaira(a.amountKobo)}`}
                </p>

                <p className="font-mono text-[11.5px] text-[#8B9490] mt-1">
                  Ref: <strong className="text-[#4B6560]">{a.reference}</strong>
                </p>

                <div className="mt-3 pt-3 border-t border-[#F0EEE7] flex items-center justify-between">
                  {a.hasResult ? (
                    <span className="text-xs font-semibold text-[#0A5347] bg-[#F3FAF8] border border-[#0E6B5C]/30 px-2.5 py-0.5 rounded-full">
                      ✓ Official Result Available
                    </span>
                  ) : (
                    <span className="text-xs text-[#8B9490]">
                      {a.status === "CONFIRMED" ? "Show reference code on arrival" : ""}
                    </span>
                  )}

                  <Link
                    href={`/appointments/${a.id}`}
                    className="inline-flex items-center gap-1 text-xs font-heading font-bold text-[#0E6B5C] hover:underline min-h-[36px]"
                  >
                    View details →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Available Results Quick Section (Design System Mockup 4) */}
      {resultAppts.length > 0 && activeTab !== "results" && (
        <div className="pt-4 space-y-3">
          <h3 className="font-heading font-bold text-sm text-[#0A5347]">
            Recent Results
          </h3>
          <div className="space-y-2">
            {resultAppts.slice(0, 3).map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-[#E3E0D6] bg-white p-3.5 flex items-center justify-between gap-3 shadow-2xs"
              >
                <div>
                  <div className="font-heading font-bold text-xs sm:text-sm text-[#12262B]">
                    {getTest(r.testCode)?.name ?? r.testCode}
                  </div>
                  <div className="text-[11.5px] text-[#4B6560]">
                    Available · {r.facilityName}
                  </div>
                </div>

                <Link
                  href={`/appointments/${r.id}`}
                  className="rounded-lg bg-[#0E6B5C] text-white px-3 py-1.5 text-xs font-heading font-bold hover:bg-[#0A5347] transition shadow-xs shrink-0"
                >
                  Open Result
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Navigation Links matching Design System */}
      <div className="pt-4 border-t border-[#E3E0D6] space-y-2 text-xs font-semibold text-[#0E6B5C]">
        <div>
          <Link href="/audit" className="hover:underline">
            View access log →
          </Link>
        </div>
        <div>
          <Link href="/privacy" className="hover:underline">
            Manage dependants · Export or delete my data →
          </Link>
        </div>
      </div>
    </div>
  );
}

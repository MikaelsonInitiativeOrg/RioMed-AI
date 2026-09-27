import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getFacilityCatalogue } from "@riomed/backend/server/queries";
import { getTest } from "@riomed/backend/core/catalog";
import { formatNaira } from "@riomed/backend/core/money";

export const dynamic = "force-dynamic";

// Tests that need fasting beforehand (shown as preparation). Prices and turnaround come from the database.
const FASTING = new Set(["FBS", "LIPID"]);

export default async function StaffCataloguePage() {
  const actor = await getSessionUser();
  if (!actor) redirect("/demo-login?next=/staff/catalogue");
  const catalogue = await getFacilityCatalogue(actor);
  if (!catalogue) redirect(actor.role === "patient" ? "/dashboard" : "/account?mode=access");
  const { facility } = catalogue;
  const items = catalogue.tests.map((t) => ({ ...t, name: getTest(t.code)?.name ?? t.code, fasting: FASTING.has(t.code) }));

  return (
    <div className="w-full space-y-6 pb-12">
      {/* BROWSER WINDOW WRAPPER (app.riomed.ai/facility/catalogue) */}
      <div className="rounded-2xl border border-[#202124] overflow-hidden shadow-2xl bg-[#202124]">
        {/* macOS Chrome Browser Tab Bar & Controls */}
        <div className="flex items-center h-10 px-3 bg-[#202124] text-[#e8eaed] text-xs select-none">
          <div className="flex items-center gap-2 pr-3">
            <span className="w-3 h-3 rounded-full bg-[#ff5f57] inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#febc2e] inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#28c840] inline-block" />
          </div>

          <div className="flex items-center gap-2 bg-[#35363a] px-3.5 py-1.5 rounded-t-lg text-xs font-medium text-[#e8eaed] border-t border-[#4B6560]/40 max-w-[220px]">
            <span className="w-2 h-2 rounded-full bg-[#8FE0CE]" />
            <span className="truncate">app.riomed.ai/catalogue</span>
          </div>
        </div>

        {/* Browser URL Toolbar */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#35363a] border-b border-[#202124]">
          <div className="flex items-center gap-1.5 text-[#9aa0a6] text-xs">
            <span className="hover:text-white cursor-pointer px-1">‹</span>
            <span className="hover:text-white cursor-pointer px-1">›</span>
            <span className="hover:text-white cursor-pointer px-1">↻</span>
          </div>

          <div className="flex-1 flex items-center gap-2 bg-[#282a2d] px-3 py-1 rounded-full text-xs text-[#e8eaed] font-mono mx-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-[#8FE0CE] shrink-0">
              <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span className="text-[#9aa0a6]">https://</span>
            <span className="text-white">app.riomed.ai/facility/catalogue</span>
          </div>
        </div>

        {/* BROWSER INTERIOR: SIDEBAR + MAIN CONTENT */}
        <div className="flex flex-col md:flex-row min-h-[580px] bg-[#F7F5F0]">
          {/* Left Dark Teal Sidebar */}
          <aside className="w-full md:w-[220px] bg-[#0A5347] text-[#F3FAF8] p-5 flex flex-col justify-between shrink-0">
            <div className="space-y-6">
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
                  <p className="text-[10px] text-[#CDE8E1] truncate">Lagos Desk</p>
                </div>
              </div>

              {/* Navigation */}
              <nav aria-label="Facility Navigation" className="space-y-1">
                <Link
                  href="/staff"
                  className="flex items-center gap-2 text-[#CDE8E1] hover:text-white hover:bg-white/5 text-xs rounded-lg px-3 py-2 transition"
                >
                  <span>📅</span>
                  <span>Today&apos;s schedule</span>
                </Link>

                <Link
                  href="/staff#search"
                  className="flex items-center gap-2 text-[#CDE8E1] hover:text-white hover:bg-white/5 text-xs rounded-lg px-3 py-2 transition"
                >
                  <span>🔍</span>
                  <span>Bookings search</span>
                </Link>

                <Link
                  href="/staff#results"
                  className="flex items-center gap-2 text-[#CDE8E1] hover:text-white hover:bg-white/5 text-xs rounded-lg px-3 py-2 transition"
                >
                  <span>📋</span>
                  <span>Results</span>
                </Link>

                <Link
                  href="/staff/catalogue"
                  className="flex items-center gap-2 bg-white/12 text-white font-heading font-bold text-xs rounded-lg px-3 py-2 transition"
                >
                  <span className="text-[#8FE0CE]">🏷️</span>
                  <span>Catalogue &amp; prices</span>
                </Link>

                <Link
                  href="/staff#staff"
                  className="flex items-center gap-2 text-[#CDE8E1] hover:text-white hover:bg-white/5 text-xs rounded-lg px-3 py-2 transition"
                >
                  <span>👥</span>
                  <span>Staff</span>
                </Link>
              </nav>
            </div>

            <div className="pt-6 border-t border-white/10 text-[11px] text-[#CDE8E1] space-y-1">
              <p>Operator: {actor.name}</p>
              <Link href="/demo-login?next=/staff/catalogue" className="underline hover:text-white">
                Switch profile
              </Link>
            </div>
          </aside>

          {/* Main Catalogue Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-7 overflow-x-auto space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="font-heading font-bold text-xl sm:text-2xl text-[#12262B]">
                  Test Catalogue &amp; Live Pricing
                </h1>
                <p className="text-xs text-[#4B6560] mt-0.5">
                  Published test rates sync immediately with RioMed patient search and AI intent ranking.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#0A5347] bg-[#CDE8E1] px-3 py-1 rounded-full">
                  Demo data
                </span>
              </div>
            </div>

            {/* Catalogue Table */}
            <div className="rounded-xl border border-[#E3E0D6] bg-white overflow-hidden shadow-2xs">
              <div className="min-w-[620px]">
                <div className="grid grid-cols-[1.5fr_110px_90px_100px_90px] bg-[#F7F5F0] px-4 py-2.5 text-[11px] font-bold text-[#4B6560] uppercase tracking-wider border-b border-[#E3E0D6]">
                  <span>Test Name</span>
                  <span>Published Price</span>
                  <span>Turnaround</span>
                  <span>Preparation</span>
                  <span>Status</span>
                </div>

                <div className="divide-y divide-[#F0EEE7]">
                  {items.map((item) => (
                    <div
                      key={item.code}
                      className="grid grid-cols-[1.5fr_110px_90px_100px_90px] px-4 py-3.5 items-center text-xs hover:bg-[#F3FAF8]/40 transition"
                    >
                      <div>
                        <span className="font-heading font-semibold text-[#12262B]">
                          {item.name}
                        </span>
                        <span className="block font-mono text-[10.5px] text-[#8B9490]">
                          code: {item.code}
                        </span>
                      </div>

                      <div className="font-heading font-bold text-[#0A5347]">
                        {formatNaira(item.priceKobo)}
                      </div>

                      <div className="text-[#4B6560]">
                        ~{item.turnaroundHours} hrs
                      </div>

                      <div>
                        {item.fasting ? (
                          <span className="bg-[#FFF4E5] text-[#8A6212] px-2 py-0.5 rounded text-[10.5px] font-semibold">
                            Fasting req.
                          </span>
                        ) : (
                          <span className="text-[#8B9490] text-[11px]">
                            None
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="bg-[#CDE8E1] text-[#0A5347] px-2.5 py-0.5 rounded-full text-[10.5px] font-bold">
                          ACTIVE
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

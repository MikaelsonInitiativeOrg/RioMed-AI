import { FacilityShell } from "@/components/FacilityShell";
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
      <FacilityShell facilityName={facility?.name ?? "Your facility"} operatorName={actor.name} active="catalogue">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="font-heading font-bold text-xl sm:text-2xl text-[#12262B]">
                  Test Catalogue &amp; Live Pricing
                </h1>
                <p className="text-xs text-[#4B6560] mt-0.5">
                  These prices are what patients see in RioMed search and pay at booking.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#0A5347] bg-[#CDE8E1] px-3 py-1 rounded-full">
                  Demo data
                </span>
              </div>
            </div>

            {/* Phones: one card per test */}
            <ul className="lg:hidden divide-y divide-[#F0EEE7] rounded-xl border border-[#E3E0D6] bg-white shadow-2xs">
              {items.map((item) => (
                <li key={item.code} className="p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-heading font-semibold text-sm text-[#12262B]">{item.name}</p>
                    <p className="text-xs text-[#4B6560]">
                      ~{item.turnaroundHours} hrs{item.fasting ? " · fasting required" : ""}
                    </p>
                  </div>
                  <span className="font-heading font-bold text-sm text-[#0A5347] shrink-0">{formatNaira(item.priceKobo)}</span>
                </li>
              ))}
            </ul>

            {/* Catalogue Table */}
            <div className="hidden lg:block rounded-xl border border-[#E3E0D6] bg-white overflow-x-auto shadow-2xs">
              <div className="min-w-[620px]">
                <div className="grid grid-cols-[1.5fr_110px_90px_100px_90px] bg-[#F7F5F0] px-4 py-2.5 text-xs font-bold text-[#4B6560] uppercase tracking-wider border-b border-[#E3E0D6]">
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
                        <span className="block font-mono text-xs text-[#8B9490]">
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
                          <span className="bg-[#FFF4E5] text-[#8A6212] px-2 py-0.5 rounded text-xs font-semibold">
                            Fasting req.
                          </span>
                        ) : (
                          <span className="text-[#8B9490] text-xs">
                            None
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="bg-[#CDE8E1] text-[#0A5347] px-2.5 py-0.5 rounded-full text-xs font-bold">
                          ACTIVE
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
      </FacilityShell>
    </div>
  );
}

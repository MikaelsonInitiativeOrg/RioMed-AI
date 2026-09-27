import Link from "next/link";
import { notFound } from "next/navigation";
import { getTest } from "@riomed/backend/core/catalog";
import { FACILITY_TYPE_LABEL } from "@/lib/format";
import { getFacilityBooking } from "@riomed/backend/server/queries";
import { FacilityBookingFlow } from "@/components/FacilityBookingFlow";

export const dynamic = "force-dynamic";

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function FacilityPage(props: PageProps<"/facility/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const data = await getFacilityBooking(id);
  if (!data) notFound();
  const { facility, tests, slots: bookable } = data;

  const testCode = one(sp.test) || tests[0]?.testCode || "";
  const error = one(sp.error);

  const formattedTests = tests.map((t) => ({
    testCode: t.testCode,
    testName: getTest(t.testCode)?.name ?? t.testCode,
    priceKobo: t.priceKobo,
    turnaroundHours: t.turnaroundHours,
  }));

  const backUrl = `/facility/${id}?test=${encodeURIComponent(testCode)}`;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 pb-16">
      {/* Back button */}
      <div>
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-[#0E6B5C] hover:text-[#0A5347] transition"
        >
          ← Back to search
        </Link>
      </div>

      {/* Facility Header Card */}
      <section className="rounded-2xl border border-[#E3E0D6] bg-white p-5 sm:p-6 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-xl sm:text-2xl font-bold text-[#0A5347]">
                {facility.name}
              </h1>
              {facility.isPartner ? (
                <span className="inline-flex items-center rounded-full bg-[#0E6B5C] px-2.5 py-0.5 text-xs font-bold text-white uppercase tracking-wider">
                  PARTNER CLINIC
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-[#E3E0D6] bg-[#F7F5F0] px-2.5 py-0.5 text-xs font-semibold text-[#4B6560]">
                  Registry Listed
                </span>
              )}
            </div>

            <p className="mt-1 text-xs sm:text-sm text-[#4B6560]">
              {facility.address} · {FACILITY_TYPE_LABEL[facility.type] ?? facility.type} · {facility.ownership === "public" ? "Public" : "Private"}
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-[#F0EEE7] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full border border-[#0E6B5C] bg-[#F3FAF8] px-2.5 py-0.5 text-xs font-semibold text-[#0A5347]">
              ✓ Registry verified
            </span>
            <span className="text-xs text-[#8B9490]">
              NHFR {facility.nhfrId ?? "verified"} · synced {facility.sourceSyncedAt.toISOString().slice(0, 10)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {facility.phone && (
              <a
                href={`tel:${facility.phone.replace(/\s/g, "")}`}
                className="inline-flex min-h-[44px] items-center rounded-xl border border-[#0E6B5C] px-3.5 py-1 text-sm font-bold text-[#0E6B5C] hover:bg-[#F3FAF8] transition"
              >
                Call {facility.phone}
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Booking Error Banner */}
      {error && (
        <div role="alert" className="rounded-2xl border border-[#FBE9E7] bg-[#FBE9E7] p-4 text-sm text-[#8A251C]">
          <p className="font-semibold">{error}</p>
        </div>
      )}

      {/* Booking Flow or Non-Partner Notice */}
      {!facility.isPartner ? (
        <div className="rounded-2xl border border-[#E3E0D6] bg-white p-6 text-sm text-[#4B6560] space-y-3">
          <p className="font-bold text-[#12262B]">Online booking not available</p>
          <p>
            This facility is listed in the National Health Facility Registry (NHFR) for discovery, but does not yet accept automated slot bookings through RioMed. {facility.phone && <>Call {facility.phone} to inquire about appointments.</>}
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#0E6B5C] px-5 py-2.5 text-xs sm:text-sm font-heading font-bold text-white hover:bg-[#0A5347]"
            >
              Search Partner Clinics
            </Link>
          </div>
        </div>
      ) : (
        <FacilityBookingFlow
          facilityId={id}
          tests={formattedTests}
          slots={bookable}
          initialTestCode={testCode}
          backUrl={backUrl}
        />
      )}
    </div>
  );
}

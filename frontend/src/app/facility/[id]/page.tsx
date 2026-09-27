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
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-strong transition"
        >
          ← Back to search
        </Link>
      </div>

      {/* Facility Header Card */}
      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-xl sm:text-2xl font-bold text-primary-strong">
                {facility.name}
              </h1>
              {facility.isPartner ? (
                <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-white uppercase tracking-wider">
                  PARTNER CLINIC
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                  Registry Listed
                </span>
              )}
            </div>

            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              {facility.address} · {FACILITY_TYPE_LABEL[facility.type] ?? facility.type} · {facility.ownership === "public" ? "Public" : "Private"}
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-border-soft flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            {facility.source === "self_registered" ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning-soft px-2.5 py-0.5 text-xs font-semibold text-warning-foreground">
                Self-registered on {facility.sourceSyncedAt.toISOString().slice(0, 10)} · not yet verified
              </span>
            ) : (
              <>
                <span className="inline-flex items-center gap-1 rounded-full border border-subtle-foreground/50 bg-background px-2.5 py-0.5 text-xs font-semibold text-primary-strong">
                  Registry record (demo)
                </span>
                <span className="text-xs text-subtle-foreground">
                  NHFR record {facility.nhfrId ?? "none"} · demo data
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {facility.phone && (
              <a
                href={`tel:${facility.phone.replace(/\s/g, "")}`}
                className="inline-flex min-h-[44px] items-center rounded-xl border border-primary px-3.5 py-1 text-sm font-bold text-primary hover:bg-primary-soft transition"
              >
                Call {facility.phone}
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Booking Error Banner */}
      {error && (
        <div role="alert" className="rounded-2xl border border-danger-soft bg-danger-soft p-4 text-sm text-danger-foreground">
          <p className="font-semibold">{error}</p>
        </div>
      )}

      {/* Booking Flow or Non-Partner Notice */}
      {!facility.isPartner ? (
        <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-muted-foreground space-y-3">
          <p className="font-bold text-foreground">Online booking not available</p>
          <p>
            This facility is listed in the National Health Facility Registry (NHFR) for discovery, but does not yet accept automated slot bookings through RioMed. {facility.phone && <>Call {facility.phone} to inquire about appointments.</>}
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-xs sm:text-sm font-heading font-bold text-white hover:bg-primary-strong"
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

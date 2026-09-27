import Link from "next/link";
import { formatNaira } from "@riomed/backend/core/money";
import { FACILITY_TYPE_LABEL, lagosTimeOnly } from "@/lib/format";
import type { Found } from "@riomed/backend/server/search";

interface FacilityCardProps {
  facility: Found["results"][number];
  testCode?: string;
  window?: { start: Date; end: Date } | null;
}

export function FacilityCard({ facility: r, testCode, window }: FacilityCardProps) {
  const bookHref = `/facility/${r.id}?test=${encodeURIComponent(testCode ?? "")}${
    window ? `&from=${window.start.toISOString()}&to=${window.end.toISOString()}` : ""
  }`;

  return (
    <article
      className={`rounded-2xl border border-[#E3E0D6] bg-white p-4 sm:p-5 shadow-xs transition hover:border-[#0E6B5C]/40 ${
        !r.isPartner ? "opacity-90" : ""
      }`}
    >
      {/* Top row: Name & Partner Tag */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-heading font-bold text-base sm:text-lg text-[#12262B]">
            {r.name}
          </h3>
          <p className="mt-0.5 text-xs text-[#4B6560]">
            {FACILITY_TYPE_LABEL[r.type] ?? r.type} · {r.address} · {r.distanceKm.toFixed(1)} km
          </p>
        </div>

        <div>
          {r.isPartner ? (
            <span className="inline-flex items-center rounded-full bg-[#0E6B5C] px-2.5 py-0.5 text-xs font-bold tracking-wider text-white uppercase">
              PARTNER
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-[#E3E0D6] bg-[#F7F5F0] px-2.5 py-0.5 text-xs font-semibold text-[#4B6560]">
              Listed only
            </span>
          )}
        </div>
      </div>

      {/* Registry Verification Line */}
      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full border border-[#8B9490]/50 bg-[#F7F5F0] px-2.5 py-0.5 text-xs font-semibold text-[#0A5347]">
          Registry record (demo)
        </span>
        <span className="text-xs text-[#8B9490]">
          NHFR record {r.nhfrId ?? "none"} · <span className="font-medium text-[#4B6560]">demo data</span>
        </span>
      </div>

      {/* Bottom Action Section */}
      <div className="mt-3 pt-3 border-t border-[#F0EEE7]">
        {r.isPartner ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs sm:text-sm text-[#12262B]">
              {testCode && r.offersTests ? (
                <span>
                  <strong className="font-bold text-base text-[#0A5347]">
                    {r.minPriceKobo != null ? formatNaira(r.minPriceKobo) : "Price on request"}
                  </strong>
                  {" "}· next slot{" "}
                  <strong>{r.nextSlot ? lagosTimeOnly(r.nextSlot) : "None in window"}</strong>
                </span>
              ) : testCode && !r.offersTests ? (
                <span className="text-[#C98A1D] font-medium">Doesn&apos;t offer all requested tests</span>
              ) : (
                <span>
                  next slot <strong>{r.nextSlot ? lagosTimeOnly(r.nextSlot) : "None in window"}</strong>
                </span>
              )}
            </div>

            {r.offersTests && (
              <div>
                <Link
                  href={bookHref}
                  className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center rounded-xl bg-[#0E6B5C] px-5 py-2.5 text-xs sm:text-sm font-heading font-bold text-white shadow-xs hover:bg-[#0A5347] active:scale-[0.98] transition"
                >
                  Book
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl bg-[#F7F5F0] border border-[#E3E0D6] p-3 text-xs text-[#4B6560]">
            <p className="font-medium text-[#12262B]">
              Listed in registry, booking not available.
            </p>
            {r.phone && (
              <p className="mt-1">
                Contact facility:{" "}
                <a
                  className="font-bold text-[#0E6B5C] underline hover:text-[#0A5347] min-h-[44px] inline-flex items-center"
                  href={`tel:${r.phone.replace(/\s/g, "")}`}
                >
                  Call {r.phone}
                </a>
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

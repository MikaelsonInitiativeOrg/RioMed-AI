import Link from "next/link";
import { BadgeCheck, Clock, MapPin, Phone } from "lucide-react";
import { formatNaira } from "@riomed/backend/core/money";
import { FACILITY_TYPE_LABEL, lagosDateTime } from "@/lib/format";
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
  const bookable = r.isPartner && r.offersTests;

  return (
    <article className="rounded-xl border border-border bg-surface p-4 shadow-sm transition-colors duration-150 hover:border-primary/40 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-bold leading-snug text-foreground">{r.name}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
            <span>{FACILITY_TYPE_LABEL[r.type] ?? r.type}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {r.distanceKm < 1 ? `${Math.round(r.distanceKm * 1000)} m` : `${r.distanceKm.toFixed(1)} km`}
            </span>
          </p>
          <p className="mt-0.5 truncate text-sm text-subtle-foreground">{r.address}</p>
        </div>
        {r.isPartner ? (
          <span className="shrink-0 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary-strong">Books online</span>
        ) : (
          <span className="shrink-0 rounded-full bg-border-soft px-2.5 py-1 text-xs font-bold text-muted-foreground">Listed only</span>
        )}
      </div>

      {/* Where the record comes from: never claim a verification that didn't happen */}
      <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-subtle-foreground">
        <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
        {r.source === "self_registered" ? (
          <span className="font-bold text-warning-foreground">Self-registered · not yet verified</span>
        ) : (
          <span>Registry record (demo data){r.nhfrId ? ` · NHFR ${r.nhfrId}` : ""}</span>
        )}
      </p>

      <div className="mt-4 flex flex-col gap-3 border-t border-border-soft pt-4 sm:flex-row sm:items-center sm:justify-between">
        {r.isPartner ? (
          <div className="text-sm text-muted-foreground">
            {testCode && !r.offersTests ? (
              <span className="font-bold text-warning-foreground">Doesn&apos;t offer all the tests you asked for</span>
            ) : (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {testCode && (
                  <span className="text-xl font-bold text-foreground">
                    {r.minPriceKobo != null ? formatNaira(r.minPriceKobo) : "Price on request"}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-primary" aria-hidden />
                  {r.nextSlot ? <>Next: <strong className="text-foreground">{lagosDateTime(r.nextSlot)}</strong></> : "No open slot in this window"}
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Online booking isn&apos;t available here yet.</p>
        )}

        {bookable ? (
          <Link
            href={bookHref}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-primary px-6 text-sm font-bold text-white shadow-sm transition-colors duration-150 hover:bg-primary-strong sm:w-auto"
          >
            Book
          </Link>
        ) : (
          !r.isPartner &&
          r.phone && (
            <a
              href={`tel:${r.phone.replace(/\s/g, "")}`}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-border-strong px-5 text-sm font-bold text-primary transition-colors duration-150 hover:bg-primary-soft sm:w-auto"
            >
              <Phone className="h-4 w-4" aria-hidden />
              Call {r.phone}
            </a>
          )
        )}
      </div>
    </article>
  );
}

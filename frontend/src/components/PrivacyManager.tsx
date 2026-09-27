import { Download } from "lucide-react";
/**
 * Privacy controls. Only what actually works is offered: data export is real.
 * Dependants and deletion aren't built yet, so they are shown as "coming soon" rather than faked.
 */
function ComingSoon() {
  return <span className="rounded-full bg-border-soft px-2.5 py-0.5 text-xs font-bold uppercase text-muted-foreground">Coming soon</span>;
}

export function PrivacyManager() {
  return (
    <div className="space-y-6">
      {/* 1. DATA EXPORT (PORTABILITY) */}
      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-2xs space-y-3">
        <h2 className="font-heading font-bold text-base sm:text-lg text-primary-strong">Download your data</h2>
        <p className="text-xs text-muted-foreground">
          Get a copy of your account, bookings and access history as a file (JSON). Result PDFs are downloaded from each booking.
        </p>
        <a
          href="/api/me/export"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary px-5 py-2 text-xs font-heading font-bold text-white shadow-xs hover:bg-primary-strong transition"
        >
          <Download className="h-4 w-4" aria-hidden /> Download my data (JSON)
        </a>
      </section>

      {/* 2. DEPENDANTS */}
      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-2xs space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="font-heading font-bold text-base sm:text-lg text-primary-strong">Family dependants</h2>
          <ComingSoon />
        </div>
        <p className="text-xs text-muted-foreground">
          Booking for children or elderly relatives under your account is planned. The consent and age rules are still being decided (PRD Q6).
        </p>
      </section>

      {/* 3. DATA DELETION */}
      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-2xs space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="font-heading font-bold text-base sm:text-lg text-danger-foreground">Delete my account</h2>
          <ComingSoon />
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Self-service deletion isn&apos;t built yet. How long results and audit records must be kept is still being decided (PRD section 11.5). This demo holds synthetic data only.
        </p>
      </section>
    </div>
  );
}

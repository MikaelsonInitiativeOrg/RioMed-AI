/**
 * Privacy controls. Only what actually works is offered: data export is real.
 * Dependants and deletion aren't built yet, so they are shown as "coming soon" rather than faked.
 */
function ComingSoon() {
  return <span className="rounded-full bg-[#F0EEE7] px-2.5 py-0.5 text-xs font-bold uppercase text-[#4B6560]">Coming soon</span>;
}

export function PrivacyManager() {
  return (
    <div className="space-y-6">
      {/* 1. DATA EXPORT (PORTABILITY) */}
      <section className="rounded-2xl border border-[#E3E0D6] bg-white p-5 sm:p-6 shadow-2xs space-y-3">
        <h2 className="font-heading font-bold text-base sm:text-lg text-[#0A5347]">Download your data</h2>
        <p className="text-xs text-[#4B6560]">
          Get a copy of your account, bookings and access history as a file (JSON). Result PDFs are downloaded from each booking.
        </p>
        <a
          href="/api/me/export"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#0E6B5C] px-5 py-2 text-xs font-heading font-bold text-white shadow-xs hover:bg-[#0A5347] transition"
        >
          📥 Download my data (JSON)
        </a>
      </section>

      {/* 2. DEPENDANTS */}
      <section className="rounded-2xl border border-[#E3E0D6] bg-white p-5 sm:p-6 shadow-2xs space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="font-heading font-bold text-base sm:text-lg text-[#0A5347]">Family dependants</h2>
          <ComingSoon />
        </div>
        <p className="text-xs text-[#4B6560]">
          Booking for children or elderly relatives under your account is planned. The consent and age rules are still being decided (PRD Q6).
        </p>
      </section>

      {/* 3. DATA DELETION */}
      <section className="rounded-2xl border border-[#E3E0D6] bg-white p-5 sm:p-6 shadow-2xs space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="font-heading font-bold text-base sm:text-lg text-[#8A251C]">Delete my account</h2>
          <ComingSoon />
        </div>
        <p className="text-xs text-[#4B6560] leading-relaxed">
          Self-service deletion isn&apos;t built yet. How long results and audit records must be kept is still being decided (PRD section 11.5). This demo holds synthetic data only.
        </p>
      </section>
    </div>
  );
}

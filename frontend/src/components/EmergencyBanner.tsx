import { RED_FLAG_STATUS } from "@riomed/backend/core/intent";

/** AI-020: shown before any results when a red-flag phrase is detected. */
export function EmergencyBanner({ matched }: { matched: string[] }) {
  const phrases = matched.filter((m) => m !== "detector-error" && m !== "ai-flagged");

  return (
    <section
      role="alert"
      aria-live="assertive"
      className="overflow-hidden rounded-2xl bg-[#C1352B] p-5 text-white shadow-md space-y-3"
    >
      <div>
        <h2 className="font-heading text-lg sm:text-xl font-bold tracking-tight">
          This may be a medical emergency
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-[#FBE9E7] leading-relaxed">
          Call the national emergency number now, or go to the nearest emergency department. Do not wait for a booking.
        </p>
      </div>

      <div className="pt-1">
        <a
          href="tel:112"
          className="inline-flex min-h-[48px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-heading font-extrabold text-[#C1352B] text-base shadow-sm hover:bg-[#FBE9E7] active:scale-[0.98] transition"
          aria-label="Call emergency services at 112"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
          </svg>
          Call 112
        </a>
      </div>

      <div className="pt-2 border-t border-white/20 text-xs text-[#FBE9E7] space-y-1">
        <p>
          We showed this because your message {phrases.length ? <>mentioned: <span className="font-semibold text-white">{phrases.join(", ")}</span></> : "sounded like a possible emergency"}. Hospitals nearby are listed below.
        </p>
        <p className="font-bold text-white text-xs">
          {RED_FLAG_STATUS === "draft-pending-clinician-review"
            ? "Draft red-flag list — pending clinician review"
            : "✓ Red-flag list reviewed by clinician"}
        </p>
      </div>
    </section>
  );
}

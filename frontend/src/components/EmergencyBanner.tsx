import { RED_FLAG_STATUS } from "@riomed/backend/core/intent";

/** AI-020: shown before any results when a red-flag phrase is detected. */
export function EmergencyBanner({ matched }: { matched: string[] }) {
  return (
    <section role="alert" className="rounded-xl border-2 border-red-600 bg-red-50 p-4 text-red-900">
      <h2 className="text-lg font-bold">This may be an emergency</h2>
      <p className="mt-1">
        Call <a href="tel:112" className="font-bold underline">112</a> now, or go to the nearest hospital emergency department. Do not wait for a booking.
      </p>
      <a href="tel:112" className="mt-3 inline-block rounded-lg bg-red-700 px-5 py-3 font-semibold text-white">Call 112</a>
      <p className="mt-3 text-xs text-red-800">
        We showed this because your message mentioned: {matched.filter((m) => m !== "detector-error").join(", ") || "a possible emergency"}. Hospitals nearby are listed below.
        {RED_FLAG_STATUS === "draft-pending-clinician-review" && " (Red-flag list: draft, pending clinician review.)"}
      </p>
    </section>
  );
}

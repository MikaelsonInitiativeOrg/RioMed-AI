import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTest } from "@riomed/backend/core/catalog";
import { formatNaira } from "@riomed/backend/core/money";
import { cancelAction, payAction } from "@/app/actions";
import { lagosDateTime } from "@/lib/format";
import { resultLink } from "@riomed/backend/server/auth";
import { getAppointmentForActor } from "@riomed/backend/server/queries";
import { paystackEnabled } from "@riomed/backend/server/paystack";
import { getSessionUser } from "@/lib/session";
import { StatusBadge } from "@/components/StatusBadge";
import { HoldCountdown } from "@/components/HoldCountdown";

export const dynamic = "force-dynamic";

export default async function AppointmentPage(props: PageProps<"/appointments/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const actor = await getSessionUser();
  if (!actor) redirect(`/demo-login?next=/appointments/${id}`);
  const a = await getAppointmentForActor(actor, id);
  if (!a) notFound(); // not found or not allowed: don't reveal which
  const unpaid = a.status === "HELD" || a.status === "PENDING_PAYMENT";
  const error = typeof sp.error === "string" ? sp.error : sp.payment === "failed" ? "Payment was not confirmed. You can try again while your hold lasts." : null;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 pb-16">
      {/* Back link */}
      <div>
        <Link
          href={actor.role === "patient" ? "/dashboard" : "/staff"}
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-[#0E6B5C] hover:text-[#0A5347] transition"
        >
          ← Back to {actor.role === "patient" ? "Dashboard" : "Facility Desk"}
        </Link>
      </div>

      {/* Main Appointment Pass */}
      <section className="rounded-2xl border border-[#E3E0D6] bg-white p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F0EEE7]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#4B6560]">
              Booking reference
            </p>
            <p className="text-2xl sm:text-3xl font-mono font-bold tracking-wider text-[#0A5347]">
              {a.reference}
            </p>
          </div>
          <div>
            <StatusBadge status={a.status} />
          </div>
        </div>

        {/* Key Appointment Details */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm py-1.5 border-b border-[#F0EEE7]">
            <span className="text-[#4B6560]">Test</span>
            <span className="font-bold text-[#12262B]">{getTest(a.testCode)?.name ?? a.testCode}</span>
          </div>

          <div className="flex justify-between items-center text-sm py-1.5 border-b border-[#F0EEE7]">
            <span className="text-[#4B6560]">Facility</span>
            <span className="font-semibold text-[#12262B] text-right">{a.facility.name}</span>
          </div>

          <div className="flex justify-between items-start text-sm py-1.5 border-b border-[#F0EEE7]">
            <span className="text-[#4B6560]">Address</span>
            <span className="text-xs text-[#4B6560] text-right max-w-xs">{a.facility.address}</span>
          </div>

          <div className="flex justify-between items-center text-sm py-1.5 border-b border-[#F0EEE7]">
            <span className="text-[#4B6560]">Scheduled time</span>
            <span className="font-semibold text-[#12262B]">{lagosDateTime(a.slotStart)}</span>
          </div>

          <div className="flex justify-between items-center text-sm pt-2 font-bold">
            <span className="text-[#12262B] text-base">Total amount</span>
            <span className="text-xl font-heading font-extrabold text-[#0A5347]">
              {formatNaira(a.amountKobo)}
            </span>
          </div>

          {a.paidWith && (
            <p className="text-xs text-[#4B6560] text-right">
              Paid with {a.paidWith === "simulated" ? "simulated payment" : "Paystack test mode"}
            </p>
          )}
        </div>
      </section>

      {/* Error alert */}
      {error && (
        <div role="alert" className="rounded-2xl border border-[#FBE9E7] bg-[#FBE9E7] p-4 text-sm text-[#8A251C]">
          <p className="font-semibold">{error}</p>
        </div>
      )}

      {/* Unpaid / Hold Action Box with Live Countdown */}
      {unpaid && a.isOwner && (
        <section className="space-y-4">
          <HoldCountdown expiresAt={a.holdExpiresAt} />

          <div className="space-y-2">
            <form action={payAction}>
              <input type="hidden" name="appointmentId" value={a.id} />
              <button
                type="submit"
                className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[#D96B33] px-5 py-3 text-base font-heading font-bold text-white shadow-xs hover:bg-[#c45e2a] active:scale-[0.98] transition"
              >
                Pay {formatNaira(a.amountKobo)} {paystackEnabled() ? "with Paystack (test mode)" : "(simulated payment)"}
              </button>
            </form>

            <form action={cancelAction}>
              <input type="hidden" name="appointmentId" value={a.id} />
              <button
                type="submit"
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-[#E3E0D6] bg-white px-5 py-2.5 text-xs sm:text-sm font-semibold text-[#4B6560] hover:bg-[#F7F5F0] transition"
              >
                Cancel and release this slot
              </button>
            </form>
          </div>
        </section>
      )}

      {/* Specific Status Messaging */}
      {a.status === "EXPIRED" && (
        <div className="rounded-2xl border border-[#C98A1D]/30 bg-[#FFF4E5] p-4 text-sm text-[#8A6212] space-y-1">
          <p className="font-bold">Hold expired</p>
          <p>
            This hold expired and the slot was released.{" "}
            <Link className="font-bold underline" href={`/facility/${a.facility.id}?test=${a.testCode}`}>
              Pick another time
            </Link>.
          </p>
        </div>
      )}

      {a.status === "REFUNDED" && (
        <div className="rounded-2xl border border-[#C98A1D]/30 bg-[#FFF4E5] p-4 text-sm text-[#8A6212]">
          <p className="font-bold">Payment refunded</p>
          <p className="mt-0.5">
            Your payment arrived after the slot was taken, so a full refund has been started.
          </p>
        </div>
      )}

      {a.status === "CONFIRMED" && (
        <div className="rounded-2xl border border-[#0E6B5C]/30 bg-[#F3FAF8] p-4 text-sm text-[#0A5347]">
          <p className="font-bold">Show this reference at the front desk</p>
          <p className="mt-0.5 text-xs sm:text-sm text-[#4B6560]">
            The clinic receptionist will verify reference <strong className="font-mono text-[#0A5347]">{a.reference}</strong> and check you in. Results will be uploaded directly to your RioMed account.
          </p>
        </div>
      )}

      {/* Results Vault Section */}
      {a.results.length > 0 && (
        <section className="rounded-2xl border border-[#E3E0D6] bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base sm:text-lg font-bold text-[#0A5347]">
              Laboratory Results
            </h2>
            <Link
              href={`/appointments/${a.id}/result`}
              className="rounded-lg bg-[#0E6B5C] text-white px-3.5 py-1.5 text-xs font-heading font-bold hover:bg-[#0A5347] transition shadow-xs"
            >
              Open Result Viewer →
            </Link>
          </div>

          <div className="rounded-xl bg-[#FFF4E5] text-[#8A6212] p-3 text-xs font-semibold">
            This link expires in 5 minutes
          </div>

          <ul className="space-y-3">
            {a.results.map((r) => (
              <li
                key={r.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[#E3E0D6] bg-[#F7F5F0] p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#12262B]">
                      Version {r.version}
                    </span>
                    {r.superseded && (
                      <span className="text-[10px] font-semibold text-[#4B6560] bg-[#E3E0D6] px-1.5 py-0.5 rounded">
                        superseded
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#4B6560] mt-0.5">
                    Uploaded {lagosDateTime(r.uploadedAt)}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/appointments/${a.id}/result`}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#0E6B5C] bg-white px-4 py-2 text-xs font-heading font-bold text-[#0E6B5C] hover:bg-[#F3FAF8] transition"
                  >
                    View Report
                  </Link>
                  <a
                    href={resultLink(r.id)}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#0E6B5C] px-4 py-2 text-xs font-heading font-bold text-white shadow-xs hover:bg-[#0A5347] transition"
                  >
                    Download PDF
                  </a>
                </div>
              </li>
            ))}
          </ul>

          <div className="pt-2 text-xs text-[#8B9490] leading-relaxed">
            Links expire after 5 minutes, and every view is logged. RioMed doesn&apos;t interpret results. Discuss them with your clinician.
          </div>
        </section>
      )}
    </div>
  );
}

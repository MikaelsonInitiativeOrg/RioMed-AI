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
import { AddToCalendar } from "@/components/AddToCalendar";

export const dynamic = "force-dynamic";

export default async function AppointmentPage(props: PageProps<"/appointments/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const actor = await getSessionUser();
  if (!actor) redirect(`/account?mode=access&next=/appointments/${id}`);
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
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-strong transition"
        >
          ← Back to {actor.role === "patient" ? "Dashboard" : "Facility Desk"}
        </Link>
      </div>

      {/* Main Appointment Pass */}
      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border-soft">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Booking reference
            </p>
            <p className="text-2xl sm:text-3xl font-mono font-bold tracking-wider text-primary-strong">
              {a.reference}
            </p>
          </div>
          <div>
            <StatusBadge status={a.status} />
          </div>
        </div>

        {/* Key Appointment Details */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm py-1.5 border-b border-border-soft">
            <span className="text-muted-foreground">Test</span>
            <span className="font-bold text-foreground">{getTest(a.testCode)?.name ?? a.testCode}</span>
          </div>

          <div className="flex justify-between items-center text-sm py-1.5 border-b border-border-soft">
            <span className="text-muted-foreground">Facility</span>
            <span className="font-semibold text-foreground text-right">{a.facility.name}</span>
          </div>

          <div className="flex justify-between items-start text-sm py-1.5 border-b border-border-soft">
            <span className="text-muted-foreground">Address</span>
            <span className="text-xs text-muted-foreground text-right max-w-xs">{a.facility.address}</span>
          </div>

          <div className="flex justify-between items-center text-sm py-1.5 border-b border-border-soft">
            <span className="text-muted-foreground">Scheduled time</span>
            <span className="font-semibold text-foreground">{lagosDateTime(a.slotStart)}</span>
          </div>

          <div className="flex justify-between items-center text-sm pt-2 font-bold">
            <span className="text-foreground text-base">Total amount</span>
            <span className="text-xl font-heading font-extrabold text-primary-strong">
              {formatNaira(a.amountKobo)}
            </span>
          </div>

          {a.paidWith && (
            <p className="text-xs text-muted-foreground text-right">
              Paid with {a.paidWith === "simulated" ? "simulated payment" : "Paystack test mode"}
            </p>
          )}
        </div>
      </section>

      {/* Error alert */}
      {error && (
        <div role="alert" className="rounded-2xl border border-danger-soft bg-danger-soft p-4 text-sm text-danger-foreground">
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
                className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-accent px-5 py-3 text-base font-heading font-bold text-white shadow-xs hover:bg-accent active:scale-[0.98] transition"
              >
                Pay {formatNaira(a.amountKobo)} {paystackEnabled() ? "with Paystack (test mode)" : "(simulated payment)"}
              </button>
            </form>

            <form action={cancelAction}>
              <input type="hidden" name="appointmentId" value={a.id} />
              <button
                type="submit"
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-border bg-surface px-5 py-2.5 text-xs sm:text-sm font-semibold text-muted-foreground hover:bg-background transition"
              >
                Cancel and release this slot
              </button>
            </form>
          </div>
        </section>
      )}

      {/* Specific Status Messaging */}
      {a.status === "EXPIRED" && (
        <div className="rounded-2xl border border-warning/30 bg-warning-soft p-4 text-sm text-warning-foreground space-y-1">
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
        <div className="rounded-2xl border border-warning/30 bg-warning-soft p-4 text-sm text-warning-foreground">
          <p className="font-bold">Payment refunded</p>
          <p className="mt-0.5">
            Your payment arrived after the slot was taken, so a full refund has been started.
          </p>
        </div>
      )}

      {a.status === "CONFIRMED" && (
        <div className="rounded-2xl border border-primary/30 bg-primary-soft p-4 text-sm text-primary-strong">
          <p className="font-bold">Show this reference at the front desk</p>
          <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
            The clinic receptionist will verify reference <strong className="font-mono text-primary-strong">{a.reference}</strong> and check you in. Results will be uploaded directly to your RioMed account.
          </p>
        </div>
      )}

      {/* Add to calendar (useless once the booking is dead) */}
      {!["EXPIRED", "CANCELLED_BY_PATIENT", "CANCELLED_BY_FACILITY", "NO_SHOW", "REFUNDED"].includes(a.status) && (
        <AddToCalendar
          reference={a.reference}
          facilityName={a.facility.name}
          address={a.facility.address}
          testName={getTest(a.testCode)?.name ?? a.testCode}
          startISO={a.slotStart.toISOString()}
          endISO={a.slotEnd.toISOString()}
          tentative={a.status === "HELD" || a.status === "PENDING_PAYMENT"}
        />
      )}

      {/* Results Vault Section */}
      {a.results.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base sm:text-lg font-bold text-primary-strong">
              Laboratory Results
            </h2>
            <Link
              href={`/appointments/${a.id}/result`}
              className="inline-flex min-h-[44px] items-center rounded-lg bg-primary text-white px-4 text-sm font-heading font-bold hover:bg-primary-strong transition shadow-xs"
            >
              Open Result Viewer →
            </Link>
          </div>

          <div className="rounded-xl bg-warning-soft text-warning-foreground p-3 text-xs font-semibold">
            This link expires in 5 minutes
          </div>

          <ul className="space-y-3">
            {a.results.map((r) => (
              <li
                key={r.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-background p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">
                      Version {r.version}
                    </span>
                    {r.superseded && (
                      <span className="text-xs font-semibold text-muted-foreground bg-border px-1.5 py-0.5 rounded">
                        superseded
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Uploaded {lagosDateTime(r.uploadedAt)}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/appointments/${a.id}/result`}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-primary bg-surface px-4 py-2 text-xs font-heading font-bold text-primary hover:bg-primary-soft transition"
                  >
                    View Report
                  </Link>
                  <a
                    href={resultLink(r.id)}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary px-4 py-2 text-xs font-heading font-bold text-white shadow-xs hover:bg-primary-strong transition"
                  >
                    Download PDF
                  </a>
                </div>
              </li>
            ))}
          </ul>

          <div className="pt-2 text-xs text-subtle-foreground leading-relaxed">
            Links expire after 5 minutes, and every view is logged. RioMed doesn&apos;t interpret results. Discuss them with your clinician.
          </div>
        </section>
      )}
    </div>
  );
}

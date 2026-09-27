import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTest } from "@riomed/backend/core/catalog";
import { formatNaira } from "@riomed/backend/core/money";
import { cancelAction, payAction } from "@/app/actions";
import { STATUS_LABEL, lagosDateTime, lagosTimeOnly } from "@/lib/format";
import { resultLink } from "@riomed/backend/server/auth";
import { getAppointmentForActor } from "@riomed/backend/server/queries";
import { paystackEnabled } from "@riomed/backend/server/paystack";
import { getSessionUser } from "@/lib/session";

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
    <div className="space-y-4">
      <Link href={actor.role === "patient" ? "/dashboard" : "/staff"} className="text-sm text-emerald-800 hover:underline">← Back</Link>
      <section className="rounded-xl bg-white border border-emerald-900/10 p-5">
        <p className="text-xs uppercase tracking-wide text-slate-500">Booking reference</p>
        <p className="text-3xl font-mono font-bold tracking-wider text-emerald-900">{a.reference}</p>
        <p className="mt-2 inline-block rounded-full bg-emerald-100 px-3 py-0.5 text-sm font-medium text-emerald-900">{STATUS_LABEL[a.status] ?? a.status}</p>
        <dl className="mt-4 grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-slate-500">Test</dt><dd>{getTest(a.testCode)?.name ?? a.testCode}</dd>
          <dt className="text-slate-500">Where</dt><dd>{a.facility.name}, {a.facility.address}</dd>
          <dt className="text-slate-500">When</dt><dd>{lagosDateTime(a.slotStart)}</dd>
          <dt className="text-slate-500">Amount</dt><dd>{formatNaira(a.amountKobo)}{a.paidWith && <> · paid ({a.paidWith === "simulated" ? "simulated" : "Paystack test"})</>}</dd>
        </dl>
      </section>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      {unpaid && a.isOwner && (
        <section className="rounded-xl bg-white border border-emerald-900/10 p-5 space-y-3">
          <p className="text-sm">Your slot is held until <strong>{lagosTimeOnly(a.holdExpiresAt)}</strong>. Pay to confirm it.</p>
          <form action={payAction}>
            <input type="hidden" name="appointmentId" value={a.id} />
            <button className="w-full rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800">
              Pay {formatNaira(a.amountKobo)} {paystackEnabled() ? "with Paystack (test mode)" : "(simulated payment)"}
            </button>
          </form>
          <form action={cancelAction}>
            <input type="hidden" name="appointmentId" value={a.id} />
            <button className="w-full rounded-xl border border-slate-300 px-5 py-2 text-sm">Cancel and release this slot</button>
          </form>
        </section>
      )}

      {a.status === "EXPIRED" && <p className="rounded-lg bg-amber-50 p-3 text-sm">This hold expired and the slot was released. <Link className="underline" href={`/facility/${a.facility.id}?test=${a.testCode}`}>Pick another time</Link>.</p>}
      {a.status === "REFUNDED" && <p className="rounded-lg bg-amber-50 p-3 text-sm">Your payment arrived after the slot was taken, so a full refund has been started.</p>}
      {a.status === "CONFIRMED" && <p className="rounded-lg bg-emerald-50 p-3 text-sm">Show this reference at the front desk. We&apos;ll send your result here when it&apos;s ready.</p>}

      {a.results.length > 0 && (
        <section className="rounded-xl bg-white border border-emerald-900/10 p-5">
          <h2 className="font-semibold">Results</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {a.results.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2">
                <span>
                  Version {r.version}{r.superseded ? " (replaced)" : ""} · {lagosDateTime(r.uploadedAt)}
                </span>
                <a href={resultLink(r.id)} target="_blank" rel="noopener" className="rounded-lg bg-emerald-700 px-3 py-1.5 text-white">
                  Open PDF
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">Links expire after 5 minutes, and every view is logged. RioMed doesn&apos;t interpret results. Discuss them with your clinician.</p>
        </section>
      )}
    </div>
  );
}

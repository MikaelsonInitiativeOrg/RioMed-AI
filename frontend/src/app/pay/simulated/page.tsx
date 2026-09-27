import { notFound } from "next/navigation";
import { formatNaira } from "@riomed/backend/core/money";
import { simulatedPayAction } from "@/app/actions";
import { getSimulatedPayment } from "@riomed/backend/server/queries";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Shown only when no Paystack test key is configured. Clearly labelled; no money moves. */
export default async function SimulatedPay(props: PageProps<"/pay/simulated">) {
  const sp = await props.searchParams;
  const reference = typeof sp.reference === "string" ? sp.reference : "";
  const actor = await getSessionUser();
  const p = await getSimulatedPayment(actor, reference);
  if (!p) notFound();

  return (
    <div className="mx-auto max-w-lg space-y-4 py-2">
      <section className="rounded-2xl border-2 border-dashed border-warning bg-surface p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border-soft">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-warning-foreground">
            <span className="h-2 w-2 rounded-full bg-warning" aria-hidden="true" />
            Simulated payment · no money moves
          </span>
          <span className="font-mono text-xs text-subtle-foreground">{reference}</span>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground">Checkout amount</p>
          <h1 className="font-heading text-3xl font-extrabold text-primary-strong mt-0.5">
            Pay {formatNaira(p.amountKobo)}
          </h1>
        </div>

        <div className="rounded-xl bg-warning-soft p-3.5 text-xs text-warning-foreground leading-relaxed">
          A Paystack test key isn&apos;t set up for this demo, so this page stands in for checkout. In production, the Paystack webhook plus a server-side verify confirm the booking.
        </div>

        <form action={simulatedPayAction}>
          <input type="hidden" name="reference" value={reference} />
          <button
            type="submit"
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-base font-heading font-bold text-white shadow-xs hover:bg-primary-strong active:scale-[0.98] transition"
          >
            Complete simulated payment
          </button>
        </form>
      </section>
    </div>
  );
}

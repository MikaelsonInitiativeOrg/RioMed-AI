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
    <section className="rounded-xl border-2 border-dashed border-amber-500 bg-amber-50 p-6 space-y-4">
      <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Simulated payment · no money moves</p>
      <h1 className="text-xl font-bold">Pay {formatNaira(p.amountKobo)}</h1>
      <p className="text-sm">A Paystack test key isn&apos;t set up for this demo, so this page stands in for checkout. In production, the Paystack webhook plus a server-side verify confirm the booking.</p>
      <form action={simulatedPayAction}>
        <input type="hidden" name="reference" value={reference} />
        <button className="w-full rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white">Complete simulated payment</button>
      </form>
    </section>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { getTest } from "@riomed/backend/core/catalog";
import { formatNaira } from "@riomed/backend/core/money";
import { STATUS_LABEL, lagosDateTime } from "@/lib/format";
import { listPatientAppointments } from "@riomed/backend/server/queries";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const actor = await getSessionUser();
  if (!actor) redirect("/demo-login?next=/dashboard");
  if (actor.role !== "patient") redirect("/staff");
  const appts = await listPatientAppointments(actor);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-emerald-950">My bookings and results</h1>
      {appts.length === 0 && (
        <div className="rounded-xl bg-white border p-5 text-sm">
          <p>No bookings yet. Here&apos;s how it works: search for a test, pick a time at a partner lab, pay, and your result will appear here.</p>
          <Link href="/" className="mt-3 inline-block rounded-lg bg-emerald-700 px-4 py-2 text-white">Find a test</Link>
        </div>
      )}
      <ul className="space-y-3">
        {appts.map((a) => (
          <li key={a.id}>
            <Link href={`/appointments/${a.id}`} className="block rounded-xl bg-white border border-emerald-900/10 p-4 hover:border-emerald-600">
              <div className="flex justify-between gap-2">
                <span className="font-semibold">{getTest(a.testCode)?.name}</span>
                <span className="text-xs rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-900">{STATUS_LABEL[a.status]}</span>
              </div>
              <p className="text-sm text-slate-600">{a.facilityName} · {lagosDateTime(a.slotStart)} · {formatNaira(a.amountKobo)}</p>
              <p className="text-xs font-mono text-slate-500 mt-1">{a.reference}{a.hasResult && " · result ready"}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

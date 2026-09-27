import Link from "next/link";
import { redirect } from "next/navigation";
import { getTest } from "@riomed/backend/core/catalog";
import { checkInAction, uploadResultAction } from "@/app/actions";
import { STATUS_LABEL, lagosDateTime } from "@/lib/format";
import { listFacilityAppointments } from "@riomed/backend/server/queries";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function StaffPage(props: PageProps<"/staff">) {
  const sp = await props.searchParams;
  const actor = await getSessionUser();
  if (!actor) redirect("/demo-login?next=/staff");
  const q = typeof sp.q === "string" ? sp.q.trim().toUpperCase() : "";
  const desk = await listFacilityAppointments(actor, { referenceQuery: q });
  if (!desk) redirect("/dashboard");
  const { facility, appointments: appts } = desk;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-emerald-950">Facility desk: {facility?.name}</h1>
      {typeof sp.error === "string" && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{sp.error}</p>}
      {sp.uploaded && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">Result uploaded. The patient can see it now.</p>}
      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="Search booking reference, e.g. RM-7K3Q" className="flex-1 rounded-lg border border-emerald-900/20 bg-white px-3 py-2 text-sm" />
        <button className="rounded-lg border border-emerald-900/20 bg-white px-3 py-2 text-sm">Find</button>
      </form>
      {appts.length === 0 && <p className="rounded-xl bg-white border p-4 text-sm">No confirmed bookings{q ? " match that reference" : " yet"}.</p>}
      <ul className="space-y-3">
        {appts.map((a) => (
          <li key={a.id} className="rounded-xl bg-white border border-emerald-900/10 p-4 space-y-2">
            <div className="flex justify-between gap-2">
              <span className="font-mono font-semibold">{a.reference}</span>
              <span className="text-xs rounded-full bg-emerald-100 px-2 py-0.5">{STATUS_LABEL[a.status]}</span>
            </div>
            <p className="text-sm text-slate-600">{getTest(a.testCode)?.name} · {lagosDateTime(a.slotStart)} · {a.patientName}</p>
            {a.status === "CONFIRMED" && (
              <form action={checkInAction}>
                <input type="hidden" name="appointmentId" value={a.id} />
                <button className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm text-white">Check in</button>
              </form>
            )}
            {["CHECKED_IN", "COMPLETED", "RESULT_AVAILABLE"].includes(a.status) && (
              <form action={uploadResultAction} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="appointmentId" value={a.id} />
                <input type="file" name="file" accept="application/pdf" required className="text-sm" />
                <button className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm text-white">{a.resultCount ? "Upload corrected version" : "Upload result PDF"}</button>
              </form>
            )}
            <Link href={`/appointments/${a.id}`} className="text-xs text-emerald-800 underline">View booking</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

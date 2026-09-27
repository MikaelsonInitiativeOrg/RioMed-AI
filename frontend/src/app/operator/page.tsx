import { redirect } from "next/navigation";
import { listPendingFacilityAccounts } from "@riomed/backend/server/accounts";
import { decideAccountAction } from "@/app/actions";
import { lagosDateTime } from "@/lib/format";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Operator: approve or reject facility accounts (they can't see any bookings until approved). */
export default async function OperatorPage() {
  const actor = await getSessionUser();
  const pending = await listPendingFacilityAccounts(actor);
  if (!pending) redirect("/account?mode=access&next=/operator");
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-emerald-950">Facility accounts waiting for approval</h1>
      <p className="text-sm text-slate-600">Check that the person really works at the facility (for example, call the facility&apos;s registered phone number) before approving.</p>
      {pending.length === 0 && <p className="rounded-xl bg-white border p-4 text-sm">Nothing waiting.</p>}
      <ul className="space-y-3">
        {pending.map((u) => (
          <li key={u.id} className="rounded-xl bg-white border border-emerald-900/10 p-4">
            <p className="font-semibold">{u.name} <span className="font-normal text-slate-500">@{u.username}</span></p>
            <p className="text-sm text-slate-600">{u.facilityName} · requested {lagosDateTime(u.createdAt)}</p>
            <div className="mt-3 flex gap-2">
              {(["approve", "reject"] as const).map((d) => (
                <form key={d} action={decideAccountAction}>
                  <input type="hidden" name="userId" value={u.id} />
                  <input type="hidden" name="decision" value={d} />
                  <button className={d === "approve" ? "rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white" : "rounded-lg border px-4 py-2 text-sm"}>
                    {d === "approve" ? "Approve" : "Reject"}
                  </button>
                </form>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

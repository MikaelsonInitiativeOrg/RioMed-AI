import { signInAction, signOutAction } from "@/app/actions";
import { listDemoUsers } from "@riomed/backend/server/queries";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DemoLogin(props: PageProps<"/demo-login">) {
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/";
  const [users, current] = await Promise.all([listDemoUsers(), getSessionUser()]);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-emerald-950">Demo sign-in</h1>
      <p className="text-sm text-slate-600">
        For the hackathon, choose a synthetic account. The real product signs people in with a phone number and one-time code (PRD FR-002).
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {users.map((u) => (
          <form key={u.id} action={signInAction}>
            <input type="hidden" name="userId" value={u.id} />
            <input type="hidden" name="next" value={next} />
            <button className={`w-full text-left rounded-xl border p-4 bg-white hover:border-emerald-600 ${current?.userId === u.id ? "border-emerald-600" : "border-emerald-900/10"}`}>
              <span className="font-semibold block">{u.name}</span>
              <span className="text-xs text-slate-500">{u.role === "patient" ? "Patient" : "Facility staff"}</span>
            </button>
          </form>
        ))}
      </div>
      {current && (
        <form action={signOutAction}>
          <button className="text-sm underline">Sign out</button>
        </form>
      )}
    </div>
  );
}

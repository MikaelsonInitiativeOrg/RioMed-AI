import { signInAction, signOutAction } from "@/app/actions";
import { listDemoUsers } from "@riomed/backend/server/queries";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DemoLogin(props: PageProps<"/demo-login">) {
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/";
  const [users, current] = await Promise.all([listDemoUsers(), getSessionUser()]);

  const patients = users.filter((u) => u.role === "patient");
  const staff = users.filter((u) => u.role !== "patient");

  return (
    <div className="space-y-6 max-w-xl mx-auto py-2">
      <div>
        <h1 className="font-heading text-xl sm:text-2xl font-bold text-[#0A5347]">
          Demo sign-in
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[#4B6560] leading-relaxed">
          For the hackathon, choose a synthetic account. The real product signs people in with a phone number and one-time code (PRD FR-002).
        </p>
      </div>

      {/* Currently logged-in status */}
      {current && (
        <div className="rounded-2xl border border-[#0E6B5C]/30 bg-[#F3FAF8] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0E6B5C] text-white font-bold text-sm">
              {current.name[0]}
            </span>
            <div>
              <p className="text-xs text-[#0E6B5C] font-semibold">Currently active</p>
              <p className="text-sm font-bold text-[#12262B]">{current.name}</p>
            </div>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#0E6B5C] bg-white px-4 py-2 text-xs font-heading font-bold text-[#0E6B5C] hover:bg-[#F3FAF8] transition w-full sm:w-auto"
            >
              Sign out
            </button>
          </form>
        </div>
      )}

      {/* Patient Accounts Section */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#4B6560]">
          Patient demo accounts
        </h2>
        <div className="grid gap-2.5">
          {patients.map((u) => {
            const isSelected = current?.userId === u.id;
            return (
              <form key={u.id} action={signInAction}>
                <input type="hidden" name="userId" value={u.id} />
                <input type="hidden" name="next" value={next} />
                <button
                  type="submit"
                  className={`w-full min-h-[56px] text-left rounded-2xl border p-4 transition flex items-center justify-between gap-3 ${
                    isSelected
                      ? "border-[#0E6B5C] bg-[#F3FAF8] ring-2 ring-[#0E6B5C]/20 shadow-xs"
                      : "border-[#E3E0D6] bg-white hover:border-[#0E6B5C]/40 hover:bg-[#F7F5F0]/60 shadow-2xs"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F7F5F0] text-[#4B6560] font-semibold text-sm">
                      👤
                    </span>
                    <div className="min-w-0">
                      <span className="font-heading font-bold text-[#12262B] block truncate text-sm sm:text-base">
                        {u.name}
                      </span>
                      <span className="text-xs text-[#4B6560]">
                        Patient · Bookings &amp; Results
                      </span>
                    </div>
                  </div>
                  {isSelected ? (
                    <span className="shrink-0 text-xs font-bold text-[#0A5347] bg-[#CDE8E1] px-2.5 py-0.5 rounded-full">
                      Active
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs text-[#8B9490]">Switch →</span>
                  )}
                </button>
              </form>
            );
          })}
        </div>
      </section>

      {/* Staff Accounts Section */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#4B6560]">
          Facility staff demo accounts
        </h2>
        <div className="grid gap-2.5">
          {staff.map((u) => {
            const isSelected = current?.userId === u.id;
            return (
              <form key={u.id} action={signInAction}>
                <input type="hidden" name="userId" value={u.id} />
                <input type="hidden" name="next" value={next} />
                <button
                  type="submit"
                  className={`w-full min-h-[56px] text-left rounded-2xl border p-4 transition flex items-center justify-between gap-3 ${
                    isSelected
                      ? "border-[#0E6B5C] bg-[#F3FAF8] ring-2 ring-[#0E6B5C]/20 shadow-xs"
                      : "border-[#E3E0D6] bg-white hover:border-[#0E6B5C]/40 hover:bg-[#F7F5F0]/60 shadow-2xs"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F3FAF8] text-[#0A5347] font-semibold text-sm">
                      🏥
                    </span>
                    <div className="min-w-0">
                      <span className="font-heading font-bold text-[#12262B] block truncate text-sm sm:text-base">
                        {u.name}
                      </span>
                      <span className="text-xs text-[#4B6560]">
                        Facility desk · Check-in &amp; Uploads
                      </span>
                    </div>
                  </div>
                  {isSelected ? (
                    <span className="shrink-0 text-xs font-bold text-[#0A5347] bg-[#CDE8E1] px-2.5 py-0.5 rounded-full">
                      Active
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs text-[#8B9490]">Switch →</span>
                  )}
                </button>
              </form>
            );
          })}
        </div>
      </section>
    </div>
  );
}

import { redirect } from "next/navigation";
import { listPatientAppointments } from "@riomed/backend/server/queries";
import { getSessionUser } from "@/lib/session";
import { PatientDashboardTabs } from "@/components/PatientDashboardTabs";
import { signOutAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const actor = await getSessionUser();
  if (!actor) redirect("/account?mode=access&next=/dashboard");
  if (actor.role !== "patient") redirect("/staff");
  const appts = await listPatientAppointments(actor);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 pb-12">
      {/* Dashboard Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-primary-strong">
            My dashboard
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Appointments, results and booking history in one place.
          </p>
        </div>

        <div className="text-right shrink-0">
          <span className="text-xs text-subtle-foreground">Signed in as</span>
          <p className="font-heading font-bold text-xs text-foreground">
            {actor.name}
          </p>
          <form action={signOutAction}>
            <button
              type="submit"
              className="text-xs text-primary hover:underline"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      {/* Tabs & Appointment Content */}
      <PatientDashboardTabs appointments={appts} />
    </div>
  );
}

import { CalendarDays, Tags } from "lucide-react";
import Link from "next/link";
import { signOutAction } from "@/app/actions";

/**
 * Frame for the facility desk pages. On phones the sidebar collapses to a header with a row of
 * large tabs; from md up it's a left sidebar. Only links to pages that exist.
 */
export function FacilityShell({
  facilityName,
  operatorName,
  active,
  children,
}: {
  facilityName: string;
  operatorName: string;
  active: "schedule" | "catalogue";
  children: React.ReactNode;
}) {
  const tabs = [
    { key: "schedule", href: "/staff", icon: CalendarDays, short: "Schedule", label: "Today's schedule" },
    { key: "catalogue", href: "/staff/catalogue", icon: Tags, short: "Catalogue", label: "Catalogue & prices" },
  ] as const;

  return (
    <div className="rounded-2xl border border-border overflow-hidden bg-background shadow-2xs md:flex md:min-h-[580px]">
      <aside className="bg-primary-strong text-primary-soft p-4 md:p-5 md:w-[220px] md:shrink-0 md:flex md:flex-col md:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path d="M9 25h6l3-9 5 17 4-14 3 6h9" stroke="#FFFFFF" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="font-heading font-bold text-sm text-white truncate">{facilityName}</p>
              <p className="text-xs text-primary-muted">Facility desk</p>
            </div>
          </div>

          <nav aria-label="Facility desk" className="mt-3 md:mt-6 grid grid-cols-2 gap-2 md:flex md:flex-col">
            {tabs.map((t) => (
              <Link
                key={t.key}
                href={t.href}
                aria-current={active === t.key ? "page" : undefined}
                className={`inline-flex min-h-[44px] items-center justify-center md:justify-start gap-1.5 rounded-lg px-3 text-sm whitespace-nowrap transition ${
                  active === t.key ? "bg-surface/15 font-bold text-white" : "text-primary-muted hover:bg-surface/5 hover:text-white"
                }`}
              >
                <t.icon className="h-4 w-4" aria-hidden />
                <span className="md:hidden">{t.short}</span>
                <span className="hidden md:inline">{t.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-3 md:mt-6 md:pt-6 md:border-t md:border-white/10 text-xs text-primary-muted flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="truncate">Signed in: {operatorName}</span>
          <form action={signOutAction}>
            <button type="submit" className="inline-flex min-h-[44px] items-center underline hover:text-white">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-7">{children}</main>
    </div>
  );
}

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
    { key: "schedule", href: "/staff", icon: "📅", short: "Schedule", label: "Today's schedule" },
    { key: "catalogue", href: "/staff/catalogue", icon: "🏷️", short: "Catalogue", label: "Catalogue & prices" },
  ] as const;

  return (
    <div className="rounded-2xl border border-[#E3E0D6] overflow-hidden bg-[#F7F5F0] shadow-2xs md:flex md:min-h-[580px]">
      <aside className="bg-[#0A5347] text-[#F3FAF8] p-4 md:p-5 md:w-[220px] md:shrink-0 md:flex md:flex-col md:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0E6B5C] flex items-center justify-center shrink-0" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path d="M9 25h6l3-9 5 17 4-14 3 6h9" stroke="#F3FAF8" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="font-heading font-bold text-sm text-white truncate">{facilityName}</p>
              <p className="text-xs text-[#CDE8E1]">Facility desk</p>
            </div>
          </div>

          <nav aria-label="Facility desk" className="mt-3 md:mt-6 grid grid-cols-2 gap-2 md:flex md:flex-col">
            {tabs.map((t) => (
              <Link
                key={t.key}
                href={t.href}
                aria-current={active === t.key ? "page" : undefined}
                className={`inline-flex min-h-[44px] items-center justify-center md:justify-start gap-1.5 rounded-lg px-3 text-sm whitespace-nowrap transition ${
                  active === t.key ? "bg-white/15 font-bold text-white" : "text-[#CDE8E1] hover:bg-white/5 hover:text-white"
                }`}
              >
                <span aria-hidden="true">{t.icon}</span>
                <span className="md:hidden">{t.short}</span>
                <span className="hidden md:inline">{t.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-3 md:mt-6 md:pt-6 md:border-t md:border-white/10 text-xs text-[#CDE8E1] flex flex-wrap items-center gap-x-3 gap-y-1">
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

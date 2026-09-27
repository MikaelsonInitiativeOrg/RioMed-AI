import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Atkinson_Hyperlegible } from "next/font/google";
import { getSessionUser } from "@/lib/session";
import { RioMedLogo } from "@/components/Logo";
import { BadgeCheck, Building2, CalendarCheck, FlaskConical, Info, Mail, Search, Settings, ShieldCheck, Tags, UserRound } from "lucide-react";
import "./globals.css";

// Atkinson Hyperlegible: designed for low-vision readability (ui-ux-pro-max healthcare pick).
const atkinson = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0E7490",
};

export const metadata: Metadata = {
  title: "RioMed AI — medical prompting",
  description: "Describe the test you need in plain language. RioMed finds registry-listed facilities nearby, books a slot, takes payment and keeps your result safe.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getSessionUser();
  const mode = (process.env.AI_PROVIDER ?? "mock").toLowerCase();
  const displayName = user ? user.name.split(" (")[0].split(",")[0] : null;

  const signedInAs = user?.role === "patient" ? "patient" : user?.role === "facility_staff" || user?.role === "facility_admin" ? "facility" : user?.role === "operator" ? "operator" : null;
  const tabs: Array<[string, React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>, string]> =
    signedInAs === "patient"
      ? [["/", Search, "Search"], ["/dashboard", CalendarCheck, "Bookings"], ["/inbox", Mail, "Inbox"], ["/audit", ShieldCheck, "Access log"], ["/privacy", Settings, "Privacy"]]
      : signedInAs === "facility"
        ? [["/", Search, "Search"], ["/staff", Building2, "Desk"], ["/staff/catalogue", Tags, "Catalogue"], ["/inbox", Mail, "Inbox"]]
        : signedInAs === "operator"
          ? [["/", Search, "Search"], ["/operator", BadgeCheck, "Approvals"]]
          : [["/", Search, "Search"], ["/account?mode=access", UserRound, "Sign in"], ["/about", Info, "How it works"]];
  const navLink = "min-h-[44px] items-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-border-soft hover:text-foreground";

  return (
    <html lang="en" className={`${atkinson.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:shadow">
          Skip to content
        </a>

        {/* Required hackathon disclosure: demo data, Paystack test mode, AI mode */}
        <aside aria-label="Demo environment status" className="border-b border-border bg-surface text-xs text-muted-foreground">
          <div className="mx-auto flex max-w-5xl items-center justify-center gap-2 px-4 py-1.5">
            <span className="inline-flex items-center gap-1.5 font-medium text-warning-foreground">
              <FlaskConical className="h-3.5 w-3.5" aria-hidden />
              Demo
            </span>
            <span aria-hidden>·</span>
            <span>Pay by bank transfer</span>
            <span aria-hidden>·</span>
            <span>
              AI: <strong className="font-bold text-foreground">{mode === "mock" ? "mock" : mode}</strong>
            </span>
          </div>
        </aside>

        <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
            <Link href="/" aria-label="RioMed AI home" className="flex min-h-[44px] items-center gap-2.5 rounded-lg">
              <RioMedLogo size={30} />
              <span className="text-lg font-bold tracking-tight text-foreground">
                RioMed <span className="text-primary">AI</span>
              </span>
            </Link>

            <nav aria-label="Main navigation" className="flex items-center gap-1">
              {signedInAs === "patient" && <Link href="/dashboard" className={`hidden sm:inline-flex ${navLink}`}>My bookings</Link>}
              {signedInAs === "facility" && <Link href="/staff" className={`hidden sm:inline-flex ${navLink}`}>Facility desk</Link>}
              {signedInAs === "operator" && <Link href="/operator" className={`hidden sm:inline-flex ${navLink}`}>Approvals</Link>}
              {user && <Link href="/inbox" className={`hidden sm:inline-flex ${navLink}`}>Inbox</Link>}
              <Link href="/about" className={`hidden sm:inline-flex ${navLink}`}>How it works</Link>
              {!user && (
                <Link href="/account?mode=signup&type=facility" className={`hidden md:inline-flex ${navLink}`}>For clinics</Link>
              )}
              <Link
                href="/account?mode=access"
                title={displayName ?? "Sign in or create an account"}
                className="ml-1 inline-flex min-h-[44px] max-w-[160px] items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white shadow-sm transition-colors duration-150 hover:bg-primary-strong"
              >
                <UserRound className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate">{displayName ?? "Sign in"}</span>
              </Link>
            </nav>
          </div>
        </header>

        <main id="main-content" className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-24 sm:px-6 sm:pb-10">
          {children}
        </main>

        <footer className="hidden border-t border-border bg-surface sm:block">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-6 py-5 text-xs text-subtle-foreground">
            <span>RioMed helps you find, book and pay for care. It does not give medical advice. In an emergency, call 112.</span>
            <span>Places data: Google Maps · OpenStreetMap</span>
          </div>
        </footer>

        {/* Phone tab bar (< 640px): only destinations that make sense for this user */}
        <nav
          aria-label="Mobile navigation"
          className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
        >
          {tabs.map(([href, Icon, label]) => (
            <Link key={href} href={href} className="flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary">
              <Icon className="h-5 w-5" aria-hidden />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Sora, Public_Sans } from "next/font/google";
import { getSessionUser } from "@/lib/session";
import { RioMedLogo } from "@/components/Logo";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0A5347",
};

export const metadata: Metadata = {
  title: "RioMed AI — medical prompting",
  description: "Describe the test you need in plain language. RioMed finds registry-listed facilities nearby, books a slot, takes payment and keeps your result safe.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getSessionUser();
  const mode = (process.env.AI_PROVIDER ?? "mock").toLowerCase();
  const displayName = user ? user.name.split(" (")[0].split(",")[0] : null;

  return (
    <html lang="en" className={`${sora.variable} ${publicSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-[#F7F5F0] text-[#12262B]">
        {/* Required Hackathon Demo Banner */}
        <aside
          aria-label="Demo environment status"
          className="bg-[#FFF4E5] border-b border-[#E3E0D6] text-[#8A6212] text-xs text-center px-3 py-1 font-medium"
        >
          <div className="mx-auto max-w-4xl flex items-center justify-center gap-1.5 flex-wrap">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#C98A1D]" aria-hidden="true" />
            <span>Hackathon demo · Paystack test mode · AI mode:</span>
            <strong className="font-semibold uppercase">
              {mode === "mock" ? "MOCK" : mode}
            </strong>
          </div>
        </aside>

        {/* Official Medical Chat Topbar */}
        <header className="sticky top-0 z-30 bg-white border-b border-[#E3E0D6] flex-shrink-0">
          <div className="mx-auto max-w-4xl px-3 sm:px-6">
            <div className="flex h-14 items-center justify-between gap-2">
              {/* Brand Logo & Wordmark */}
              <Link
                href="/"
                className="flex items-center gap-2 font-heading font-bold text-sm sm:text-base text-[#0A5347] tracking-tight min-h-[44px] pr-1 rounded-lg focus-visible:ring-2 focus-visible:ring-[#0E6B5C] shrink-0"
                aria-label="RioMed AI Home"
              >
                <RioMedLogo size={26} />
                <span>
                  RioMed <span className="text-[#0E6B5C]">AI</span>
                </span>
              </Link>

              {/* Right Navigation & Status Pill */}
              <div className="flex items-center gap-1.5 sm:gap-3 text-xs sm:text-sm">
                <nav aria-label="Main Navigation" className="flex items-center gap-1 sm:gap-2">
                  {user?.role === "patient" && (
                    <Link
                      href="/dashboard"
                      className="inline-flex min-h-[44px] items-center rounded-lg px-2 sm:px-2.5 py-1 text-xs font-semibold text-[#4B6560] hover:text-[#0A5347] hover:bg-[#F3FAF8] transition"
                    >
                      <span className="sm:hidden">Bookings</span>
                      <span className="hidden sm:inline">My bookings</span>
                    </Link>
                  )}

                  {(user?.role === "facility_staff" || user?.role === "facility_admin") && (
                    <Link
                      href="/staff"
                      className="inline-flex min-h-[44px] items-center rounded-lg px-2 sm:px-2.5 py-1 text-xs font-semibold text-[#4B6560] hover:text-[#0A5347] hover:bg-[#F3FAF8] transition"
                    >
                      <span className="sm:hidden">Desk</span>
                      <span className="hidden sm:inline">Facility desk</span>
                    </Link>
                  )}

                  <Link
                    href="/about"
                    className="hidden sm:inline-flex min-h-[44px] items-center rounded-lg px-2.5 py-1 text-xs font-semibold text-[#4B6560] hover:text-[#0A5347] hover:bg-[#F3FAF8] transition"
                  >
                    How it works
                  </Link>

                  <Link
                    href="/account?mode=access"
                    className="inline-flex min-h-[44px] items-center rounded-lg px-2 sm:px-2.5 py-1 text-xs font-semibold text-[#0E6B5C] bg-[#F3FAF8] border border-[#0E6B5C]/20 hover:bg-[#CDE8E1]/50 transition max-w-[90px] sm:max-w-[140px] truncate"
                    title={displayName ?? "Sign in or create an account"}
                  >
                    {displayName ? displayName : "Sign in"}
                  </Link>
                </nav>

                {/* Status Badge from screenshot */}
                {mode === "mock" ? (
                  <span className="hidden xs:inline-flex rounded-full border border-dashed border-[#C98A1D] bg-white px-2 py-0.5 text-xs sm:text-xs font-bold text-[#8A6212] tracking-wide shrink-0">
                    MOCK AI
                  </span>
                ) : (
                  <span className="hidden xs:inline-flex rounded-full bg-[#CDE8E1] px-2 py-0.5 text-xs sm:text-xs font-bold text-[#0A5347] tracking-wide shrink-0">
                    LIVE · {mode.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main id="main-content" className="mx-auto w-full max-w-4xl flex-1 flex flex-col px-3 sm:px-6">
          {children}
        </main>

        {/* Phone bottom bar (< 640px): only the destinations that make sense for this user */}
        <nav
          aria-label="Mobile navigation"
          className="sm:hidden sticky bottom-0 z-30 bg-white/95 backdrop-blur-xs border-t border-[#E3E0D6] flex items-stretch text-xs text-[#4B6560] pb-[env(safe-area-inset-bottom)]"
        >
          {(user?.role === "patient"
            ? [["/", "🔍", "Search"], ["/dashboard", "📋", "Bookings"], ["/audit", "🛡️", "Access log"], ["/privacy", "⚙️", "Privacy"]]
            : user?.role === "facility_staff" || user?.role === "facility_admin"
              ? [["/", "🔍", "Search"], ["/staff", "🏥", "Desk"], ["/staff/catalogue", "🏷️", "Catalogue"]]
              : user?.role === "operator"
                ? [["/", "🔍", "Search"], ["/operator", "✅", "Approvals"]]
                : [["/", "🔍", "Search"], ["/account?mode=access", "👤", "Sign in"], ["/about", "ℹ️", "How it works"]]
          ).map(([href, icon, label]) => (
            <Link key={href} href={href} className="flex-1 flex flex-col items-center justify-center min-h-[52px] py-1 hover:text-[#0A5347] hover:bg-[#F3FAF8]">
              <span className="text-base leading-none" aria-hidden="true">{icon}</span>
              <span className="mt-0.5 font-semibold">{label}</span>
            </Link>
          ))}
        </nav>
      </body>
    </html>
  );
}

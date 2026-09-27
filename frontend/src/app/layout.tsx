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
          className="bg-[#FFF4E5] border-b border-[#E3E0D6] text-[#8A6212] text-[11px] sm:text-xs text-center px-3 py-1 font-medium"
        >
          <div className="mx-auto max-w-4xl flex items-center justify-center gap-1.5 flex-wrap">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#C98A1D]" aria-hidden="true" />
            <span>Hackathon demo · synthetic facilities and patients · Paystack test mode only · AI mode:</span>
            <strong className="font-semibold">
              {mode === "mock" ? "MOCK (no AI inference)" : mode}
            </strong>
          </div>
        </aside>

        {/* Official Medical Chat Topbar */}
        <header className="sticky top-0 z-30 bg-white border-b border-[#E3E0D6] flex-shrink-0">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="flex h-14 items-center justify-between gap-3">
              {/* Brand Logo & Wordmark matching screenshot */}
              <Link
                href="/"
                className="flex items-center gap-2.5 font-heading font-bold text-base text-[#0A5347] tracking-tight min-h-[44px] -ml-1 pl-1 pr-2 rounded-lg focus-visible:ring-2 focus-visible:ring-[#0E6B5C]"
                aria-label="RioMed AI Home"
              >
                <RioMedLogo size={28} />
                <span>
                  RioMed <span className="text-[#0E6B5C]">AI</span>
                </span>
              </Link>

              {/* Right section: Navigation links + AI status pill matching screenshot */}
              <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                <nav aria-label="Main Navigation" className="flex items-center gap-1 sm:gap-2">
                  {user?.role === "patient" && (
                    <Link
                      href="/dashboard"
                      className="inline-flex min-h-[36px] items-center rounded-lg px-2.5 py-1 text-xs font-medium text-[#4B6560] hover:text-[#0A5347] hover:bg-[#F3FAF8] transition"
                    >
                      My bookings
                    </Link>
                  )}

                  {(user?.role === "facility_staff" || user?.role === "facility_admin") && (
                    <Link
                      href="/staff"
                      className="inline-flex min-h-[36px] items-center rounded-lg px-2.5 py-1 text-xs font-medium text-[#4B6560] hover:text-[#0A5347] hover:bg-[#F3FAF8] transition"
                    >
                      Facility desk
                    </Link>
                  )}

                  <Link
                    href="/about"
                    className="inline-flex min-h-[36px] items-center rounded-lg px-2.5 py-1 text-xs font-medium text-[#4B6560] hover:text-[#0A5347] hover:bg-[#F3FAF8] transition"
                  >
                    How it works
                  </Link>

                  <Link
                    href="/demo-login"
                    className="inline-flex min-h-[36px] items-center rounded-lg px-2.5 py-1 text-xs font-medium text-[#4B6560] hover:text-[#0A5347] hover:bg-[#F3FAF8] transition"
                  >
                    {displayName ? displayName : "Sign in"}
                  </Link>
                </nav>

                {/* Status Badge from screenshot */}
                {mode === "mock" ? (
                  <span className="rounded-full border border-dashed border-[#C98A1D] bg-white px-2.5 py-1 text-[11px] font-bold text-[#8A6212] tracking-wide">
                    MOCK AI
                  </span>
                ) : (
                  <span className="rounded-full bg-[#CDE8E1] px-2.5 py-1 text-[11px] font-bold text-[#0A5347] tracking-wide">
                    LIVE · {mode.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main id="main-content" className="mx-auto w-full max-w-4xl flex-1 flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}

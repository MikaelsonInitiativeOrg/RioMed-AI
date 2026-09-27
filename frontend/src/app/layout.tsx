import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { getSessionUser } from "@/lib/session";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RioMed AI: find, book and pay for medical tests in Lagos",
  description: "Describe the test you need in plain language. RioMed finds registry-listed facilities nearby, books a slot, takes payment and keeps your result safe.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getSessionUser();
  const mode = (process.env.AI_PROVIDER ?? "mock").toLowerCase();
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <div className="bg-amber-100 text-amber-900 text-xs text-center px-4 py-1.5">
          Hackathon demo · synthetic facilities and patients · Paystack test mode only · AI mode:{" "}
          <strong>{mode === "mock" ? "MOCK (no AI inference)" : mode}</strong>
        </div>
        <header className="bg-white border-b border-emerald-900/10">
          <nav className="mx-auto max-w-3xl px-4 h-14 flex items-center gap-4 text-sm">
            <Link href="/" className="font-semibold text-emerald-800 text-base mr-auto">
              RioMed<span className="text-emerald-500"> AI</span>
            </Link>
            {user?.role === "patient" && <Link href="/dashboard" className="hover:underline">My bookings</Link>}
            {(user?.role === "facility_staff" || user?.role === "facility_admin") && <Link href="/staff" className="hover:underline">Facility desk</Link>}
            <Link href="/about" className="hover:underline">How it works</Link>
            <Link href="/demo-login" className="rounded-full border border-emerald-800/20 px-3 py-1 hover:bg-emerald-50">
              {user ? user.name.split(" (")[0].split(",")[0] : "Demo sign-in"}
            </Link>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-3xl px-4 py-6 flex-1">{children}</main>
        <footer className="mx-auto w-full max-w-3xl px-4 py-6 text-xs text-slate-600 border-t border-emerald-900/10">
          RioMed helps you find and book care. It does not give medical advice. In an emergency call <strong>112</strong>.
        </footer>
      </body>
    </html>
  );
}

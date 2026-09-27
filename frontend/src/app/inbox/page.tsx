import { redirect } from "next/navigation";
import { Mail } from "lucide-react";
import { listInbox } from "@riomed/backend/server/email";
import { getSessionUser } from "@/lib/session";
import { lagosDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  account_created: "Welcome",
  signin: "Security",
  password_reset: "Security",
  booking_held: "Booking",
  booking_new: "New booking",
  transfer_sent: "Payment",
  booking_confirmed: "Confirmed",
};

/** Demo inbox: the emails RioMed would send you (and your facility). Nothing leaves the app. */
export default async function InboxPage() {
  const actor = await getSessionUser();
  if (!actor) redirect("/account?mode=access&next=/inbox");
  const mail = (await listInbox(actor)) ?? [];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 py-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inbox</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Demo email: these are the notifications RioMed sends for sign-ins, password resets and bookings. In this demo they&apos;re shown here instead of being delivered.
        </p>
      </div>

      {mail.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
          <Mail className="mx-auto mb-2 h-6 w-6 text-subtle-foreground" aria-hidden />
          No emails yet. Book a test or sign in again to see one.
        </div>
      ) : (
        <ul className="space-y-3">
          {mail.map((m) => (
            <li key={m.id}>
              <details className="group rounded-xl border border-border bg-surface shadow-sm">
                <summary className="flex min-h-[56px] list-none flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0">
                    <span className="mr-2 rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary-strong">{KIND_LABEL[m.kind] ?? m.kind}</span>
                    <span className="font-bold text-foreground">{m.subject}</span>
                  </span>
                  <span className="shrink-0 text-xs text-subtle-foreground">{lagosDateTime(m.createdAt)}</span>
                </summary>
                <div className="border-t border-border-soft px-4 py-3">
                  <p className="text-xs text-subtle-foreground">To: {m.toAddress}</p>
                  <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-foreground">{m.body}</pre>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

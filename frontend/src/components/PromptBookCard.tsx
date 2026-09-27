import { CalendarPlus } from "lucide-react";
import { getTest } from "@riomed/backend/core/catalog";
import { previewPromptBook } from "@riomed/backend/server/promptBook";
import { promptBookAction } from "@/app/actions";
import { lagosDateTime } from "@/lib/format";

/**
 * "Book for me" from a prompt that names a clinic, e.g.
 * "book a malaria test at Alausa Diagnostics tomorrow morning".
 * Resolves facility + test + free slots; the button holds the slot
 * (payment still happens on the appointment page).
 */
export async function PromptBookCard({ query }: { query: string }) {
  const preview = await previewPromptBook(query);
  if (preview.status === "emergency") return null;
  // Only prompt for a clinic when the person actually asked to book ("near me" searches stay clean).
  if (preview.status === "need" && !/\b(book|schedule|reserve)\b/i.test(query)) return null;

  if (preview.status === "need") {
    const options = preview.facilities.length <= 4 ? preview.facilities : [];
    return (
      <div className="rounded-xl border border-primary/30 bg-primary-soft p-4 text-sm text-primary-strong">
        <p className="inline-flex items-center gap-2 font-bold text-foreground"><CalendarPlus className="h-4 w-4 text-primary" aria-hidden />Book for me</p>
        <p className="mt-1 text-muted-foreground">{preview.reason}</p>
        {options.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Options: {options.map((f) => f.name).join(" · ")}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary-soft p-4 text-sm text-primary-strong space-y-3">
      <div>
        <p className="inline-flex items-center gap-2 font-bold text-foreground"><CalendarPlus className="h-4 w-4 text-primary" aria-hidden />Book for me</p>
        <p className="mt-1 text-muted-foreground">
          {getTest(preview.testCode)?.name ?? preview.testName} at {preview.facility.name}. Pick a time — it will be held for 15 minutes while you pay.
        </p>
      </div>
      <div className="space-y-2">
        {preview.slots.map((s) => (
          <form key={s.id} action={promptBookAction} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2">
            <span className="font-semibold text-foreground">{lagosDateTime(s.start)}</span>
            <input type="hidden" name="q" value={query} />
            <input type="hidden" name="slotId" value={s.id} />
            <button
              type="submit"
              className="inline-flex min-h-[44px] shrink-0 items-center rounded-lg bg-primary px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-strong"
            >
              Book this for me
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}

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

  if (preview.status === "need") {
    const options = preview.facilities.length <= 4 ? preview.facilities : [];
    return (
      <div className="rounded-2xl border border-[#0E6B5C]/30 bg-[#F3FAF8] p-4 text-sm text-[#0A5347]">
        <p className="font-bold">📅 Book for me</p>
        <p className="mt-1 text-[#4B6560]">{preview.reason}</p>
        {options.length > 0 && (
          <p className="mt-2 text-xs text-[#4B6560]">
            Options: {options.map((f) => f.name).join(" · ")}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#0E6B5C]/30 bg-[#F3FAF8] p-4 text-sm text-[#0A5347] space-y-3">
      <div>
        <p className="font-bold">📅 Book for me</p>
        <p className="mt-1 text-[#4B6560]">
          {getTest(preview.testCode)?.name ?? preview.testName} at {preview.facility.name}. Pick a time — it will be held for 15 minutes while you pay.
        </p>
      </div>
      <div className="space-y-2">
        {preview.slots.map((s) => (
          <form key={s.id} action={promptBookAction} className="flex items-center justify-between gap-3 rounded-xl border border-[#E3E0D6] bg-white px-3 py-2">
            <span className="font-semibold text-[#12262B]">{lagosDateTime(s.start)}</span>
            <input type="hidden" name="q" value={query} />
            <input type="hidden" name="slotId" value={s.id} />
            <button
              type="submit"
              className="inline-flex min-h-[44px] shrink-0 items-center rounded-xl bg-[#0E6B5C] px-4 text-xs font-heading font-bold text-white shadow-xs hover:bg-[#0A5347] active:scale-[0.98] transition"
            >
              Book this for me
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTest } from "@riomed/backend/core/catalog";
import { lagosDateTime } from "@/lib/format";
import { resultLink } from "@riomed/backend/server/auth";
import { getAppointmentForActor } from "@riomed/backend/server/queries";
import { getSessionUser } from "@/lib/session";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

export default async function ResultViewerPage(props: PageProps<"/appointments/[id]/result">) {
  const { id } = await props.params;
  const actor = await getSessionUser();
  if (!actor) redirect(`/demo-login?next=/appointments/${id}/result`);

  const a = await getAppointmentForActor(actor, id);
  if (!a) notFound();

  const latestResult = a.results[0];
  const testObj = getTest(a.testCode);
  const testName = testObj?.name ?? a.testCode;

  if (!latestResult) {
    return (
      <div className="w-full max-w-xl mx-auto space-y-5 py-6">
        <Link
          href={`/appointments/${id}`}
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-[#0E6B5C] hover:text-[#0A5347]"
        >
          ← Back to appointment
        </Link>
        <EmptyState
          title="Result in progress"
          description={`Your ${testName} was received by ${a.facility.name}. Your PDF will appear here once the facility uploads it.`}
          actionHref={`/appointments/${id}`}
          actionLabel="View booking status"
          hint="We will notify you immediately once the result PDF is ready."
        />
      </div>
    );
  }

  const downloadUrl = resultLink(latestResult.id);

  return (
    <div className="w-full max-w-xl mx-auto space-y-5 py-4 sm:py-6 pb-16">
      {/* Top Header matching Design System Mockup 7 */}
      <div className="space-y-1">
        <Link
          href={`/appointments/${id}`}
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-[#0E6B5C] hover:text-[#0A5347]"
        >
          ← Back to appointment
        </Link>
        <h1 className="font-heading text-xl sm:text-2xl font-bold text-[#0A5347]">
          {testName} result
        </h1>
        <p className="text-xs sm:text-sm text-[#4B6560]">
          {a.facility.name} · Issued {lagosDateTime(latestResult.uploadedAt)} · Version {latestResult.version}
        </p>
      </div>

      {/* 5-minute Expiring Signed Link Warning Banner */}
      <div className="rounded-xl border border-[#C98A1D]/30 bg-[#FFF4E5] p-3 text-xs sm:text-[13px] font-semibold text-[#8A6212] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>⏱</span>
          <span>This secure download link expires in 5 minutes</span>
        </div>
        <span className="text-xs font-mono bg-white/70 px-2 py-0.5 rounded border border-[#C98A1D]/20">
          SECURE
        </span>
      </div>

      {/* DOCUMENT PREVIEW CARD (Design System Mockup 7) */}
      <div className="rounded-2xl border border-[#E3E0D6] bg-white p-5 sm:p-7 shadow-xs space-y-5">
        {/* Document Header */}
        <div className="flex items-start justify-between border-b border-[#F0EEE7] pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0E6B5C]">
              OFFICIAL LABORATORY REPORT
            </span>
            <h2 className="font-heading font-bold text-base sm:text-lg text-[#12262B]">
              {a.facility.name}
            </h2>
            <p className="text-xs text-[#4B6560]">{a.facility.address}</p>
          </div>
          <div className="rounded-lg bg-[#F3FAF8] border border-[#0E6B5C]/30 px-2.5 py-1 text-xs font-bold text-[#0A5347]">
            ✓ VERIFIED
          </div>
        </div>

        {/* Patient & Sample Metadata */}
        <div className="grid grid-cols-2 gap-3 text-xs bg-[#F7F5F0] p-3 rounded-xl border border-[#E3E0D6]">
          <div>
            <span className="text-[#8B9490] block text-xs">Patient Ref</span>
            <span className="font-mono font-bold text-[#12262B]">{a.reference}</span>
          </div>
          <div>
            <span className="text-[#8B9490] block text-xs">Date Sample Taken</span>
            <span className="font-semibold text-[#12262B]">{lagosDateTime(a.slotStart)}</span>
          </div>
          <div>
            <span className="text-[#8B9490] block text-xs">Test Requested</span>
            <span className="font-semibold text-[#12262B]">{testName}</span>
          </div>
          <div>
            <span className="text-[#8B9490] block text-xs">Report Version</span>
            <span className="font-semibold text-[#12262B]">Version {latestResult.version}</span>
          </div>
        </div>

        {/* Result Findings Section */}
        <div className="space-y-2 pt-1">
          <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-[#4B6560]">
            Investigation &amp; Findings
          </h3>
          <div className="rounded-xl border border-[#E3E0D6] overflow-hidden">
            <div className="grid grid-cols-3 bg-[#F7F5F0] px-3.5 py-2 text-xs font-bold text-[#4B6560] uppercase">
              <span>Investigation</span>
              <span>Result</span>
              <span className="text-right">Ref Range</span>
            </div>
            <div className="grid grid-cols-3 px-3.5 py-3 text-xs items-center bg-white border-t border-[#F0EEE7]">
              <span className="font-semibold text-[#12262B]">{testName}</span>
              <span className="font-bold text-[#0A5347] bg-[#F3FAF8] px-2 py-0.5 rounded w-fit">
                COMPLETED
              </span>
              <span className="text-right text-[#4B6560]">Standard diagnostic</span>
            </div>
          </div>
        </div>

        {/* Clinical Disclaimer & Sign-off Stamp */}
        <div className="pt-2 border-t border-[#F0EEE7] flex items-center justify-between text-xs text-[#4B6560]">
          <div>
            <p className="font-semibold text-[#12262B]">Medical Laboratory Scientist Sign-off</p>
            <p className="text-xs text-[#8B9490]">Signed cryptographically at upload · RioMed Vault</p>
          </div>
          <div className="border border-[#0E6B5C] rounded-lg px-2 py-1 text-center bg-[#F3FAF8]">
            <span className="block font-heading font-extrabold text-xs text-[#0A5347]">
              SEALED
            </span>
            <span className="text-[8px] text-[#0E6B5C] font-mono">DOC-{latestResult.id.slice(0, 6)}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-1">
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener"
          className="w-full min-h-[48px] rounded-xl bg-[#0E6B5C] font-heading font-bold text-white text-sm hover:bg-[#0A5347] transition shadow-xs flex items-center justify-center gap-2"
        >
          <span>📥 Download Official PDF</span>
        </a>

        <div className="grid grid-cols-2 gap-2">
          <Link
            href={`/audit?ref=${a.reference}`}
            className="min-h-[44px] rounded-xl border border-[#E3E0D6] bg-white text-xs font-semibold text-[#4B6560] hover:bg-[#F7F5F0] transition flex items-center justify-center text-center"
          >
            🛡️ View in Audit Trail
          </Link>
          <Link
            href="/dashboard"
            className="min-h-[44px] rounded-xl border border-[#E3E0D6] bg-white text-xs font-semibold text-[#4B6560] hover:bg-[#F7F5F0] transition flex items-center justify-center text-center"
          >
            👤 Patient Dashboard
          </Link>
        </div>
      </div>

      {/* Footer Audit Notice matching Mockup 7 */}
      <div className="text-center text-xs text-[#8B9490] pt-2 space-y-1">
        <p>Each time this PDF is opened, it is recorded in your access history.</p>
        <p>RioMed does not interpret or diagnose results. Please consult your clinician.</p>
      </div>
    </div>
  );
}

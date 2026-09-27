"use client";

function stamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeIcs(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** Add-to-calendar for a booking: Google Calendar link plus a downloadable .ics file. */
export function AddToCalendar({
  reference,
  facilityName,
  address,
  testName,
  startISO,
  endISO,
  tentative,
}: {
  reference: string;
  facilityName: string;
  address: string;
  testName: string;
  startISO: string;
  endISO: string;
  tentative: boolean;
}) {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const title = `RioMed booking at ${facilityName}`;
  const details = `Booking ${reference} · ${testName} · ${facilityName}${address ? `, ${address}` : ""} · Show reference ${reference} at reception.`;
  const dates = `${stamp(start)}/${stamp(end)}`;
  const googleUrl =
    `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${encodeURIComponent(title)}&dates=${dates}` +
    `&details=${encodeURIComponent(details)}&location=${encodeURIComponent(facilityName)}`;

  function downloadIcs() {
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//RioMed AI//Booking//EN",
      "BEGIN:VEVENT",
      `UID:${reference}@riomed-ai`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${escapeIcs(title)}`,
      `DESCRIPTION:${escapeIcs(details)}`,
      `LOCATION:${escapeIcs(facilityName)}`,
      `STATUS:${tentative ? "TENTATIVE" : "CONFIRMED"}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `riomed-${reference}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section aria-label="Add to calendar" className="rounded-2xl border border-[#E3E0D6] bg-white p-4 sm:p-5 shadow-xs space-y-3">
      <h2 className="font-heading text-base font-bold text-[#0A5347]">📅 Add to your calendar</h2>
      {tentative && (
        <p className="text-xs text-[#8A6212]">
          This is a 15-minute hold, not a confirmation yet — pay to confirm it.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center rounded-xl bg-[#0E6B5C] px-4 text-xs font-heading font-bold text-white shadow-xs hover:bg-[#0A5347] transition"
        >
          Add to Google Calendar
        </a>
        <button
          type="button"
          onClick={downloadIcs}
          className="inline-flex min-h-[44px] items-center rounded-xl border border-[#E3E0D6] bg-white px-4 text-xs font-semibold text-[#4B6560] hover:bg-[#F7F5F0] transition"
        >
          Download .ics (Apple / Outlook)
        </button>
      </div>
    </section>
  );
}

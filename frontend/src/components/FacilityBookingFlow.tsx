"use client";

import { Lock } from "lucide-react";

import { useState } from "react";
import { formatNaira } from "@riomed/backend/core/money";
import { lagosDay, lagosDayKey, lagosTimeOnly } from "@/lib/format";
import { holdAction } from "@/app/actions";

interface SlotItem {
  id: string;
  start: Date;
  end: Date;
  remaining: number;
}

interface TestOffer {
  testCode: string;
  testName: string;
  priceKobo: number;
  turnaroundHours: number;
}

interface FacilityBookingFlowProps {
  facilityId: string;
  tests: TestOffer[];
  slots: SlotItem[];
  initialTestCode?: string;
  backUrl: string;
}

export function FacilityBookingFlow({
  tests,
  slots,
  initialTestCode = "",
  backUrl,
}: FacilityBookingFlowProps) {
  const [selectedTestCode, setSelectedTestCode] = useState(
    initialTestCode || tests[0]?.testCode || ""
  );

  const selectedTest = tests.find((t) => t.testCode === selectedTestCode) ?? tests[0];

  // Group slots by day
  const daysMap = new Map<string, SlotItem[]>();
  for (const s of slots) {
    const k = lagosDayKey(new Date(s.start));
    daysMap.set(k, [...(daysMap.get(k) ?? []), s]);
  }

  const daysList = [...daysMap.entries()];
  const [selectedDayKey, setSelectedDayKey] = useState<string>(
    daysList[0]?.[0] ?? ""
  );

  const currentSlots = daysMap.get(selectedDayKey) ?? [];
  const [selectedSlotId, setSelectedSlotId] = useState<string>(
    currentSlots[0]?.id ?? ""
  );

  const selectedSlot = slots.find((s) => s.id === selectedSlotId);

  return (
    <div className="space-y-5">
      {/* 1. SELECT MEDICAL TEST */}
      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5 shadow-2xs space-y-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
          1. Select Medical Test
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {tests.map((t) => (
            <button
              key={t.testCode}
              type="button"
              onClick={() => setSelectedTestCode(t.testCode)}
              className={`rounded-xl border p-3 text-left transition ${
                selectedTestCode === t.testCode
                  ? "border-primary bg-primary-soft ring-1 ring-primary"
                  : "border-border bg-surface hover:bg-background"
              }`}
            >
              <div className="flex justify-between items-baseline gap-2">
                <span className="font-heading font-bold text-xs sm:text-sm text-foreground">
                  {t.testName}
                </span>
                <span className="font-bold text-xs text-primary-strong">
                  {formatNaira(t.priceKobo)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Results ready in ~{t.turnaroundHours} hours
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* 2. SELECT APPOINTMENT DAY & TIME */}
      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5 shadow-2xs space-y-4">
        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
          2. Choose Date &amp; Time Slot
        </label>

        {daysList.length === 0 ? (
          <p className="text-xs text-subtle-foreground">No available slots found for this facility.</p>
        ) : (
          <div className="space-y-3">
            {/* Day Selector Pills */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {daysList.map(([k, sList]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setSelectedDayKey(k);
                    const firstAvail = sList.find((s) => s.remaining > 0);
                    if (firstAvail) setSelectedSlotId(firstAvail.id);
                  }}
                  className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-heading font-bold whitespace-nowrap transition border ${
                    selectedDayKey === k
                      ? "bg-primary-strong text-white border-primary-strong shadow-xs"
                      : "bg-background text-muted-foreground border-border hover:bg-primary-soft"
                  }`}
                >
                  {lagosDay(new Date(sList[0].start))}
                </button>
              ))}
            </div>

            {/* Time Slot Buttons matching Design System Slide 3 */}
            <div className="flex flex-wrap gap-2 pt-1">
              {currentSlots.map((s) => {
                const full = s.remaining === 0;
                const isSelected = selectedSlotId === s.id;

                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={full}
                    onClick={() => setSelectedSlotId(s.id)}
                    className={`min-h-[44px] min-w-[76px] rounded-xl px-3.5 py-2 text-xs sm:text-sm font-heading font-semibold transition border ${
                      full
                        ? "bg-border-soft text-border-strong border-border line-through cursor-not-allowed"
                        : isSelected
                        ? "bg-primary text-white border-primary shadow-xs ring-2 ring-primary/30"
                        : "bg-background text-muted-foreground border-border hover:bg-primary-soft hover:text-primary-strong hover:border-primary"
                    }`}
                  >
                    {lagosTimeOnly(new Date(s.start))}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* 3. PRICE SUMMARY & CHECKOUT CARD (Exact Slide 3 Mockup) */}
      {selectedTest && (
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-4">
          <h3 className="font-heading font-bold text-sm text-foreground">
            Booking Summary
          </h3>

          <div className="space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>{selectedTest.testName}</span>
              <span className="font-semibold text-foreground">
                {formatNaira(selectedTest.priceKobo)}
              </span>
            </div>

            <div className="flex justify-between text-muted-foreground">
              <span>Platform fee</span>
              <span className="font-semibold text-primary-strong">₦0 (Free)</span>
            </div>

            {selectedSlot && (
              <div className="flex justify-between text-muted-foreground pt-1">
                <span>Selected Time</span>
                <span className="font-semibold text-foreground">
                  {lagosDay(new Date(selectedSlot.start))}, {lagosTimeOnly(new Date(selectedSlot.start))}
                </span>
              </div>
            )}

            <div className="h-px bg-border-soft my-2" />

            <div className="flex justify-between items-baseline font-bold text-base">
              <span className="text-foreground">Total</span>
              <span className="font-heading font-extrabold text-xl text-primary-strong">
                {formatNaira(selectedTest.priceKobo)}
              </span>
            </div>
          </div>

          {/* Form submitting to holdAction */}
          <form action={holdAction}>
            <input type="hidden" name="slotId" value={selectedSlotId} />
            <input type="hidden" name="testCode" value={selectedTestCode} />
            <input type="hidden" name="back" value={backUrl} />

            <button
              type="submit"
              disabled={!selectedSlotId}
              className="w-full min-h-[48px] rounded-xl bg-accent font-heading font-bold text-white text-base hover:bg-accent active:scale-[0.98] transition shadow-xs flex items-center justify-center gap-2 disabled:bg-border disabled:text-subtle-foreground disabled:cursor-not-allowed"
            >
              <span>Pay with Paystack →</span>
            </button>
          </form>

          <p className="text-center text-xs text-subtle-foreground">
            <Lock className="inline h-3.5 w-3.5 align-[-2px]" aria-hidden /> Slots are held exclusively for 15 minutes while payment is verified.
          </p>
        </section>
      )}
    </div>
  );
}

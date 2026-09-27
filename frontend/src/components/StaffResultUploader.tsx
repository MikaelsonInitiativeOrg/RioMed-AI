"use client";

import { useState } from "react";
import { uploadResultAction } from "@/app/actions";

interface StaffResultUploaderProps {
  appointmentId: string;
  reference: string;
  testName: string;
  resultCount?: number;
}

export function StaffResultUploader({
  appointmentId,
  reference,
  testName,
  resultCount = 0,
}: StaffResultUploaderProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center rounded-md border-[1.5px] border-[#0E6B5C] bg-white px-3 py-1.5 text-xs font-heading font-bold text-[#0E6B5C] hover:bg-[#F3FAF8] active:scale-[0.98] transition shadow-2xs"
      >
        {resultCount > 0 ? "Upload update (v2)" : "Upload result"}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-md rounded-2xl border border-[#E3E0D6] bg-white p-6 shadow-xl text-left">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-[#4B6560] hover:text-[#12262B] p-1 rounded-lg text-lg min-h-[36px] min-w-[36px] flex items-center justify-center"
              aria-label="Close modal"
            >
              ✕
            </button>

            <h3 className="font-heading font-bold text-lg text-[#0A5347] mb-1">
              Upload Official Result PDF
            </h3>
            <p className="text-xs text-[#4B6560] mb-4">
              Booking Ref: <strong className="font-mono text-[#12262B]">{reference}</strong> · Test: {testName}
            </p>

            <form action={uploadResultAction} className="space-y-4">
              <input type="hidden" name="appointmentId" value={appointmentId} />

              <div className="rounded-xl border border-dashed border-[#0E6B5C]/40 bg-[#F3FAF8] p-4 text-center">
                <label className="block text-xs font-semibold text-[#0A5347] mb-2 cursor-pointer">
                  Select official PDF document:
                </label>
                <input
                  type="file"
                  name="file"
                  accept="application/pdf"
                  required
                  className="w-full text-xs text-[#4B6560] file:mr-2 file:min-h-[36px] file:rounded-lg file:border-0 file:bg-[#0E6B5C] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-[#0A5347] cursor-pointer"
                />
                <p className="mt-2 text-[11px] text-[#8B9490]">
                  Accepts PDF up to 10 MB. Link expires in 5 min for security.
                </p>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg border border-[#E3E0D6] px-4 py-2 text-xs font-semibold text-[#4B6560] hover:bg-[#F7F5F0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#0E6B5C] px-4 py-2 text-xs font-heading font-bold text-white shadow-xs hover:bg-[#0A5347]"
                >
                  Upload &amp; Notify Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

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
        className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center rounded-md border-[1.5px] border-primary bg-surface px-3 py-1.5 text-sm font-heading font-bold text-primary hover:bg-primary-soft active:scale-[0.98] transition shadow-2xs"
      >
        {resultCount > 0 ? "Upload update (v2)" : "Upload result"}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl text-left">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg text-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close modal"
            >
              ✕
            </button>

            <h3 className="font-heading font-bold text-lg text-primary-strong mb-1">
              Upload Official Result PDF
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Booking Ref: <strong className="font-mono text-foreground">{reference}</strong> · Test: {testName}
            </p>

            <form action={uploadResultAction} className="space-y-4">
              <input type="hidden" name="appointmentId" value={appointmentId} />

              <div className="rounded-xl border border-dashed border-primary/40 bg-primary-soft p-4 text-center">
                <label className="block text-xs font-semibold text-primary-strong mb-2 cursor-pointer">
                  Select official PDF document:
                </label>
                <input
                  type="file"
                  name="file"
                  accept="application/pdf"
                  required
                  className="w-full text-xs text-muted-foreground file:mr-2 file:min-h-[44px] file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-primary-strong cursor-pointer"
                />
                <p className="mt-2 text-xs text-subtle-foreground">
                  Accepts PDF up to 10 MB. Link expires in 5 min for security.
                </p>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-background"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-heading font-bold text-white shadow-xs hover:bg-primary-strong"
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

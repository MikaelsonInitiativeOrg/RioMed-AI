"use client";

import { AlertTriangle } from "lucide-react";

import { useEffect, useState } from "react";

interface HoldCountdownProps {
  expiresAt: string | Date;
  onExpire?: () => void;
}

export function HoldCountdown({ expiresAt, onExpire }: HoldCountdownProps) {
  const target = new Date(expiresAt).getTime();
  const [remainingMs, setRemainingMs] = useState<number>(() => Math.max(0, target - Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.max(0, target - Date.now());
      setRemainingMs(diff);
      if (diff <= 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [target, onExpire]);

  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const isUrgent = totalSeconds < 300; // less than 5 minutes

  if (remainingMs <= 0) {
    return (
      <div className="rounded-2xl border border-warning/30 bg-warning-soft p-4 text-xs sm:text-sm text-warning-foreground font-semibold flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" aria-hidden /><span>Hold expired. This slot was released.</span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border p-4 flex items-center gap-3 transition ${
        isUrgent
          ? "border-danger/40 bg-danger-soft text-danger-foreground"
          : "border-primary/30 bg-primary-soft text-primary-strong"
      }`}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface shadow-2xs shrink-0 text-base">
        ⏱
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-heading font-bold text-sm">
          Slot held — expires in{" "}
          <span className="font-mono tracking-wider font-extrabold text-base">
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </span>
        </div>
        <p className="text-xs opacity-90 mt-0.5">
          {isUrgent
            ? "Complete payment now before your reservation is released to other patients."
            : "Reserved exclusively for you while Paystack processes payment."}
        </p>
      </div>
    </div>
  );
}

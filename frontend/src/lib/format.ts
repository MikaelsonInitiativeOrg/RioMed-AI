const TZ = "Africa/Lagos";

export function lagosDateTime(d: Date): string {
  return new Intl.DateTimeFormat("en-NG", { timeZone: TZ, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(d);
}

export function lagosDay(d: Date): string {
  return new Intl.DateTimeFormat("en-NG", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(d);
}

export function lagosTimeOnly(d: Date): string {
  return new Intl.DateTimeFormat("en-NG", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(d);
}

export function lagosDayKey(d: Date): string {
  return new Date(d.getTime() + 3600_000).toISOString().slice(0, 10);
}

export const FACILITY_TYPE_LABEL: Record<string, string> = {
  hospital: "Hospital",
  clinic: "Clinic",
  laboratory: "Laboratory",
  diagnostic_centre: "Diagnostic centre",
  primary_health_centre: "Primary health centre",
};

export const STATUS_LABEL: Record<string, string> = {
  HELD: "Held, awaiting payment",
  PENDING_PAYMENT: "Awaiting payment",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked in",
  COMPLETED: "Completed",
  RESULT_AVAILABLE: "Result available",
  EXPIRED: "Hold expired",
  CANCELLED_BY_PATIENT: "Cancelled",
  CANCELLED_BY_FACILITY: "Cancelled by facility",
  NO_SHOW: "No-show",
  REFUNDED: "Refunded",
};

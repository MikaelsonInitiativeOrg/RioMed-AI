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

export function lagosDayMonth(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-NG", { timeZone: TZ, day: "numeric", month: "long" }).format(d);
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

export function getStatusBadgeTheme(status: string): { bg: string; text: string; border: string; dot: string } {
  switch (status) {
    case "CONFIRMED":
    case "RESULT_AVAILABLE":
      return { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200", dot: "bg-emerald-500" };
    case "HELD":
    case "PENDING_PAYMENT":
      return { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200", dot: "bg-amber-500" };
    case "CHECKED_IN":
      return { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200", dot: "bg-blue-500" };
    case "COMPLETED":
      return { bg: "bg-teal-50", text: "text-teal-800", border: "border-teal-200", dot: "bg-teal-500" };
    case "CANCELLED_BY_PATIENT":
    case "CANCELLED_BY_FACILITY":
      return { bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-200", dot: "bg-rose-500" };
    case "REFUNDED":
      return { bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200", dot: "bg-purple-500" };
    case "EXPIRED":
    case "NO_SHOW":
    default:
      return { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200", dot: "bg-slate-400" };
  }
}


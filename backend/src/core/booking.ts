import { randomBytes } from "node:crypto";

export const APPOINTMENT_STATUSES = [
  "HELD",
  "PENDING_PAYMENT",
  "CONFIRMED",
  "CHECKED_IN",
  "COMPLETED",
  "RESULT_AVAILABLE",
  "EXPIRED",
  "CANCELLED_BY_PATIENT",
  "CANCELLED_BY_FACILITY",
  "NO_SHOW",
  "REFUNDED",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

const TRANSITIONS: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  HELD: ["PENDING_PAYMENT", "CONFIRMED", "EXPIRED", "CANCELLED_BY_PATIENT"],
  PENDING_PAYMENT: ["CONFIRMED", "EXPIRED", "CANCELLED_BY_PATIENT"],
  EXPIRED: ["CONFIRMED", "REFUNDED"],
  CONFIRMED: ["CHECKED_IN", "CANCELLED_BY_PATIENT", "CANCELLED_BY_FACILITY", "NO_SHOW"],
  CHECKED_IN: ["COMPLETED", "RESULT_AVAILABLE"],
  COMPLETED: ["RESULT_AVAILABLE"],
  CANCELLED_BY_PATIENT: ["REFUNDED"],
  CANCELLED_BY_FACILITY: ["REFUNDED"],
  NO_SHOW: [],
  REFUNDED: [],
  RESULT_AVAILABLE: [],
};

export function isAppointmentStatus(s: unknown): s is AppointmentStatus {
  return typeof s === "string" && (APPOINTMENT_STATUSES as readonly string[]).includes(s);
}

export function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  if (!isAppointmentStatus(from) || !isAppointmentStatus(to)) return false;
  return TRANSITIONS[from].includes(to);
}

export class InvalidTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Invalid appointment transition ${from} -> ${to}`);
    this.name = "InvalidTransitionError";
  }
}

export function assertTransition(from: AppointmentStatus, to: AppointmentStatus): void {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
}

const HOLDING: readonly AppointmentStatus[] = ["HELD", "PENDING_PAYMENT", "CONFIRMED"];
const RELEASING: readonly AppointmentStatus[] = ["EXPIRED", "CANCELLED_BY_PATIENT", "CANCELLED_BY_FACILITY"];

export function releasesCapacity(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return HOLDING.includes(from) && RELEASING.includes(to);
}

export function acquiresCapacity(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return from === "EXPIRED" && to === "CONFIRMED";
}

export const HOLD_MINUTES = 15 as const;
export const MAX_ACTIVE_HOLDS_PER_PATIENT = 2 as const;

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 chars: no 0, O, 1, I

export function generateBookingReference(rand: (n: number) => Uint8Array = (n) => randomBytes(n)): string {
  const bytes = rand(8);
  let out = "";
  for (let i = 0; i < 8; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return `RM-${out.slice(0, 4)}-${out.slice(4)}`;
}

export function isSlotBookable(slotStart: Date, now: Date, minNoticeMinutes = 60): boolean {
  return slotStart.getTime() - now.getTime() >= minNoticeMinutes * 60_000;
}

/**
 * Direct bank transfer (2026-09-27, product owner decision; replaces Paystack for now).
 * Patients pay the facility's own business account; the facility confirms receipt.
 * A facility without complete bank details can't take online bookings; patients call it instead.
 */

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

type Check<T> = { ok: true; value: T } | { ok: false; error: string };

function clean(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/** Nigerian NUBAN account numbers are 10 digits. Spaces and dashes are ignored. */
export function checkBankDetails(input: { bankName: unknown; accountNumber: unknown; accountName: unknown }): Check<BankDetails> {
  const bankName = clean(input.bankName, 60);
  if (bankName.length < 2) return { ok: false, error: "Enter the bank name for your business account." };
  const accountNumber = typeof input.accountNumber === "string" ? input.accountNumber.replace(/[\s-]/g, "") : "";
  if (!/^\d{10}$/.test(accountNumber)) return { ok: false, error: "Enter the 10-digit business account number (NUBAN)." };
  const accountName = clean(input.accountName, 80);
  if (accountName.length < 3) return { ok: false, error: "Enter the account name exactly as the bank shows it." };
  return { ok: true, value: { bankName, accountNumber, accountName } };
}

/** Bookable online only with a complete account to pay into. */
export function hasBankDetails(f: { bankName?: string | null; accountNumber?: string | null; accountName?: string | null }): boolean {
  return !!f.bankName && !!f.accountName && /^\d{10}$/.test(f.accountNumber ?? "");
}

/** The patient's transfer narration: the booking reference, so the facility can match the payment. */
export function transferNarration(reference: string): string {
  return reference.replace(/[^A-Z0-9-]/gi, "").toUpperCase().slice(0, 30);
}

/** How long a slot stays held after the patient says the transfer was sent, waiting for the facility. */
export const TRANSFER_CONFIRM_HOURS = 48 as const;

export function checkEmail(v: unknown): Check<string> {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  if (s.length > 120 || !/^[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}$/.test(s)) return { ok: false, error: "Enter a valid email address." };
  return { ok: true, value: s };
}

/** Input rules for real accounts. Pure; the server hashes and stores. */

export type Check = { ok: true; value: string } | { ok: false; error: string };

export function checkUsername(raw: unknown): Check {
  if (typeof raw !== "string") return { ok: false, error: "Enter a username." };
  const v = raw.trim().toLowerCase();
  if (!/^[a-z0-9_.]{3,30}$/.test(v)) return { ok: false, error: "Username: 3–30 letters, numbers, dots or underscores." };
  if (/^[._]|[._]$/.test(v)) return { ok: false, error: "Username can't start or end with a dot or underscore." };
  return { ok: true, value: v };
}

export function checkPassword(raw: unknown, username?: string): Check {
  if (typeof raw !== "string" || raw.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
  if (raw.length > 128) return { ok: false, error: "Password is too long (max 128)." };
  if (username && raw.toLowerCase().includes(username.toLowerCase())) return { ok: false, error: "Password can't contain your username." };
  if (/^(.)\1+$/.test(raw) || ["password", "password1", "12345678", "123456789", "qwertyui"].includes(raw.toLowerCase())) {
    return { ok: false, error: "That password is too easy to guess." };
  }
  return { ok: true, value: raw };
}

function isSequential(d: string): boolean {
  const up = "0123456789012345";
  const down = "9876543210987654";
  return up.includes(d) || down.includes(d);
}

export function checkPin(raw: unknown): Check {
  if (typeof raw !== "string" || !/^\d{4,6}$/.test(raw)) return { ok: false, error: "PIN must be 4–6 digits." };
  if (/^(\d)\1+$/.test(raw) || isSequential(raw)) return { ok: false, error: "Choose a PIN that isn't repeated or in order (like 1111 or 1234)." };
  return { ok: true, value: raw };
}

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;

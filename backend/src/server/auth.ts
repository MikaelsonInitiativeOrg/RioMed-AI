import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/** HMAC signing for the demo session cookie and result download links. */
export function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET must be set (16+ chars)");
  return "dev-only-insecure-secret-change-me";
}

export function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export function verifySigned(value: string, sig: string): boolean {
  const expected = sign(value);
  return sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

/** 5-minute signed link to a result file (FR-063). */
export function resultLink(resultId: string, now = Date.now()): string {
  const exp = now + 5 * 60_000;
  return `/api/results/${resultId}?exp=${exp}&sig=${sign(`${resultId}.${exp}`)}`;
}

export function verifyResultLink(resultId: string, exp: number, sig: string, now = Date.now()): boolean {
  return Number.isFinite(exp) && exp >= now && verifySigned(`${resultId}.${exp}`, sig);
}

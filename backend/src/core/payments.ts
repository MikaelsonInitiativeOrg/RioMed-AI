import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

/** FR-053/FR-056: HMAC-SHA512 of the raw body, hex, constant-time compare. Fails closed. */
export function verifyPaystackSignature(
  rawBody: string,
  signature: string | null | undefined,
  secret: string | null | undefined,
): boolean {
  if (typeof rawBody !== "string" || !rawBody) return false;
  if (typeof signature !== "string" || !signature) return false;
  if (typeof secret !== "string" || !secret) return false;
  const expected = createHmac("sha512", secret).update(rawBody, "utf8").digest("hex");
  const given = signature.trim().toLowerCase();
  if (given.length !== expected.length || !/^[0-9a-f]+$/.test(given)) return false;
  return timingSafeEqual(Buffer.from(given, "utf8"), Buffer.from(expected, "utf8"));
}

const VerifiedData = z.object({
  status: z.string(),
  reference: z.string(),
  amount: z.number().int(),
  currency: z.string(),
});

export function checkVerifiedTransaction(
  data: unknown,
  expected: { reference: string; amountKobo: number },
): { ok: true } | { ok: false; reason: string } {
  try {
    const parsed = VerifiedData.safeParse(data);
    if (!parsed.success) return { ok: false, reason: "malformed" };
    const d = parsed.data;
    if (d.status !== "success") return { ok: false, reason: `status:${d.status}` };
    if (!expected || d.reference !== expected.reference) return { ok: false, reason: "reference_mismatch" };
    if (d.amount !== expected.amountKobo) return { ok: false, reason: "amount_mismatch" };
    if (d.currency !== "NGN") return { ok: false, reason: "currency_mismatch" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "error" };
  }
}

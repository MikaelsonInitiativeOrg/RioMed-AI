import "server-only";
import { checkVerifiedTransaction } from "../core/payments";

/** Paystack TEST mode for the hackathon. Without a key the app uses a labelled simulated payment. */
export function paystackEnabled(): boolean {
  const k = process.env.PAYSTACK_SECRET_KEY ?? "";
  return k.startsWith("sk_test_") || k.startsWith("sk_live_");
}

async function call(path: string, init?: RequestInit) {
  const res = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as { status?: boolean; message?: string; data?: unknown } | null;
  if (!res.ok || !json?.status) throw new Error(`Paystack ${path}: ${json?.message ?? res.status}`);
  return json.data;
}

export async function initializeTransaction(input: { reference: string; amountKobo: number; email: string; callbackUrl: string }) {
  const data = (await call("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      reference: input.reference,
      amount: input.amountKobo,
      currency: "NGN",
      email: input.email,
      callback_url: input.callbackUrl,
      channels: ["card", "bank", "ussd", "bank_transfer"],
    }),
  })) as { authorization_url: string };
  return data.authorization_url;
}

export async function verifyTransaction(reference: string, amountKobo: number) {
  const data = await call(`/transaction/verify/${encodeURIComponent(reference)}`);
  return checkVerifiedTransaction(data, { reference, amountKobo });
}

export async function refundTransaction(reference: string) {
  await call("/refund", { method: "POST", body: JSON.stringify({ transaction: reference }) });
}

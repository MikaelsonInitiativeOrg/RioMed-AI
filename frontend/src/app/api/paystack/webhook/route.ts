import { verifyPaystackSignature } from "@riomed/backend/core/payments";
import { recordWebhookEvent, setWebhookOutcome } from "@riomed/backend/server/queries";
import { completePayment } from "@riomed/backend/server/payments";

export const dynamic = "force-dynamic";

/** FR-053/054/056: signature on the RAW body, fail closed, idempotent by event key. */
export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyPaystackSignature(raw, request.headers.get("x-paystack-signature"), process.env.PAYSTACK_SECRET_KEY)) {
    console.warn("paystack webhook: invalid signature");
    return new Response("invalid signature", { status: 401 });
  }
  let event: { event?: string; data?: { reference?: string; id?: number } };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("bad json", { status: 400 });
  }
  const reference = event.data?.reference;
  const key = `${event.event}:${reference ?? event.data?.id ?? "none"}`;
  if (!(await recordWebhookEvent(key, "paystack"))) return new Response("duplicate", { status: 200 }); // already processed
  if (event.event === "charge.success" && reference) {
    const r = await completePayment(reference);
    await setWebhookOutcome(key, r.ok ? r.outcome : `rejected:${r.reason}`);
  }
  return new Response("ok", { status: 200 });
}

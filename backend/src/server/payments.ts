import "server-only";
import { randomUUID } from "node:crypto";
import type { Actor } from "../core/access";
import { prisma } from "./db";
import { BookingError, confirmPaid, expireStaleHolds, markPendingPayment } from "./booking";
import { initializeTransaction, paystackEnabled, refundTransaction, verifyTransaction } from "./paystack";

export function appUrl(): string {
  return (process.env.APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")).replace(/\/+$/, "");
}

/** Returns the URL the patient should go to next (Paystack checkout, or the labelled simulated page). */
export async function startPayment(actor: Actor | null, appointmentId: string): Promise<string> {
  await expireStaleHolds();
  const a = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!a || !actor || actor.role !== "patient" || a.patientUserId !== actor.userId) throw new BookingError("NOT_ALLOWED");
  if (a.status !== "HELD" && a.status !== "PENDING_PAYMENT") throw new BookingError("INVALID", "This booking can no longer be paid.");

  const reference = `RMPAY-${randomUUID()}`;
  const provider = paystackEnabled() ? "paystack" : "simulated";
  await prisma.payment.create({
    data: { id: randomUUID(), appointmentId: a.id, provider, providerReference: reference, amountKobo: a.amountKobo, status: "initialized" },
  });

  if (provider === "simulated") return `/pay/simulated?reference=${encodeURIComponent(reference)}`;

  const url = await initializeTransaction({
    reference,
    amountKobo: a.amountKobo,
    // Demo patients have no email; Paystack requires one. Synthetic address, never a real person.
    email: `${a.patientUserId}@demo.riomed.invalid`,
    callbackUrl: `${appUrl()}/pay/callback`,
  });
  if (a.status === "HELD") await markPendingPayment(a.id);
  return url;
}

/**
 * Confirm a payment by reference. Paystack payments are ALWAYS verified server-side first (FR-053);
 * the redirect or webhook alone never confirms. Safe to call repeatedly (FR-054).
 */
export async function completePayment(reference: string, opts: { simulated?: boolean } = {}) {
  const p = await prisma.payment.findUnique({ where: { providerReference: reference } });
  if (!p) return { ok: false as const, reason: "unknown reference" };
  if (p.provider === "simulated" && !opts.simulated) return { ok: false as const, reason: "simulated payment via wrong path" };
  if (p.provider === "paystack") {
    const v = await verifyTransaction(reference, p.amountKobo);
    if (!v.ok) {
      await prisma.payment.updateMany({ where: { id: p.id, status: "initialized" }, data: { status: "failed" } });
      return { ok: false as const, reason: v.reason, appointmentId: p.appointmentId };
    }
  }
  await prisma.payment.updateMany({ where: { id: p.id, status: { not: "success" } }, data: { status: "success", verifiedAt: new Date() } });
  const outcome = await confirmPaid(p.appointmentId);
  if (outcome === "REFUND_REQUIRED" && p.provider === "paystack") {
    await refundTransaction(reference).catch((e) => console.error("refund failed", reference, e instanceof Error ? e.message : e));
  }
  return { ok: true as const, outcome, appointmentId: p.appointmentId };
}

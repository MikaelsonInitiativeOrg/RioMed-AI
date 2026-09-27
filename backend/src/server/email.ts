import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "./db";

/**
 * Demo email (2026-09-27): every notification is written to an outbox and shown in the app's
 * Inbox page instead of being sent. Swapping in a real provider only changes deliver().
 * A failed notification never breaks the booking or sign-in that triggered it.
 */

export type EmailKind =
  | "account_created"
  | "signin"
  | "password_reset"
  | "booking_held"
  | "transfer_sent"
  | "booking_new"
  | "booking_confirmed";

export async function sendEmail(msg: { to: string | null | undefined; toUserId?: string | null; facilityId?: string | null; kind: EmailKind; subject: string; body: string }) {
  if (!msg.to) return false;
  try {
    await prisma.emailMessage.create({
      data: { id: randomUUID(), toAddress: msg.to, toUserId: msg.toUserId ?? null, facilityId: msg.facilityId ?? null, kind: msg.kind, subject: msg.subject.slice(0, 200), body: msg.body.slice(0, 4000) },
    });
    return true;
  } catch {
    return false;
  }
}

/** A user's own emails, plus their facility's if they are facility staff. Newest first. */
export async function listInbox(actor: { userId: string; role: string; facilityId?: string | null } | null) {
  if (!actor) return null;
  const facility = (actor.role === "facility_staff" || actor.role === "facility_admin") && actor.facilityId ? actor.facilityId : null;
  return prisma.emailMessage.findMany({
    where: { OR: [{ toUserId: actor.userId }, ...(facility ? [{ facilityId: facility }] : [])] },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export function appUrl(path: string): string {
  const base = (process.env.APP_URL || "https://riomed-ai.vercel.app").replace(/\/$/, "");
  return `${base}${path}`;
}

import "server-only";
import { getTest } from "../core/catalog";
import { formatNaira } from "../core/money";
import { transferNarration } from "../core/bankDetails";
import { prisma } from "./db";
import { appUrl, sendEmail } from "./email";

/** Booking and account notifications (demo outbox). Each call is best-effort and never throws. */

const WAT = new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

async function load(appointmentId: string) {
  return prisma.appointment.findUnique({ where: { id: appointmentId }, include: { facility: true, patient: true, slot: true } });
}

function facilityInbox(f: { email: string | null; name: string }) {
  return f.email ?? `${f.name} desk (no email on file)`;
}

export async function notifyAccountCreated(userId: string) {
  try {
    const u = await prisma.user.findUnique({ where: { id: userId }, include: { facility: true } });
    if (!u?.email) return;
    const isFacility = u.role !== "patient";
    await sendEmail({
      to: u.email, toUserId: u.id, kind: "account_created",
      subject: isFacility ? `Welcome to RioMed: ${u.facility?.name ?? "your facility"} is listed` : "Welcome to RioMed",
      body: isFacility
        ? `Hi ${u.name},\n\n${u.facility?.name ?? "Your facility"} is now on RioMed. Patients can book your open slots and pay by transfer to ${u.facility?.bankName ?? "your account"} ${u.facility?.accountNumber ?? ""}.\n\nManage bookings and prices: ${appUrl("/staff")}`
        : `Hi ${u.name},\n\nYour RioMed account (@${u.username}) is ready. Search for a test, book a slot, and your results will be kept here.\n\n${appUrl("/")}`,
    });
  } catch {}
}

export async function notifySignIn(userId: string, method: "password" | "pin") {
  try {
    const u = await prisma.user.findUnique({ where: { id: userId } });
    if (!u?.email) return;
    await sendEmail({
      to: u.email, toUserId: u.id, kind: "signin",
      subject: "New sign-in to your RioMed account",
      body: `Hi ${u.name},\n\nYour account @${u.username} was signed in with your ${method === "pin" ? "PIN on a remembered device" : "password"} at ${WAT.format(new Date())} (Lagos time).\n\nNot you? Reset your password: ${appUrl("/account?mode=forgot")}`,
    });
  } catch {}
}

export async function notifyBookingHeld(appointmentId: string) {
  try {
    const a = await load(appointmentId);
    if (!a) return;
    const test = getTest(a.testCode)?.name ?? a.testCode;
    const when = WAT.format(a.slot.start);
    const amount = formatNaira(a.amountKobo);
    const ref = transferNarration(a.reference);
    if (a.patient.email) {
      await sendEmail({
        to: a.patient.email, toUserId: a.patient.id, kind: "booking_held",
        subject: `Slot held: ${test} at ${a.facility.name}, ${when}`,
        body: `Hi ${a.patient.name},\n\nWe're holding ${when} for ${test} at ${a.facility.name}.\n\nTo confirm, transfer ${amount} to:\n  ${a.facility.bankName}\n  ${a.facility.accountNumber}\n  ${a.facility.accountName}\nUse this reference as the narration: ${ref}\n\nThen tap "I've sent the transfer": ${appUrl(`/appointments/${a.id}`)}`,
      });
    }
    await sendEmail({
      to: facilityInbox(a.facility), facilityId: a.facilityId, kind: "booking_new",
      subject: `New booking ${a.reference}: ${test}, ${when}`,
      body: `${a.patient.name} booked ${test} for ${when}. Amount ${amount}, paid by transfer with reference ${ref}.\n\nThe slot is held; you'll get another email when they say the transfer was sent. Desk: ${appUrl("/staff")}`,
    });
  } catch {}
}

export async function notifyTransferSent(appointmentId: string) {
  try {
    const a = await load(appointmentId);
    if (!a) return;
    const test = getTest(a.testCode)?.name ?? a.testCode;
    await sendEmail({
      to: facilityInbox(a.facility), facilityId: a.facilityId, kind: "transfer_sent",
      subject: `Check your account: ${formatNaira(a.amountKobo)} for ${a.reference}`,
      body: `${a.patient.name} says they transferred ${formatNaira(a.amountKobo)} to ${a.facility.accountNumber} with reference ${transferNarration(a.reference)} for ${test} on ${WAT.format(a.slot.start)}.\n\nWhen it arrives, tap "Payment received" on your desk to confirm the booking: ${appUrl(`/staff?q=${a.reference}`)}`,
    });
  } catch {}
}

export async function notifyBookingConfirmed(appointmentId: string) {
  try {
    const a = await load(appointmentId);
    if (!a) return;
    const test = getTest(a.testCode)?.name ?? a.testCode;
    const when = WAT.format(a.slot.start);
    if (a.patient.email) {
      await sendEmail({
        to: a.patient.email, toUserId: a.patient.id, kind: "booking_confirmed",
        subject: `Confirmed: ${test} at ${a.facility.name}, ${when}`,
        body: `Hi ${a.patient.name},\n\n${a.facility.name} received your payment. Your booking ${a.reference} is confirmed for ${when}.\n\nAddress: ${a.facility.address}${a.facility.phone ? `\nPhone: ${a.facility.phone}` : ""}\n\nShow this reference at the desk. Your result will appear here: ${appUrl(`/appointments/${a.id}`)}`,
      });
    }
  } catch {}
}

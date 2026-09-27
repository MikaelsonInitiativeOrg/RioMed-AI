import "server-only";
import { isSlotBookable } from "../core/booking";
import { getTest } from "../core/catalog";
import { detectEmergencySafe, parseDeterministic, resolveWhen } from "../core/intent";
import { findFacilityCandidates, matchFacilityByName } from "../core/facility";
import type { Actor } from "../core/access";
import { prisma } from "./db";
import { BookingError, holdSlot } from "./booking";

export interface PromptSlot {
  id: string;
  start: Date;
  end: Date;
}

export type PromptPreview =
  | { status: "emergency" }
  | {
      status: "ready";
      facility: { id: string; name: string; address: string };
      testCode: string;
      testName: string;
      slots: PromptSlot[];
    }
  | { status: "need"; reason: string; facilities: Array<{ id: string; name: string }>; testCode: string | null };

/**
 * Turn "book a malaria test at Alausa Diagnostics tomorrow morning" into a concrete
 * facility + test + bookable slots. Creates nothing; the hold happens in promptBook().
 * Facility names match against partner facilities in the database (never the LLM),
 * and the slot still goes through holdSlot()'s atomic capacity check.
 */
export async function previewPromptBook(query: string, now = new Date()): Promise<PromptPreview> {
  const q = typeof query === "string" ? query.trim() : "";
  const partners = await prisma.facility.findMany({
    where: { isPartner: true, operational: true },
    select: { id: true, name: true, address: true },
    orderBy: { name: "asc" },
  });
  if (!q || q.length > 1000) {
    return { status: "need", reason: "Tell me the test, the clinic name, and when — for example: book a malaria test at Alausa Diagnostics tomorrow morning.", facilities: partners, testCode: null };
  }
  if (detectEmergencySafe(q).isEmergency) return { status: "emergency" };

  const named = findFacilityCandidates(q, partners);
  const facility = matchFacilityByName(q, partners);
  if (!facility) {
    return {
      status: "need",
      reason:
        named.length > 1
          ? `Which clinic did you mean — ${named.map((f) => f.name).join(", ")}?`
          : "Which clinic should I book? Name a partner clinic, for example Alausa Diagnostics.",
      facilities: named.length > 1 ? named : partners,
      testCode: null,
    };
  }

  const intent = parseDeterministic(q);
  const testCode = intent.tests[0] ?? null;
  if (!testCode) {
    return { status: "need", reason: `Which test at ${facility.name}? For example: book a malaria test at ${facility.name}.`, facilities: partners, testCode: null };
  }
  const offer = await prisma.facilityTest.findUnique({
    where: { facilityId_testCode: { facilityId: facility.id, testCode } },
  });
  const testName = getTest(testCode)?.name ?? testCode;
  if (!offer) {
    return { status: "need", reason: `${facility.name} doesn't offer ${testName}. Pick another test or clinic.`, facilities: partners, testCode };
  }

  const window = resolveWhen(intent.when, now);
  const minStart = new Date(now.getTime() + 60 * 60_000);
  const rows = await prisma.slot.findMany({
    where: {
      facilityId: facility.id,
      start: { gte: minStart, ...(window ? { lt: window.end } : {}) },
      ...(window ? { end: { gt: window.start } } : {}),
    },
    orderBy: { start: "asc" },
    take: 8,
  });
  const slots = rows
    .filter((s) => s.used < s.capacity && isSlotBookable(s.start, now))
    .slice(0, 3)
    .map((s) => ({ id: s.id, start: s.start, end: s.end }));
  if (slots.length === 0) {
    return { status: "need", reason: `No free time at ${facility.name} in that window. Try another day or clinic.`, facilities: partners, testCode };
  }
  const full = partners.find((p) => p.id === facility.id)!;
  return { status: "ready", facility: { id: full.id, name: full.name, address: full.address }, testCode, testName, slots };
}

/**
 * Book from a prompt: resolves the request, then holds the earliest slot (or the
 * chosen slotId). Payment still happens on the appointment page — a hold is not
 * a confirmation. Anonymous callers get NOT_ALLOWED (sign in first).
 */
export async function promptBook(actor: Actor | null, query: string, slotId?: string, now = new Date()): Promise<{ appointmentId: string }> {
  if (!actor || actor.role !== "patient") throw new BookingError("NOT_ALLOWED", "Sign in as a patient to book.");
  const preview = await previewPromptBook(query, now);
  if (preview.status === "emergency") throw new BookingError("INVALID", "This sounds urgent — call 112 first, then book.");
  if (preview.status === "need") throw new BookingError("INVALID", preview.reason);
  const slot = slotId ? preview.slots.find((s) => s.id === slotId) : preview.slots[0];
  if (!slot) throw new BookingError("SLOT_UNAVAILABLE", "That time was just booked. Please pick another.");
  const held = await holdSlot(actor, { slotId: slot.id, testCode: preview.testCode }, now);
  return { appointmentId: held.id };
}

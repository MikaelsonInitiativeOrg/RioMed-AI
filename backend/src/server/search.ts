import "server-only";
import { parseIntent, type IntentResult } from "../core/ai";
import { resolveLocation, type Place } from "../core/geo";
import { resolveWhen, type SearchIntent, type TimeWindow } from "../core/intent";
import { searchFacilities, type RankedFacility } from "../core/search";
import { isSlotBookable } from "../core/booking";
import { prisma } from "./db";

export interface SearchView {
  query: string;
  ai: Pick<IntentResult, "source" | "mode" | "latencyMs" | "fallbackReason" | "model">;
  emergency: IntentResult["emergency"];
  intent: SearchIntent;
  place: Place | null;
  window: TimeWindow | null;
  results: Array<RankedFacility & { type: string; ownership: "public" | "private"; area: string; address: string; phone: string | null; nhfrId: string | null; minPriceKobo: number | null; nextSlot: Date | null }>;
  radiusKm: number;
  widened: boolean;
  totalMs: number;
}

/** Structured search: used directly by the form (FR-025) and after the prompt is parsed. */
export type Found = Pick<SearchView, "place" | "window" | "results" | "radiusKm" | "widened">;

export async function searchWithIntent(intent: SearchIntent, now = new Date()): Promise<Found> {
  const place = resolveLocation(intent.locationQuery);
  const window = resolveWhen(intent.when, now);
  if (!place) return { place: null, window, results: [], radiusKm: 0, widened: false };

  const facilities = await prisma.facility.findMany({
    include: {
      tests: true,
      slots: {
        where: {
          start: { gte: new Date(now.getTime() + 60 * 60_000), ...(window ? { lt: window.end } : {}) },
          ...(window ? { end: { gt: window.start } } : {}),
        },
        orderBy: { start: "asc" },
      },
    },
  });

  const byId = new Map(facilities.map((f) => [f.id, f]));
  const candidates = facilities.map((f) => {
    const free = f.slots.filter((s) => s.used < s.capacity && isSlotBookable(s.start, now));
    return {
      id: f.id,
      name: f.name,
      lat: f.lat,
      lng: f.lng,
      operational: f.operational,
      isPartner: f.isPartner,
      offeredTests: f.tests.map((t) => t.testCode),
      hasSlotInWindow: f.isPartner && free.length > 0,
    };
  });

  const res = searchFacilities(candidates, { origin: place, testCodes: intent.tests });
  const results = res.results.map((r) => {
    const f = byId.get(r.id)!;
    const prices = f.tests.filter((t) => intent.tests.includes(t.testCode)).map((t) => t.priceKobo);
    const nextSlot = f.isPartner ? (f.slots.find((s) => s.used < s.capacity && isSlotBookable(s.start, now))?.start ?? null) : null;
    return {
      ...r,
      type: f.type,
      ownership: (f.ownership === "public" ? "public" : "private") as "public" | "private",
      area: f.area,
      address: f.address,
      phone: f.phone,
      nhfrId: f.nhfrId,
      minPriceKobo: prices.length === intent.tests.length && prices.length > 0 ? prices.reduce((a, b) => a + b, 0) : null,
      nextSlot,
    };
  });
  return { place, window, results, radiusKm: res.radiusKm, widened: res.widened };
}

export async function runPromptSearch(query: string): Promise<SearchView> {
  const t0 = Date.now();
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS) || 1500;
  const ai = await parseIntent(query, { timeoutMs });
  const found = await searchWithIntent(ai.intent);
  return {
    query,
    ai: { source: ai.source, mode: ai.mode, latencyMs: ai.latencyMs, fallbackReason: ai.fallbackReason, model: ai.model },
    emergency: ai.emergency,
    intent: ai.intent,
    ...found,
    totalMs: Date.now() - t0,
  };
}

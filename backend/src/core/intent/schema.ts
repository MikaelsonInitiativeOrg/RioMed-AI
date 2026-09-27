import { z } from "zod";
import { isKnownTestCode } from "../catalog";

export const INTENTS = ["find_test", "find_facility", "book", "emergency", "unsupported"] as const;
export const DAY_PARTS = ["morning", "afternoon", "evening", "any"] as const;
export const FACILITY_TYPES = ["hospital", "clinic", "laboratory", "diagnostic_centre", "primary_health_centre"] as const;

export type Intent = (typeof INTENTS)[number];
export type DayPart = (typeof DAY_PARTS)[number];
export type FacilityType = (typeof FACILITY_TYPES)[number];

export interface When {
  day: string | null;
  part: DayPart;
}

export interface SearchIntent {
  intent: Intent;
  tests: string[];
  locationQuery: string | null;
  when: When | null;
  facilityType: FacilityType | null;
  confidence: number;
}

const DAY_RE = /^(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{4}-\d{2}-\d{2})$/;

export const WhenSchema = z.object({
  day: z.string().regex(DAY_RE).nullable(),
  part: z.enum(DAY_PARTS),
});

export const SearchIntentSchema: z.ZodType<SearchIntent> = z.object({
  intent: z.enum(INTENTS),
  tests: z.array(z.string()).max(5),
  locationQuery: z.string().max(100).nullable(),
  when: WhenSchema.nullable(),
  facilityType: z.enum(FACILITY_TYPES).nullable(),
  confidence: z.number().min(0).max(1),
});

// Model output: every field required (no invented defaults); unknown test codes are dropped
// afterwards and extra keys are ignored.
const ModelSchema = z.object({
  intent: z.enum(INTENTS),
  tests: z.array(z.string()),
  locationQuery: z.string().max(100).nullable(),
  when: WhenSchema.nullable(),
  facilityType: z.enum(FACILITY_TYPES).nullable(),
  confidence: z.number().min(0).max(1),
});

function stripFences(s: string): string {
  const t = s.trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return m ? m[1] : t;
}

/** Validate untrusted model output. Never throws. */
export function validateModelIntent(raw: unknown): SearchIntent | null {
  try {
    let value = raw;
    if (typeof value === "string") value = JSON.parse(stripFences(value));
    const parsed = ModelSchema.safeParse(value);
    if (!parsed.success) return null;
    const tests = [...new Set(parsed.data.tests.map((t) => t.trim().toUpperCase()))].filter(isKnownTestCode).slice(0, 5);
    const locationQuery = parsed.data.locationQuery?.trim() || null;
    const out: SearchIntent = { ...parsed.data, tests, locationQuery };
    return SearchIntentSchema.safeParse(out).success ? out : null;
  } catch {
    return null;
  }
}

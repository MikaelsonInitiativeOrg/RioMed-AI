import { TEST_CATALOG } from "../catalog";
import { resolveLocation } from "../geo";
import { findPhrases } from "../text";
import { detectEmergencySafe } from "./emergency";
import type { DayPart, FacilityType, SearchIntent, When } from "./schema";

const TEST_PHRASES = TEST_CATALOG.flatMap((t) => [t.name, ...t.synonyms].map((phrase) => ({ phrase, value: t.code })));

const DAY_PHRASES = ["today", "tomorrow", "tonight", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(
  (d) => ({ phrase: d, value: d }),
);
const PART_PHRASES: Array<{ phrase: string; value: DayPart }> = [
  { phrase: "morning", value: "morning" },
  { phrase: "afternoon", value: "afternoon" },
  { phrase: "evening", value: "evening" },
];
const FACILITY_PHRASES: Array<{ phrase: string; value: FacilityType }> = [
  { phrase: "hospital", value: "hospital" },
  { phrase: "hospitals", value: "hospital" },
  { phrase: "clinic", value: "clinic" },
  { phrase: "clinics", value: "clinic" },
  { phrase: "lab", value: "laboratory" },
  { phrase: "labs", value: "laboratory" },
  { phrase: "laboratory", value: "laboratory" },
  { phrase: "laboratories", value: "laboratory" },
  { phrase: "health centre", value: "primary_health_centre" },
  { phrase: "health centres", value: "primary_health_centre" },
  { phrase: "health center", value: "primary_health_centre" },
  { phrase: "health centers", value: "primary_health_centre" },
  { phrase: "diagnostic", value: "diagnostic_centre" },
  { phrase: "diagnostic centre", value: "diagnostic_centre" },
  { phrase: "diagnostic center", value: "diagnostic_centre" },
  { phrase: "phc", value: "primary_health_centre" },
  { phrase: "primary health", value: "primary_health_centre" },
];

function parseWhen(text: string): When | null {
  const day = findPhrases(text, DAY_PHRASES)[0]?.value ?? null;
  let part = findPhrases(text, PART_PHRASES)[0]?.value ?? null;
  if (day === "tonight") return { day: "today", part: "evening" };
  if (!day && !part) return null;
  if (!part) part = "any";
  return { day, part };
}

// Words that end a place phrase ("malaria test in Abuja tomorrow morning" -> "Abuja").
const PLACE_STOP = /\b(?:today|tomorrow|tonight|this|next|on|by|for|at|from|with|please|asap|now|morning|afternoon|evening|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b.*$/i;
const NOT_PLACES = new Set(["me", "here", "my area", "my location", "the area", "town", "the morning", "the afternoon", "the evening"]);

/** A place outside the built-in list: "in/near/around <place>". The server geocodes it; never guessed here. */
export function extractPlacePhrase(text: string, opts: { searchContext?: boolean } = {}): string | null {
  const m = /\b(?:in|near|around|close to)\s+([A-Za-z][A-Za-z0-9 .,'-]{1,60})/i.exec(text);
  if (!m) return null;
  const phrase = m[1].replace(PLACE_STOP, "").replace(/[\s,.'-]+$/, "").trim();
  if (phrase.length < 2 || NOT_PLACES.has(phrase.toLowerCase())) return null;
  if (/^(?:my|your|his|her|our|their|the|a|an|this|that|pain|children|kids|pregnancy)\b/i.test(phrase)) return null;
  // Lower-case text only counts in a search context ("clinics in abuja"), not in chat ("tired in general").
  if (!/^[A-Z]/.test(phrase) && !opts.searchContext) return null;
  return phrase;
}

/** Deterministic parser: the offline, mock and timeout fallback (FR-012). Never throws. */
export function parseDeterministic(text: string): SearchIntent {
  const input = typeof text === "string" ? text.slice(0, 2000) : "";
  try {
    const tests = [...new Set(findPhrases(input, TEST_PHRASES).map((h) => h.value))].slice(0, 5);
    const place = resolveLocation(input);
    const when = parseWhen(input);
    const facilityType = findPhrases(input, FACILITY_PHRASES)[0]?.value ?? null;
    const placeText = place?.name ?? extractPlacePhrase(input, { searchContext: tests.length > 0 || !!facilityType });
    const emergency = detectEmergencySafe(input).isEmergency;

    const intent: SearchIntent["intent"] = emergency
      ? "emergency"
      : tests.length > 0
        ? "find_test"
        : facilityType || placeText
          ? "find_facility"
          : "unsupported";

    const signals = (tests.length > 0 ? 1 : 0) + (placeText ? 1 : 0) + (when ? 1 : 0);
    const confidence = intent === "unsupported" ? 0.2 : Math.min(0.9, 0.4 + 0.15 * signals);

    return { intent, tests, locationQuery: placeText, when, facilityType, confidence };
  } catch {
    return { intent: "unsupported", tests: [], locationQuery: null, when: null, facilityType: null, confidence: 0 };
  }
}

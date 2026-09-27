import { findPhrases, normalize, phraseRegex } from "./text";

export interface NamedFacility {
  id: string;
  name: string;
}

/** Words that describe a kind of building, not a specific facility. Never match on these alone. */
const GENERIC_WORDS = new Set([
  "family",
  "community",
  "general",
  "central",
  "mainland",
  "specialist",
  "primary",
  "medical",
  "health",
  "clinic",
  "clinics",
  "hospital",
  "hospitals",
  "laboratory",
  "laboratories",
  "lab",
  "labs",
  "diagnostics",
  "diagnostic",
  "centre",
  "centres",
  "center",
  "centers",
  "avenue",
  "campus",
  "town",
  "road",
  "mother",
  "child",
  "maternity",
  "coastal",
  "imaging",
  "wellness",
  "old",
  "post",
  "island",
]);

/** Signals the user is naming a building, not just an area ("test in Ikeja" must not match). */
const TYPE_PATTERN = /hospital|clinic|diagnostic|centre|center|laboratory|\blab\b|medical|maternity|\bphc\b|health\s*cent(re|er)/u;

function distinctiveTokens(name: string): string[] {
  return normalize(name)
    .split(/[^a-z0-9]+/u)
    .filter((w) => w.length >= 4 && !GENERIC_WORDS.has(w));
}

/**
 * Facilities the text names, ordered full-name hits first, then single-token hits.
 * A bare area ("malaria test in Ikeja") matches nothing: single tokens only count
 * when the text also names a kind of building ("Alausa Diagnostics", "Opebi clinic").
 * Never throws.
 */
export function findFacilityCandidates(text: string, facilities: readonly NamedFacility[]): NamedFacility[] {
  if (typeof text !== "string" || facilities.length === 0) return [];
  const full = findPhrases(
    text,
    facilities.map((f) => ({ phrase: f.name, value: f })),
  ).map((h) => h.value);
  if (full.length > 0) {
    const seen = new Set<string>();
    return full.filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true)));
  }
  if (!TYPE_PATTERN.test(normalize(text))) return [];
  const norm = ` ${normalize(text)} `;
  const hits = facilities.filter((f) =>
    distinctiveTokens(f.name).some((t) => phraseRegex(t).test(norm)),
  );
  return [...hits].sort((a, b) => a.name.localeCompare(b.name));
}

/** The single facility named, or null when none (or several) match. Never throws. */
export function matchFacilityByName(text: string, facilities: readonly NamedFacility[]): NamedFacility | null {
  const found = findFacilityCandidates(text, facilities);
  return found.length === 1 ? found[0] : null;
}

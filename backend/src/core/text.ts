/** Lowercase, straighten apostrophes, collapse whitespace. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whole-word/phrase match on normalized text. Boundaries are "not a letter or digit". */
export function phraseRegex(phrase: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(normalize(phrase))}(?![\\p{L}\\p{N}])`, "u");
}

export interface PhraseHit<T> {
  value: T;
  phrase: string;
  index: number;
}

/**
 * Find non-overlapping phrase hits, preferring longer phrases where they overlap.
 * Returned in order of appearance.
 */
export function findPhrases<T>(text: string, entries: Array<{ phrase: string; value: T }>): PhraseHit<T>[] {
  const norm = normalize(text);
  const sorted = [...entries].sort((a, b) => b.phrase.length - a.phrase.length);
  const taken: Array<[number, number]> = [];
  const hits: PhraseHit<T>[] = [];
  for (const { phrase, value } of sorted) {
    const re = new RegExp(phraseRegex(phrase).source, "gu");
    for (const m of norm.matchAll(re)) {
      const start = m.index ?? 0;
      const end = start + m[0].length;
      if (taken.some(([s, e]) => start < e && end > s)) continue;
      taken.push([start, end]);
      hits.push({ value, phrase, index: start });
    }
  }
  return hits.sort((a, b) => a.index - b.index);
}

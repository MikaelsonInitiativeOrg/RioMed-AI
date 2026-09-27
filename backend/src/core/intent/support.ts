import { getTest } from "../catalog";
import { normalize } from "../text";

/**
 * FR-017 guard for model output: a test code is kept only if the user's text actually names
 * that test (allowing small misspellings like "tyfoid" or "malria"). This stops the model
 * recommending tests from symptoms ("fever and headache" must not become malaria + typhoid).
 */

function words(s: string): string[] {
  return normalize(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

function wordMatches(target: string, tokens: string[]): boolean {
  const allowed = target.length <= 3 ? 0 : target.length <= 5 ? 1 : 2;
  return tokens.some((t) => (allowed === 0 ? t === target : Math.abs(t.length - target.length) <= allowed && editDistance(t, target) <= allowed));
}

export function isTestMentioned(code: string, text: string): boolean {
  const test = getTest(code);
  if (!test || typeof text !== "string") return false;
  const tokens = words(text);
  // Also compare the text with spaces removed, so "e/u/cr" and "eucr" line up.
  const squashed = normalize(text).replace(/[^\p{L}\p{N}]+/gu, "");
  return [test.name.replace(/\(.*?\)/g, ""), ...test.synonyms].some((phrase) => {
    const ws = words(phrase);
    if (ws.length === 0) return false;
    if (ws.length > 1 && ws.join("").length <= 5 && squashed.includes(ws.join(""))) return true;
    return ws.every((w) => wordMatches(w, tokens));
  });
}

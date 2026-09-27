/**
 * AI-010 evaluation: rule-based baseline vs the configured LLM, per field.
 * Usage: npm run eval            (baseline only when AI_PROVIDER=mock)
 *        AI_PROVIDER=groq AI_MODEL=... AI_API_KEY=... npm run eval
 * Writes eval/report.json (read by the /about page).
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseIntent } from "../src/core/ai";
import { parseDeterministic, resolveWhen, type SearchIntent, type When } from "../src/core/intent";

// Score "day" by meaning: "tomorrow" and "2026-09-28" are the same day if they resolve to the same window.
const NOW = new Date();
function sameDay(actual: When | null, expectedDay: string | null, expectedPart: string | null): boolean {
  if ((actual?.day ?? null) === expectedDay) return true;
  if (!actual || expectedDay === null) return false;
  const a = resolveWhen(actual, NOW);
  const e = resolveWhen({ day: expectedDay, part: (expectedPart ?? "any") as When["part"] }, NOW);
  return !!a && !!e && a.start.toISOString().slice(0, 10) === e.start.toISOString().slice(0, 10);
}

interface Case {
  id: string;
  text: string;
  expected: { intent: string; tests: string[]; locationQuery: string | null; day: string | null; part: string | null; emergency: boolean };
  tags: string[];
}
const FIELDS = ["intent", "tests", "locationQuery", "day", "part", "all"] as const;
type Field = (typeof FIELDS)[number];

const cases: Case[] = readFileSync(path.join(__dirname, "intents.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));

function score(i: SearchIntent, e: Case["expected"]): Record<Exclude<Field, "all">, boolean> {
  const sameTests = [...i.tests].sort().join(",") === [...e.tests].sort().join(",");
  return {
    intent: i.intent === e.intent,
    tests: sameTests,
    locationQuery: (i.locationQuery ?? null) === e.locationQuery,
    day: sameDay(i.when, e.day, e.part),
    part: (i.when?.part ?? null) === e.part,
  };
}

function tally(rows: Array<Record<Exclude<Field, "all">, boolean>>) {
  const out: Record<string, number> = {};
  for (const f of FIELDS) {
    const hits = rows.filter((r) => (f === "all" ? Object.values(r).every(Boolean) : r[f])).length;
    out[f] = Math.round((1000 * hits) / Math.max(1, rows.length)) / 10;
  }
  return out;
}

const pct = (xs: number[], p: number) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(p * xs.length))] : 0);

async function main() {
  const mode = (process.env.AI_PROVIDER ?? "mock").toLowerCase();
  const delay = Number(process.env.EVAL_DELAY_MS ?? (mode === "mock" ? 0 : 2100));
  const baseline = cases.map((c) => score(parseDeterministic(c.text), c.expected));
  const emergencyMiss = cases.filter((c) => c.expected.emergency && parseDeterministic(c.text).intent !== "emergency").map((c) => c.id);
  const falseEmergency = cases.filter((c) => !c.expected.emergency && parseDeterministic(c.text).intent === "emergency").map((c) => c.id);

  let llm: null | Record<string, unknown> = null;
  if (mode !== "mock") {
    const rows: Array<Record<Exclude<Field, "all">, boolean>> = [];
    const misses: Array<{ id: string; text: string; source: string; got: SearchIntent; fields: string[] }> = [];
    const latencies: number[] = [];
    let fallbacks = 0;
    const reasons: Record<string, number> = {};
    for (const c of cases) {
      const r = await parseIntent(c.text, { timeoutMs: Number(process.env.EVAL_TIMEOUT_MS ?? 5000) });
      if (r.source === "llm") latencies.push(r.latencyMs);
      else {
        fallbacks++;
        reasons[r.fallbackReason ?? "?"] = (reasons[r.fallbackReason ?? "?"] ?? 0) + 1;
      }
      const sc = score(r.intent, c.expected);
      rows.push(sc);
      const bad = Object.entries(sc).filter(([, ok]) => !ok).map(([k]) => k);
      if (bad.length) misses.push({ id: c.id, text: c.text, source: r.source, got: r.intent, fields: bad });
      process.stdout.write(r.source === "llm" ? "." : "f");
      if (delay) await new Promise((res) => setTimeout(res, delay));
    }
    process.stdout.write("\n");
    const emergencyMissedLlm = cases.filter((c, i) => c.expected.emergency && !rows[i].intent).map((c) => c.id);
    llm = { provider: mode, model: process.env.AI_MODEL, accuracy: tally(rows), fallbacks, fallbackReasons: reasons, latencyMs: { p50: pct(latencies, 0.5), p95: pct(latencies, 0.95) }, emergencyMissed: emergencyMissedLlm, misses };
  }

  const byTag: Record<string, Record<string, number>> = {};
  for (const tag of [...new Set(cases.flatMap((c) => c.tags))]) {
    byTag[tag] = tally(cases.map((c, i) => [c, baseline[i]] as const).filter(([c]) => c.tags.includes(tag)).map(([, r]) => r));
  }

  const report = {
    generatedAt: new Date().toISOString(),
    cases: cases.length,
    baseline: { accuracy: tally(baseline), byTag, emergencyMissed: emergencyMiss, falseEmergency },
    llm,
  };
  writeFileSync(path.join(__dirname, "report.json"), JSON.stringify(report, null, 2) + "\n");
  const summary = llm ? { ...llm, misses: undefined } : null;
  console.log(JSON.stringify({ baseline: report.baseline.accuracy, emergencyMissed: emergencyMiss, falseEmergency, llm: summary }, null, 2));
}

main();

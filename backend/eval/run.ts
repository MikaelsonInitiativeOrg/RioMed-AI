/**
 * AI-010 evaluation: rule-based baseline vs the configured LLM, per field.
 * Usage: npm run eval            (baseline only when AI_PROVIDER=mock)
 *        AI_PROVIDER=groq AI_MODEL=... AI_API_KEY=... npm run eval
 * Writes eval/report.json (read by the /about page).
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseIntent } from "../src/core/ai";
import { parseDeterministic, type SearchIntent } from "../src/core/intent";

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
    day: (i.when?.day ?? null) === e.day,
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
      rows.push(score(r.intent, c.expected));
      process.stdout.write(r.source === "llm" ? "." : "f");
      if (delay) await new Promise((res) => setTimeout(res, delay));
    }
    process.stdout.write("\n");
    llm = { provider: mode, model: process.env.AI_MODEL, accuracy: tally(rows), fallbacks, fallbackReasons: reasons, latencyMs: { p50: pct(latencies, 0.5), p95: pct(latencies, 0.95) } };
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
  console.log(JSON.stringify({ baseline: report.baseline.accuracy, emergencyMissed: emergencyMiss, falseEmergency, llm }, null, 2));
}

main();

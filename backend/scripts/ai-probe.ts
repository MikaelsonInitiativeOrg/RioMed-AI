/** Compare models through the real adapter. Reads the key from frontend/.env.local; never prints it.
 *  Usage: npx tsx scripts/ai-probe.ts <provider> <model> [<model> ...] */
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseIntent } from "../src/core/ai";

const envFile = readFileSync(path.join(__dirname, "../../frontend/.env.local"), "utf8");
const key = envFile.match(/^AI_API_KEY=([^\s#]*)/m)?.[1]?.replace(/"/g, "") ?? "";
const [provider, ...models] = process.argv.slice(2);
const prompts = [
  "I need a malaria test around Ikeja tomorrow morning",
  "abeg I wan do tyfoid and pcv test for yabba on saturday evening",
  "where can i do ful blood count near sururele",
];

async function main() {
  for (const model of models) {
    for (const p of prompts) {
      const r = await parseIntent(p, { env: { AI_PROVIDER: provider, AI_MODEL: model, AI_API_KEY: key }, timeoutMs: 8000 });
      const i = r.intent;
      console.log(`${model.padEnd(28)} ${String(r.latencyMs).padStart(5)}ms ${r.source.padEnd(8)} ${i.intent} [${i.tests}] ${i.locationQuery} ${i.when ? `${i.when.day}/${i.when.part}` : "-"}${r.fallbackReason ? "  (" + r.fallbackReason + ")" : ""}`);
    }
  }
}
main();

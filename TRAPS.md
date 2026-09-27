# Trap list

Read this at the start of every session. Add a line whenever something bites, and never remove one (BUILD-DIRECTIVE section 12).

| Trap | The rule |
|---|---|
| Model output was padded with default values (for example `confidence: 0.5`) when fields were missing | Never fill in missing model fields. Reject and fall back (validateModelIntent) |
| The local AI provider silently defaulted to a localhost URL | Local providers need an explicit loopback `AI_BASE_URL` |
| npm 11 blocks package install scripts, so the Prisma engines never download | Run `npm install-scripts approve <pkg>` for known packages, then `npm rebuild` |
| Next 16: `params`, `searchParams` and `cookies()` are async only | Always `await` them. Use the generated `PageProps<"/route">` types (`npx next typegen`) |
| `server-only` modules crash under plain `tsx` | Run server scripts with `npx tsx --conditions=react-server` |
| Backend files imported by the frontend resolve `@/…` against the frontend tsconfig | Inside `backend/src`, use relative imports only. `@/` in backend is for tests only |
| Moving `.env` breaks Prisma and Next separately | Prisma reads `backend/.env`, and Next reads `frontend/.env.local`. SQLite `file:./dev.db` resolves relative to `backend/prisma/` |
| The live model recommended tests from symptoms ("fever" became malaria + typhoid) even though the prompt forbade it | Enforce safety rules on model output in code (isTestMentioned), not only in the prompt |
| "Grounding with Google Maps" returned an empty 404 on generateContent | Maps grounding needs the Interactions API (`/v1beta/interactions`, tool `{type:"google_maps"}`) |
| Two agents editing the same working folder | Each agent uses its own clone or worktree. Never share a working tree |
| Local dev and production share one Neon database | Running `db:seed` locally wipes the live demo data. Reseed only on purpose |
| Neon was briefly unreachable from Prisma (about 10 minutes) while node-postgres could still connect | Retry before debugging config. Batch seed inserts (createMany) so the pooler does not drop long runs |
| A mock `npm run eval` overwrote report.json and wiped the live-LLM results shown on /about | eval/run.ts now carries the last live results over when no model is configured |
| The Maps-grounding prompt said "in Nigeria", so a Tunis device location returned Lagos places | Device-location searches ask for "closest to latitude X, longitude Y" and never name a country |
| The rule-based fallback missed plurals ("hospitals") and dropped "near me" requests | Facility words include plurals, and wantsNearMe() always offers "Use my location" |

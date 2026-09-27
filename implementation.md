# Implementation status: RioMed AI

Last updated: 2026-09-27 10:20 WAT, by the implementer (Claude Code, operated by the project owner)
PRD version this tracks: docs/PRD.md v2.1
Stakes tier: tier 1 for the hackathon demo (synthetic data, test-mode payments), per PRD 15.1. Tier 3 applies before any real data or money.

## Summary

The whole demo journey works locally: prompt → validated intent → ranked facilities → hold → payment (simulated or Paystack test) → check-in → PDF result → patient view. The core has 648 contract tests, written independently, and all pass. Not done yet: hosted deployment (needs a Postgres URL and Vercel), a live LLM evaluation (needs an API key), and Paystack test keys.

## Component status

| Component | PRD ref | Tier (today) | Status | ADR | Tests | Reviewed by | Adversary |
|---|---|---|---|---|---|---|---|
| Intent schema and validation | FR-010, FR-011, FR-013 | 1 | done | – | tests/core/intent-parser, ai | – | – |
| Deterministic parser | FR-012, FR-016 | 1 | done | – | tests/core/intent-parser, time | – | – |
| Emergency detection | AI-020, AI-021 | 3* | done (list is a draft) | – | tests/core/emergency | clinician pending | – |
| AI adapter | AI-001 to AI-008 | 2 | done (mock verified; live untested) | – | tests/core/ai | – | – |
| Gazetteer and geo | FR-014 | 1 | done | – | tests/core/geo | – | – |
| Ranking and radius widening | FR-020, FR-026 | 1 | done | – | tests/core/search | – | – |
| Booking state machine | FR-044 | 1 | done | – | tests/core/booking | – | – |
| Hold and confirm with DB capacity | FR-042, FR-043, FR-055 | 1 | done | – | scripts/e2e-smoke.ts (implementer-written) | – | – |
| Paystack init, verify, webhook | FR-050 to FR-056 | 1 | code done, **untested against Paystack** | – | tests/core/payments (signature and verify) | – | – |
| Results vault (DB-stored, signed links) | FR-060 to FR-066 | 1 | done (demo variant) | – | e2e smoke | – | – |
| Access control | SEC-007, 11.4 | 1 | done | – | tests/core/access | – | – |
| Demo sign-in | FR-001 to FR-003 (stub) | 1 | done (stub, demo accounts only) | – | – | – | – |
| Accounts from the search box: username, password, PIN; facility approval | FR-008 | 3* | done (backend, popup, operator page) | – | tests/core/account-intent, credentials (pending); scripts/accounts-smoke.ts (15 checks, implementer-written) | – | – |
| Live nearby places (Google Maps via Gemini) | FR-027 | 2 | done (backend, API and component); **home-page wiring is with the frontend agent** | – | tests/core/live-places (pending) | – | – |
| No tests from symptoms guard | FR-017 | 2 | done | – | tests/core/support, ai (pending) | – | – |
| Payouts | FR-059 to FR-059g | 3 | not started (out of scope today) | – | – | – | – |

*Emergency detection is safety-relevant, so it is treated as tier 3 even in the demo. It has 42 independent tests and a fail-safe wrapper.

## Open TODOs

### TODO-001: Hosted demo
PRD: 15.1
Status: done 2026-09-27 12:30. https://riomed-ai.vercel.app (Vercel team mikaelson-initiative-orgs-projects; Neon Postgres, us-east-1). Deployed from branch core/accounts with `vercel deploy --prod`; not yet connected to git auto-deploys
Tasks:
- [ ] Switch the `prisma/schema.prisma` provider to `postgresql`, then `db push` and seed against Neon
- [ ] Set Vercel env: `DATABASE_URL`, `SESSION_SECRET`, `AI_*`, `PAYSTACK_SECRET_KEY` (test), `APP_URL`
- [ ] Set the Paystack test webhook URL to `https://<app>/api/paystack/webhook`
- [ ] Open every page in a private window

### TODO-002: Live LLM evaluation
PRD: AI-010
Status: done (2026-09-27 11:15). gemini-3.5-flash-lite: 89.2% all fields vs 85.0% baseline; p50 0.94 s, p95 1.24 s; 0 fallbacks; 0 emergencies missed
Tasks:
- [x] Run `npm run eval` with Gemini, and commit `eval/report.json`
- [ ] Re-run after the FR-017 guard (expected to fix e095 and e104)
- [ ] Record the model ID and numbers in the submission disclosure

### TODO-003: Paystack test-mode end-to-end
PRD: FR-052, FR-053
Status: blocked (needs test keys)
Tasks:
- [ ] Complete one card payment and one bank-transfer test payment. Confirm the webhook, verify, and the `CONFIRMED` status
- [ ] Send a webhook with a bad signature and check it returns 401 with no state change

Least confident about:
- **Paystack initialize/verify** is written from the API docs and has not been run against Paystack yet.
- **SQLite and Postgres** differ in how concurrent transactions behave. The capacity guard is a single conditional UPDATE, which is atomic on both, but the race test has only been run on SQLite.

## Known divergences from the PRD

- FR-008 accounts are tier 3 (auth). For the hackathon they hold synthetic data only. Still missing before real use: a second independent review, a per-IP login rate limit (only per-account lockout exists), password reset, and moving the search form from GET to POST. A password typed into search reaches the server URL once before the proxy redirects it away.

| What | PRD says | Code does | Why | Resolution by |
|---|---|---|---|---|
| Result storage | Object storage with 5-minute pre-signed URLs (FR-061, FR-063) | PDF bytes stored in the DB, served through an HMAC-signed 5-minute link plus a session permission check | No storage account today. Same access properties | Post-hackathon (move to Supabase Storage) |
| Max result size | 10 MB (FR-062) | 4 MB | Vercel request body limit | Post-hackathon, with direct-to-storage uploads |
| AI SDK | Vercel AI SDK behind the adapter (9.1) | Direct `fetch`, ported from the organisers' `ai_client.py` | Fewer dependencies. Matches the reference starter | Decide in an ADR post-hackathon |
| Slots | Per test or test group (FR-040) | Facility-wide hourly slots | Demo simplification | Post-hackathon |
| Hold expiry | Scheduled job | Lazy expiry on every booking, payment and page read | No cron today | Post-hackathon |
| Non-operational facilities | Q8 open (hide or label) | Hidden | Decided for the demo | Q8 |
| Local AI base URL | – | `AI_BASE_URL` required for ollama and lmstudio (no default) | Contract, found by the test author | Final |

## Decisions log

- 2026-09-27: Split into an npm-workspaces monorepo. `backend/` holds logic and data, and `frontend/` is the Next UI. This lets a separate frontend agent (Antigravity/Gemini) own the UI under docs/contracts/ui.md. Deployment is still one Next app on Vercel.

- 2026-09-27: Product renamed RioMed AI (Q1). Facilities paid by bank transfer (Q11). Clinician available (Q7). Hackathon scope (Q15).

## What we have not proven

- Live places: Google Maps free-tier quota for Maps grounding is unknown. Latency is 6–9 s per new address.

- NFR-001: the LLM parse measured p95 1.24 s with sequential requests. It has not been measured under concurrent load. The timeout is 2 s (AI_TIMEOUT_MS).
- Paystack checkout, webhook and refund against the real test API.
- Postgres concurrency is now tested on Neon. 10 concurrent holds on a 2-place slot gave exactly 2 successes and no overbooking. Only one run, from a single machine.
- The emergency red-flag list has not been clinically reviewed.
- UI on real low-end Android devices and slow networks (NFR-002).

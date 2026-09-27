# RioMed AI

Describe the medical test you need in plain language. RioMed finds registry-listed facilities
near you in Lagos, books a slot at a partner lab, takes payment with Paystack, and delivers the
result as a secure PDF instead of paper.

> *"I need a malaria test around Ikeja tomorrow morning"* gives you **Malaria parasite · Ikeja ·
> tomorrow 07:00–12:00**, with ranked facilities, prices and free times.

This is the GoMyCode *Come Build with AI* hackathon build (27 September 2026). All facilities and
patients are **synthetic**, and payments are **Paystack test mode**, or a clearly labelled
simulation when no key is set.

## What the AI does, and doesn't do

| AI does | AI never does |
| --- | --- |
| Turns free text (English, Nigerian English, Pidgin, misspellings) into a schema-validated search: catalogue test codes, a place phrase and a time window | Invent facilities, prices or times. Every fact shown comes from the database |
| Corrects misspelled places and tests toward known names | Choose coordinates. A gazetteer resolves place names, and unknown places are never guessed |
| | Diagnose, recommend tests from symptoms, give doses or interpret results |
| | Decide emergencies. Fixed rules catch red-flag phrases **before** the model runs and show **112** |

If the model is slow (over 1.5 s), rate-limited or down, a deterministic parser answers and
search keeps working. Mock mode, with no AI inference, is the default and is labelled in the UI.

**Live nearby places:** besides RioMed's partner labs, search shows real nearby hospitals,
clinics and labs for the address you typed. These come live from Google Maps through Gemini's
Maps grounding. Only the places Google Maps returns are shown, never the model's own text. They
are labelled unverified, can't be booked, and carry Google Maps attribution. Live search works
for areas RioMed doesn't cover yet, for example Ikorodu.

**Accounts from the search box:**
- Type "create an account" (or "register my clinic") and a sign-up popup asks for a username, password and PIN.
- Type "access dashboard" and the popup asks for your PIN on a device you've used before, or your password on a new one.
- Facility accounts wait for operator approval on `/operator` before they can see any bookings.
- Passwords and PINs never go through search or the AI. If you type one into search, you get a warning instead.

**Evaluation:** 120 hand-labelled prompts in [backend/eval/intents.jsonl](backend/eval/intents.jsonl).
Latest run with `gemini-3.5-flash-lite`, shown on `/about`:

| | Rule-based fallback | Gemini |
| --- | --- | --- |
| All fields right | 85.0% | **89.2%** |
| Test named | 90.8% | **97.5%** |
| Area | 94.2% | **99.2%** |
| Emergencies missed | 0 | 0 |
| Latency p50 / p95 | < 10 ms | 0.94 s / 1.24 s |

The rule layer runs first for emergencies and takes over whenever the AI is slow (over 2 s) or
unavailable. Since that run, a guard also drops any test the user didn't name, so the model
can't suggest tests from symptoms. It closes the 2 cases the evaluation caught.

**Live demo:** https://riomed-ai.vercel.app

## Run it

```sh
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local   # DATABASE_URL + DIRECT_URL (Postgres/Neon), AI and Paystack test keys
npm run db:push && npm run db:seed
npm run dev                                    # http://localhost:3000
```

On the site, use **Demo sign-in** to act as a patient (Ada or Tunde) or as facility staff
(Alausa or Yaba).

**Demo journey:**
1. Search.
2. Tap **See times**, pick a slot, and pay.
3. Sign in as *Staff, Alausa Diagnostics*. Check the patient in and upload a PDF.
4. Sign back in as the patient and open the result.

**Real AI** (explicit opt-in; keys stay server-side):

```sh
AI_PROVIDER=groq AI_MODEL=<model id> AI_API_KEY=<key>      # or gemini
AI_PROVIDER=ollama AI_MODEL=<model> AI_BASE_URL=http://localhost:11434/v1
```

## Checks

```sh
npm test        # 648 contract tests for backend/src/core
npm run smoke   # booking race, payment, access, upload, late-payment refund (local DB)
npm run smoke:accounts -w @riomed/backend   # sign-up, password, PIN, lockout, facility approval
npm run eval    # AI-010 evaluation
npm run typecheck && npm run lint && npm run build
```

The tests in `backend/tests/core` were written by a separate test author, from
[docs/contracts/core.md](docs/contracts/core.md) and the PRD, without reading the implementation.

## Where things are

- [docs/PRD.md](docs/PRD.md) is the full product requirements. Section 15.1 covers the hackathon scope.
- [BUILD-DIRECTIVE.md](BUILD-DIRECTIVE.md) sets the engineering rules. [implementation.md](implementation.md) tracks status.

This is an npm-workspaces monorepo:

- **`backend/`** (`@riomed/backend`) holds everything except the UI.
  - `src/core/` is the domain logic: intent parsing, emergency rules, ranking, booking state machine, money, Paystack checks, access control and the AI adapter. It is pure TypeScript and the single source of truth.
  - `src/server/` holds the database, booking transactions, payments and the read models the UI uses.
  - It also holds `prisma/`, `tests/`, `eval/` and `scripts/`.
- **`frontend/`** (`@riomed/frontend`) is the Next.js app: pages, components and styles. It gets all data from `@riomed/backend` and never touches the database. The contract is [docs/contracts/ui.md](docs/contracts/ui.md).
- [AGENTS.md](AGENTS.md) sets out who owns what when several AI agents work on the repo.
- `reference/ai-starters/` holds the organisers' starter templates that the AI adapter is ported from.

Stack: Next.js 16, TypeScript (strict), Tailwind, Zod, Prisma on Postgres (Neon) and Paystack.

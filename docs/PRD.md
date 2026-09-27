# RioMed AI: Product Requirements Document

**AI-assisted healthcare navigation, test booking, payment and results storage for Nigeria**

| | |
| --- | --- |
| Version | 2.1 (draft for review) |
| Date | 2026-09-27 |
| Supersedes | *MedPulse AI PRD & Architecture* v1 (3 pages). The product was renamed from MedPulse AI to RioMed AI on 2026-09-27 |
| Status | Draft. Open questions in section 17 must be answered before the parts they block are built |
| Hackathon build | GoMyCode *Come Build with AI*, 27 September 2026. Demo scope and plan for the day are in **section 15.1** |
| Governed by | [BUILD-DIRECTIVE.md](../BUILD-DIRECTIVE.md) |
| AI reference material | [reference/ai-starters/](../reference/ai-starters/) |
| Stakes tier | **3 overall.** Per-component tiers in section 13 |

### How to read this document

- Every requirement has an ID (`FR-`, `NFR-`, `AI-`, `SEC-`). Tests, ADRs and TODOs cite these IDs.
  Under directive rule N4, each one needs a test that fails if the requirement is false.
- **MUST** means release-blocking. **SHOULD** means expected, but can be deferred with a written
  reason in `implementation.md`. **MAY** means optional.
- Section 16 lists every place this version knowingly differs from v1, with the reason. Nothing
  from v1 was dropped silently.

---

## 1. Summary

RioMed AI is a web application for people in Nigeria who need a medical test or a health
facility. The user types a request in plain language, for example "I need a malaria test around
Ikeja tomorrow morning". The system works out which test is wanted, where and when, then shows
nearby facilities that are listed in the official Nigeria Health Facility Registry (NHFR). At
facilities that have joined RioMed as partners, the user can book a time slot, pay online in
naira through Paystack, and later get the result as a PDF stored in their account instead of on
paper. RioMed does not diagnose, prescribe or give medical advice. It helps people find, book
and pay for care, and keep their records.

## 2. Problem

Nigeria has more than 220 million people, and finding care there has structural problems:

1. **Information is fragmented.** Finding an accredited lab or clinic that offers a specific test
   usually means travelling there or relying on word of mouth. The NHFR is public, but it has no
   consumer-friendly search, and it does not say which tests a facility offers, what they cost,
   or when they are open.
2. **Queues and bureaucracy.** Patients wait just to register, book a test, or find out whether a
   facility is open.
3. **Paper results get lost.** Results are usually printed on paper. When the paper is lost or
   damaged, especially in an emergency, the test is repeated at extra cost.
4. **Paying is slow.** Front desks rely on cash and manual transfer checks, which creates delays
   and reconciliation mistakes.

## 3. Users, and who wins when they conflict

| Role | Who they are | What they need |
| --- | --- | --- |
| **Patient** | Adult booking for themselves or a dependant, usually on a mid-range Android phone with an unreliable mobile connection | Find a legitimate facility fast, book, pay, and get results back |
| **Facility staff** | Front desk or lab staff at a partner facility | See bookings, confirm arrivals, upload results, run the schedule |
| **Facility admin** | Owner or manager of a partner facility | Manage the test catalogue, prices, hours, capacity, staff accounts and payouts |
| **Platform operator** | The RioMed team | Onboard and verify facilities, sync the registry, handle disputes and refunds, monitor abuse |

**Priority order when needs conflict:** patient safety, then patient privacy, then booking
correctness (no double bookings, no lost payments), then facility convenience, then conversion
and growth. Example: if an emergency warning adds friction to the booking funnel, the warning
stays.

**Dependants.** A patient MAY book for a dependant (a child or an elderly parent). The account
holder then owns that dependant's records. Consent and age rules are open question Q6.

## 4. Goals and success measures

These restate v1's goals so they can be checked. The targets are initial proposals and need
sign-off (Q2).

| Goal (v1) | Measure | Launch target |
| --- | --- | --- |
| Instant discovery | Median time from submitting a prompt to seeing ranked results | ≤ 2 s (see NFR-001) |
| Instant discovery | Share of evaluation prompts where the correct test and area are extracted | ≥ 90% on the eval set (AI-010) |
| End-to-end workflow | Share of started bookings that reach `CONFIRMED` | Baseline measured in pilot, then target set |
| End-to-end workflow | Share of completed appointments whose result is uploaded to the vault within 7 days | ≥ 80% at partner facilities |
| Compliance and trust | Share of displayed facilities that trace to an NHFR record with a sync date | **100%** (FR-031). This replaces v1's "100% data alignment"; see section 16 |
| Compliance and trust | Payments confirmed in RioMed that do not match Paystack's records | **0**, checked by daily reconciliation (FR-058) |

## 5. Riskiest assumption, one-way doors, and when to stop

### 5.1 Riskiest assumption

> **Enough facilities will onboard as partners and keep their slots, prices and results up to
> date in RioMed.**

The NHFR can tell us that a facility exists and roughly where it is. It cannot tell us what tests
the facility runs, what they cost, when slots are free, or upload results. Everything past
discovery depends on facility participation. If facilities will not maintain this data, RioMed
is a registry search tool and nothing more.

**Test it first, cheaply (weeks 0 to 2, before building booking):** recruit 3 to 5 labs in one
area (proposed: Ikeja, Lagos). Run a manual pilot with a shared spreadsheet or form for catalogue
and slots. Measure whether they keep it current for two weeks and whether they would upload
results.

The **second** riskiest assumption is that NHFR data is good enough, meaning it has coordinates,
up-to-date operational status and usable names for the pilot area. Test it with the data spike
in FR-030 in week 1.

### 5.2 One-way doors (ADR required, argued properly)

| Decision | Why it is hard to reverse |
| --- | --- |
| Core data model: Facility, Appointment, Payment, TestResult, and identity | Migrations of medical and financial records are high risk |
| Identity and authentication method (phone OTP, email, or both) | Users and their records bind to it |
| Where medical records and symptom text are stored and processed (region, provider) | Data residency and cross-border transfer under the NDPA; moving later is costly and may need consent again |
| Payment flow model. **Decided 2026-09-27:** the platform collects every payment and pays facilities by bank transfer to their accounts (FR-059). The ADR records the reasoning | Money flow, tax, and contracts with facilities |
| Whether symptom text is sent to a third-party LLM | Privacy promise to users; hard to walk back |
| Result-file encryption model (provider-managed or application-level) | Re-encrypting an existing vault is a migration |
| Public URLs and booking reference format | Printed on receipts, shared by SMS |

Everything else (UI, ranking weights, prompt wording, model choice behind the adapter) can be
decided quickly and changed later.

### 5.3 Stop conditions

Stop, or change direction, if any of these happens:

- After a 4-week pilot, fewer than 3 facilities keep catalogue and slots current.
- NHFR data for the pilot area lacks usable coordinates for more than 30% of relevant
  facilities, and no licensed alternative source exists.
- Legal review finds that processing health data under the NDPA needs controls the team cannot
  run, such as a DPO, DPIA or registration, within the timeline.
- Paystack will not onboard the business, or will not allow the payment model chosen in 5.2.

## 6. Scope

### 6.1 In scope for v1

- Natural-language and structured search for tests and facilities, in English.
- Discovery of NHFR-listed facilities, and booking and payment at **partner** facilities only.
- Paystack checkout in NGN (card, bank transfer, USSD, depending on what Paystack offers the
  merchant account).
- Result PDFs uploaded by partner facility staff and viewed by the patient.
- Patient dashboard, facility dashboard and a minimal operator admin.
- Email and SMS notifications for booking confirmation, reminders and result availability.
- One pilot geography first (proposed: Lagos State), with the data model ready for national
  coverage.

### 6.2 Explicitly out of scope for v1

- **Diagnosis, triage scoring, treatment or prescription advice** of any kind.
- Telemedicine, video consultations or chat with clinicians.
- Interpreting results with AI (for example "your result means...").
- Insurance, NHIA or HMO claims and pre-authorisation.
- Flutterwave or any second payment provider (v1 mentions it; deferred, section 16).
- Patients uploading their own old paper results (candidate for v1.1, Q9).
- Native mobile apps. v1 is a responsive web app. An installable PWA is a SHOULD.
- Languages other than English (Nigerian Pidgin, Hausa, Yoruba and Igbo are v2 candidates).
- Writing corrections back to the NHFR.
- Home sample collection.
- Ambulance dispatch. RioMed only points users to emergency numbers (AI-020).

## 7. Functional requirements

### 7.1 Accounts and identity

| ID | Requirement |
| --- | --- |
| FR-001 | MUST allow anonymous search. Booking, payment and the vault MUST require an authenticated account. |
| FR-002 | MUST authenticate patients by phone number with OTP, with email as optional recovery. The final method needs an ADR (one-way door, Q5). |
| FR-003 | MUST support the roles `patient`, `facility_staff`, `facility_admin` and `operator`. A user MAY hold staff roles at more than one facility. Every staff role is scoped to one facility. |
| FR-004 | MUST let a facility admin invite and remove staff. Removal MUST revoke access immediately, including active sessions. |
| FR-005 | MUST rate-limit OTP sends per phone number and per IP (proposed: 5 per hour per number) to bound SMS cost and stop enumeration. |
| FR-006 | MUST let a patient export their data and request deletion of their account (see 11.5). |
| FR-007 | MUST show a privacy notice and get explicit consent before storing health data or sending prompt text to an AI provider (SEC-010). |
| FR-008 | **Accounts from the search box (added 2026-09-27, product owner request; replaces FR-002's phone OTP for the demo).** Typing "create an account" opens a sign-up popup asking for name, username, password (8+) and a 4–6 digit PIN. Typing "access dashboard" signs the user in: straight in with an active session (30 minutes), a PIN popup on a remembered device (30 days), or username and password otherwise. The same works for facilities ("register my clinic", "access clinic dashboard"). Rules: (a) account phrases are detected by fixed rules before any AI call. Passwords and PINs are posted directly from the popup and never pass through search or the AI. Text that looks like a credential is blocked with a warning. (b) Secrets are stored as salted scrypt hashes only. (c) 5 wrong passwords or PINs lock the account for 15 minutes, and a PIN lockout forgets the device. (d) Errors don't reveal whether the username exists. (e) Facility accounts are pending until an operator approves them on `/operator`. Until then they have no facility access. (f) The labelled demo sign-in stays for judges. |

### 7.2 AI prompt engine

| ID | Requirement |
| --- | --- |
| FR-010 | MUST accept a free-text prompt of 1 to 1,000 characters and return a structured **SearchIntent**: `intent` (`find_test`, `find_facility`, `book`, `emergency`, `unsupported`), `tests[]` (catalogue codes, possibly empty), `location_query` (the text span, never coordinates), `time_window` (optional, resolved in `Africa/Lagos`), `facility_type` (optional) and `confidence`. |
| FR-011 | MUST validate the model's output against the SearchIntent schema at runtime. Output that does not validate MUST NOT reach the user or the database. The system MUST fall back to the deterministic parser (FR-012). |
| FR-012 | MUST include a deterministic fallback parser (keywords, synonyms and a gazetteer) that handles at least the top 50 test names and the pilot area's place names without any LLM. This is the mock and offline mode and the timeout fallback. |
| FR-013 | Test codes MUST come from the RioMed **TestCatalog**. The model chooses from the catalogue and never invents codes. Codes not in the catalogue are discarded. |
| FR-014 | Location MUST be resolved to coordinates by a deterministic geocoder (gazetteer of states, LGAs, areas and landmarks, plus an optional geocoding API), **never by the LLM**. An unresolved location MUST prompt the user to clarify or share device location. It MUST NOT be guessed. |
| FR-015 | MUST show the user what was understood as editable chips (test, area, time) before or next to the results, so a wrong parse costs one tap to fix. |
| FR-016 | Relative dates ("tomorrow morning") MUST resolve against the current time in `Africa/Lagos`. "Morning", "afternoon" and "evening" map to fixed windows (proposed 07:00–12:00, 12:00–17:00, 17:00–21:00). |
| FR-017 | When the prompt describes symptoms but names no test, the system MUST NOT recommend a specific test unless the symptom-to-test mapping comes from a clinician-reviewed table (Q7). By default it suggests an appropriate *facility type* (for example "general clinic") and recommends seeing a clinician. |

### 7.3 Facility search and ranking

| ID | Requirement |
| --- | --- |
| FR-020 | MUST return facilities ranked by a documented function of: distance (Haversine or PostGIS), whether the requested test is offered (partner catalogue), availability in the requested time window, operational status, and partner status. Weights live in `src/core/` and are covered by tests. |
| FR-021 | MUST filter out facilities the NHFR marks as non-operational, or MUST label them clearly. Which of the two is Q8. |
| FR-022 | Each result MUST show name, facility type, ownership (public or private), distance, address, whether the test is offered with price (partners only), next available slot (partners only), and a "Registry verified" badge linked to the NHFR record and its sync date. |
| FR-023 | Non-partner (listed only) facilities MUST be clearly labelled "Listed in registry, booking not available", with phone number and directions where the data exists. |
| FR-024 | Fuzzy matching of test and service names (for example "MP test" or "malaria parasite" matching `MALARIA_MP`) MUST use a synonym table plus lexical or embedding similarity over the **TestCatalog**. Facility *selection* MUST use structured filters and geo-ranking, not vector similarity alone (section 16). |
| FR-025 | MUST support a structured search form (test picker, area, date) that reaches the same results as a prompt, for users who prefer not to type or when the AI is unavailable. |
| FR-026 | Default search radius is 10 km. The system widens automatically up to 50 km when there are fewer than 3 results and tells the user it did so. |
| FR-027 | **Live nearby facilities (added 2026-09-27, product owner request).** Next to database results, search MUST offer live nearby hospitals, clinics, laboratories and health centres for the address the user typed. They come from Google Maps through Gemini's "Grounding with Google Maps" tool. Rules: (a) only places in the tool's structured result are shown. The model's prose is never shown, so the model can't invent a facility (AI-011). (b) Each place shows its name and a Google Maps link, with "Sources: Google Maps" attribution directly with the list. (c) Live places are labelled "not verified by RioMed" and are never bookable. Booking stays limited to verified partners (FR-023, FR-035). (d) Live search works for addresses the gazetteer doesn't know. The address is sent as text, and coordinates are only used to bias results for known areas (FR-014 still holds for ranking). (e) Results are cached for 10 minutes per address, and requests are rate-limited per IP. If the quota runs out or the call fails, the database results are unaffected. (f) The user's identity is never sent to Google (AI-031). Google receives the typed address text, and the device coordinates when the user allows location sharing. The privacy notice must say so, including that device location is requested automatically (behind the browser's permission prompt), rounded to about 100 m, used only for the search and the Google Maps lookup, and never stored or logged. (g) **"Use my location" (added 2026-09-27, automatic since 2026-09-27):** when no place is typed, or the user asks for "near me", the page requests the device position automatically on load (the browser still shows its permission prompt; the button remains as a tap-to-retry fallback). It is rounded to about 100 m, used for this search and the Google Maps lookup, never stored or logged, and never sent to the intent-parsing model (AI-031 still holds for parsing). |

### 7.4 Registry data ingestion

| ID | Requirement |
| --- | --- |
| FR-030 | **Week 1 spike:** document which NHFR fields exist, their licence and terms of use, how to access them (export, API, scrape), how often they update, and coverage of coordinates and operational status in the pilot area. Output: `docs/data/nhfr-spike.md` and an ADR. |
| FR-031 | Every Facility record MUST carry `nhfr_id`, `source`, `source_synced_at`, and a hash of the source record. Facilities with no NHFR link MUST NOT show the "Registry verified" badge. |
| FR-032 | Ingestion MUST be idempotent: running it twice on the same input produces no changes. It MUST record added, changed and removed counts per run. |
| FR-033 | A facility that disappears from the registry, or is marked closed, MUST be flagged for operator review. It MUST NOT be hard-deleted, because appointments and results reference it. |
| FR-034 | Operator corrections (for example fixed coordinates) MUST be stored as overrides next to the source values and never overwrite them, so a resync does not erase them silently. |
| FR-035 | Partner onboarding MUST link the partner account to exactly one NHFR record after the operator verifies it (proposed check: registration document plus a phone call to the registry-listed number). |

### 7.5 Appointment booking

| ID | Requirement |
| --- | --- |
| FR-040 | Partner facilities define **slot templates**: per test or test group, weekday, time range, slot length, and capacity per slot. Holidays and closures override templates. |
| FR-041 | Slots MUST respect the facility's operating hours and closures. A slot in the past, or starting within the facility's minimum notice (default 60 minutes), MUST NOT be bookable. |
| FR-042 | Booking MUST be two-phase: **hold**, then **confirm**. A hold reserves capacity for 15 minutes (configurable) while payment happens. An expired hold releases capacity automatically. |
| FR-043 | Holds and confirmations MUST be enforced by the database, through a transaction with row locks or a constraint on slot capacity. An application-level check alone does not count. Two concurrent requests for the last unit of capacity MUST result in exactly one success. The other gets `SLOT_UNAVAILABLE` with nothing changed. |
| FR-044 | Appointment states: `HELD` → `PENDING_PAYMENT` → `CONFIRMED` → `CHECKED_IN` → `COMPLETED` → `RESULT_AVAILABLE`, plus `EXPIRED`, `CANCELLED_BY_PATIENT`, `CANCELLED_BY_FACILITY`, `NO_SHOW` and `REFUNDED`. The transitions are one pure state machine in `src/core/`. Any transition not in the table MUST be rejected. |
| FR-045 | Patients MUST be able to cancel. The refund policy (full refund up to N hours before, partial or none after) is Q10 and MUST be shown before payment. |
| FR-046 | Facility cancellation MUST refund the patient in full automatically and notify them. |
| FR-047 | Each booking gets a short, non-guessable reference (for example `MP-7K3Q-9X2D`) that is safe to read out at a front desk. It MUST NOT encode personal data or reveal how many bookings exist. |
| FR-048 | All stored times are UTC and are displayed in `Africa/Lagos`. |

### 7.6 Payments (Paystack)

| ID | Requirement |
| --- | --- |
| FR-050 | Prices MUST be stored and handled as integers in **kobo**. Floating-point money is forbidden and caught by lint and tests. |
| FR-051 | The amount charged MUST be computed on the server from the catalogue price at hold time (plus any platform fee, Q11), locked on the appointment, and never taken from the client. |
| FR-052 | Checkout MUST use Paystack Initialize Transaction with a server-generated unique `reference` tied to exactly one appointment. |
| FR-053 | An appointment moves to `CONFIRMED` **only** after (a) a webhook whose `x-paystack-signature` HMAC-SHA512 signature checks out against the secret key, **and** (b) a server-side Verify Transaction call confirming status `success`, the same amount in kobo, currency `NGN` and the same reference. The client redirect or callback alone MUST NEVER confirm a booking. |
| FR-054 | Webhook handling MUST be idempotent. Duplicate or out-of-order events MUST NOT double-confirm, double-refund or throw an error. |
| FR-055 | A payment that succeeds **after** its hold expired and the slot was taken MUST trigger an automatic full refund and a notification. It MUST NOT overbook. |
| FR-056 | Webhook requests with invalid or missing signatures MUST be rejected with no change to state (fail closed) and logged. |
| FR-057 | Refunds MUST go through the Paystack Refund API, be recorded against the appointment, and be idempotent. |
| FR-058 | A daily reconciliation job MUST compare RioMed payments with Paystack transactions and alert on any mismatch. |
| FR-059 | **Decided 2026-09-27 (Q11):** patients pay into the RioMed Paystack balance. RioMed pays each facility by **bank transfer to that facility's verified bank account**, using the Paystack Transfers API. Facilities do not receive money directly at checkout. |
| FR-059a | A facility's payout account (account number and bank code) MUST be verified with Paystack account resolution before its first payout. The resolved account name MUST match the facility's registered name, or an operator MUST approve it with a written reason. |
| FR-059b | Changing a payout account MUST require (a) the facility admin to re-authenticate, (b) operator approval, and (c) a 48-hour hold before any payout goes to the new account. Every facility admin MUST be notified of the change. Redirecting payouts is the most likely fraud against this model. |
| FR-059c | Each appointment that reaches `COMPLETED`, and is past the refund window, creates a **payable line** of catalogue amount minus platform fee, in kobo. Payouts are made only from payable lines. |
| FR-059d | Payouts run in batches on a schedule (proposed weekly). Each transfer has a unique, idempotent reference. The final state comes from a signature-verified transfer webhook (`transfer.success`, `transfer.failed`, `transfer.reversed`) plus a server-side transfer status check. A failed or reversed transfer returns its lines to payable. |
| FR-059e | Invariants, property-tested: the total paid to a facility never exceeds its payable lines, and no line is paid twice. A refund after payout creates a negative balance that is offset against the next payout. |
| FR-059f | In v1, a payout batch MUST be started by an operator and approved by a second operator, or confirmed with the Paystack transfer OTP. Fully automatic transfers are not allowed until reconciliation (FR-058) has run clean for 4 consecutive weeks. |
| FR-059g | The platform fee or commission is still open (Q11b). Until it is decided, the fee is configurable and defaults to 0. |

### 7.7 Cloud Results Vault

| ID | Requirement |
| --- | --- |
| FR-060 | Only `facility_staff` or `facility_admin` of the facility that owns an appointment in `CHECKED_IN` or `COMPLETED` may upload a result for it. |
| FR-061 | Uploads MUST use short-lived pre-signed upload URLs (at most 5 minutes) scoped to one object key. The key MUST be random and MUST NOT contain names, phone numbers or test names. |
| FR-062 | Accepted files: PDF only in v1, maximum 10 MB. The server MUST check file type by content (magic bytes), not by extension. Files that fail MUST be quarantined and not served. |
| FR-063 | Files MUST be stored in a private bucket with encryption at rest. Downloads use signed URLs valid for at most 5 minutes, issued only to the owning patient (or their dependant's account holder) and to staff of the uploading facility. |
| FR-064 | Every result view, download, upload, replacement and deletion MUST write an audit event (who, what, when, from where). Patients MUST be able to see who accessed their results. |
| FR-065 | A correction MUST create a new version. Earlier versions stay in the audit trail and are marked superseded. They are never silently overwritten. |
| FR-066 | The patient MUST be notified (SMS or email, **without result content**) when a result is available. |
| FR-067 | The system MUST NOT interpret or summarise result contents with AI in v1 (6.2). |

### 7.8 Dashboards

| ID | Requirement |
| --- | --- |
| FR-070 | Patient dashboard: upcoming and past appointments, payment receipts, results (with versions), access log, cancel and reschedule, dependants, data export. |
| FR-071 | Facility dashboard: today's schedule, search by booking reference, check-in, mark no-show, result upload, catalogue and price management, slot templates and closures, staff management (admin only), and payment status per appointment. |
| FR-072 | Operator admin: facility verification queue, registry sync reports and overrides, dispute and refund handling, abuse flags, and AI evaluation reports. |

### 7.9 Notifications

| ID | Requirement |
| --- | --- |
| FR-080 | Send booking confirmation, a reminder 24 h and 2 h before, cancellation and refund notices, and result-available notices by SMS, with email as fallback. |
| FR-081 | Notifications MUST NOT include test names or results, only the booking reference, facility name and time. (SMS content may be seen on a shared phone.) |
| FR-082 | A failed notification MUST NOT roll back a booking. It is retried with backoff and logged. |

## 8. AI design and safety

This section applies the patterns from [reference/ai-starters/](../reference/ai-starters/)
(provider adapter, labelled mock mode, grounded retrieval, bounded requests) to the TypeScript
product. The starters are Python and are **reference only**. The product is TypeScript (NFR-010).

### 8.1 Provider adapter

| ID | Requirement |
| --- | --- |
| AI-001 | All model calls MUST go through one server-side adapter in `src/core/ai/`, with one interface such as `complete(input, {schema, timeoutMs}) → Result`. No other module imports a provider SDK. |
| AI-002 | The adapter MUST support `mock` as the **default** when no provider is configured, plus at least one hosted provider. Candidates: OpenAI GPT-4o mini as in v1, Gemini, or Groq, all through the Vercel AI SDK. Local `ollama` or `lmstudio` are for development only. Which hosted provider is used is configuration, not code (Q3). |
| AI-003 | Mock output MUST be labelled as mock wherever it is shown (UI badge, API field `ai_mode: "mock"`). Demos and submissions MUST say whether they show mock or live inference (reference README, "Submission disclosure"). |
| AI-004 | API keys MUST exist only in server environment variables. They MUST never be sent to the browser, logged, or included in URLs (see the starter test `test_request_shape_without_network`). |
| AI-005 | Local-provider base URLs MUST be restricted to loopback HTTP with no credentials or query string, and local providers MUST be disabled in production builds (from `ai_client.py`). |
| AI-006 | Each call MUST have a hard timeout that fits the latency budget (proposed 1,500 ms for intent parsing, not the starter's 45 s), a maximum on output tokens, and **no automatic retry** on the request path. On timeout or error, the deterministic parser (FR-012) is used and the user sees results anyway. |
| AI-007 | Input is limited to 1,000 characters for prompts (FR-010). Input and output MUST be validated at runtime with a schema library such as Zod. |
| AI-008 | Per-user and per-IP rate limits on AI calls, plus a global daily spend cap. When the cap is reached, the system switches to the deterministic parser and alerts the operator (11.9). |

### 8.2 Grounding and retrieval

| ID | Requirement |
| --- | --- |
| AI-010 | A versioned evaluation set of at least 200 labelled prompts (`eval/intents.jsonl`) covering Nigerian place names, local test names ("MP", "widal", "FBC", "PCV"), misspellings, mixed Pidgin and English, dates, emergencies and injection attempts. CI runs it against the deterministic parser, and on demand against live providers. It reports accuracy per field. |
| AI-011 | Every fact the user sees about a facility (name, address, hours, price, availability) MUST come from the database, never from model-generated text. The model's output is limited to the SearchIntent and, optionally, a one-sentence summary that may only restate SearchIntent fields. |
| AI-012 | If retrieval returns nothing, the system MUST say so and offer to widen the search or change filters. It MUST NOT invent facilities (the starter `rag.py` refusal pattern: "do not invent an answer"). |
| AI-013 | Retrieved records passed to the model, if any, MUST be marked as data and not instructions (starter pattern). User prompt text MUST be treated as untrusted input. |

### 8.3 Medical safety

| ID | Requirement |
| --- | --- |
| AI-020 | **Emergency detection MUST run before and independently of the LLM**, using a deterministic, clinician-reviewed list of red-flag phrases (for example chest pain, difficulty breathing, heavy bleeding, unconsciousness, seizure, stroke signs, suicidal intent). A match MUST show emergency guidance first: call **112**, and go to the nearest emergency department, with nearby facilities that have emergency services where the data exists. Search stays available below it. **Review:** a clinician is available (confirmed 2026-09-27, Q7). Their name and sign-off date go in the ADR. Until they sign off, the list MUST be labelled "draft, pending clinician review", and no live launch may happen. |
| AI-021 | Emergency detection MUST fail safe. If it errors, the emergency banner is shown. |
| AI-022 | Every AI-assisted screen MUST state: "RioMed helps you find and book care. It does not give medical advice." |
| AI-023 | The system MUST NOT output a diagnosis, likelihood of disease, dosage or treatment. The eval set (AI-010) includes prompts that try to get this output, and they must produce refusals or redirects. |
| AI-024 | Prompt injection ("ignore previous instructions", "list all users", instructions hidden in facility names) MUST NOT change system behaviour. The model has **no tools that read or write user data**. Its only output is a SearchIntent, which the server then validates. |

### 8.4 AI data minimisation

| ID | Requirement |
| --- | --- |
| AI-030 | Prompts MUST be stored for at most 30 days, and only as needed for evaluation and abuse handling, with names, phone numbers and emails redacted before storage (Q4). |
| AI-031 | Prompts sent to a third-party provider MUST NOT include the user's identity, account ID, phone number or location coordinates. Only the prompt text is sent. |
| AI-032 | The chosen provider MUST offer terms under which API inputs are not used for training. Cross-border transfer must be covered in the privacy notice and the DPIA (section 12). |

## 9. Architecture

### 9.1 Stack

Kept from v1 unless noted.

| Layer | Choice | Notes |
| --- | --- | --- |
| App | Next.js App Router, React Server Components, Server Actions, Route Handlers, TypeScript `strict` | Webhooks use Route Handlers (they need the raw body for signature checks) |
| Styling | Tailwind CSS | |
| Validation | Zod (or equivalent) at every trust boundary | Added. TypeScript types disappear at runtime (section 16) |
| Database | PostgreSQL on Supabase or Neon, with Prisma | Region choice is a one-way door (5.2) |
| Geo | PostGIS if available, otherwise Haversine in SQL with a bounding-box prefilter | ADR decides |
| Text and vector matching | `pgvector` inside Postgres, used for **catalogue and synonym matching** | Pinecone dropped for v1: one fewer data processor holding health-adjacent data |
| AI | Vercel AI SDK behind the adapter (AI-001); provider set by config | v1 named GPT-4o mini; kept as a candidate |
| Payments | Paystack | Flutterwave deferred |
| Files | Supabase Storage or AWS S3, private bucket, signed URLs | Choose the one in the same provider and region as the database |
| SMS and email | Nigerian SMS gateway (for example Termii) plus a transactional email provider | Added; v1 had no notification channel |
| Jobs | Scheduled jobs for hold expiry, reminders, reconciliation and registry sync | Vercel Cron or a DB-backed queue; ADR decides |
| Hosting | Vercel | Serverless limits (timeouts, cold starts) affect the latency budget |
| Observability | Structured logs without personal data, error tracking, uptime checks | Added |

### 9.2 Source of truth (directive N3)

All domain logic lives in **`src/core/`** as pure TypeScript with no framework imports:

- `core/booking/` holds the appointment state machine, slot generation and hold rules
- `core/money/` holds kobo arithmetic, fee calculation and refund amounts
- `core/search/` holds ranking, radius widening and the distance function
- `core/intent/` holds the SearchIntent schema, deterministic parser, date resolution and emergency detection
- `core/ai/` holds the provider adapter and output validation
- `core/access/` holds the permission checks (who can see or change what)

Server Actions, Route Handlers and UI call into `core`. They never reimplement it. The SQL
distance calculation and the TypeScript `core/search` distance function are two implementations
of the same thing, so a differential test (directive section 11) checks that they agree.

### 9.3 Data model (initial)

A one-way door, so it gets an ADR before any migration. Fields are indicative.

```
User            id, phone (unique), email?, name, created_at, deleted_at?
Dependant       id, owner_user_id, name, date_of_birth
Membership      user_id, facility_id, role (facility_staff|facility_admin), revoked_at?
Facility        id, nhfr_id?, name, type, ownership, state, lga, address, geo(point),
                operational_status, phone?, is_partner, verified_at?,
                source, source_synced_at, source_hash, overrides(jsonb)
TestCatalog     code (PK), name, synonyms[], category, embedding(vector)
FacilityTest    facility_id, test_code, price_kobo, turnaround_hours, active
SlotTemplate    facility_id, test_code|group, weekday, start, end, slot_minutes, capacity
Closure         facility_id, starts_at, ends_at, reason
Appointment     id, reference (unique), patient_user_id, dependant_id?, facility_id,
                test_code, slot_start, slot_end, status, amount_kobo, hold_expires_at,
                created_at, updated_at, version
Payment         id, appointment_id, provider, provider_reference (unique), amount_kobo,
                currency, status, verified_at?, raw_event_ids[]
Refund          id, payment_id, amount_kobo, reason, provider_refund_id (unique), status
PayoutAccount   id, facility_id, bank_code, account_number, resolved_name, verified_at,
                approved_by?, active_from (48 h hold, FR-059b), revoked_at?
PayableLine     id, facility_id, appointment_id (unique), amount_kobo (negative for
                refund after payout), payout_id?, created_at
Payout          id, facility_id, payout_account_id, amount_kobo, transfer_reference (unique),
                status, initiated_by, approved_by, provider_transfer_code?, settled_at?
TestResult      id, appointment_id, version, storage_key, sha256, size_bytes,
                uploaded_by, uploaded_at, superseded_by?
AuditEvent      id, actor_user_id, action, subject_type, subject_id, ip_hash, at
WebhookEvent    id, provider, event_id (unique), received_at, processed_at, outcome
PromptLog       id, redacted_text, parsed_intent, ai_mode, latency_ms, created_at   (TTL 30d)
```

Slot capacity is enforced by locking and counting active appointments (status in `HELD`,
`PENDING_PAYMENT`, `CONFIRMED`, `CHECKED_IN`) per facility, test and slot inside one transaction,
or with a materialised slot row that has a capacity check. The ADR picks one.

### 9.4 Key flows

**Search:** prompt → emergency check (deterministic) → LLM intent parse with 1.5 s timeout, or
the deterministic parser → schema validation → geocode `location_query` → SQL geo filter plus
catalogue join → `core/search` ranking → results with editable chips.

**Book and pay:** pick slot → `hold` transaction (capacity check, `HELD`, 15-minute expiry) →
Paystack initialise (reference = payment ID) → user pays → webhook (signature check) → Verify
Transaction (amount, currency, reference) → `CONFIRMED` in one transaction → notifications. The
expiry job moves stale holds to `EXPIRED`. A payment that arrives late for an expired and taken
slot is refunded automatically (FR-055).

**Result:** staff opens appointment → requests upload URL (permission check) → uploads PDF
directly to storage → server checks type, size and hash → `TestResult` v1 → appointment moves to
`RESULT_AVAILABLE` → patient notified → patient views through a 5-minute signed URL → audit event.

## 10. Non-functional requirements

| ID | Requirement |
| --- | --- |
| NFR-001 | **Latency.** Server time from prompt received to ranked results sent: p50 ≤ 1.2 s, p95 ≤ 2.0 s, measured on the pilot dataset with a live provider. Structured search (no LLM): p95 ≤ 500 ms. v1 stated "under 2 seconds" without a percentile; this is the checkable version, and it is **unproven** until measured (AI-006 timeout is how it is protected). |
| NFR-002 | **Low bandwidth.** First meaningful paint of the search page ≤ 3 s on a simulated slow 3G profile on a mid-range Android device. JS for the search route ≤ 200 KB gzipped. |
| NFR-003 | **Availability.** Booking and payment paths ≥ 99.5% monthly during pilot. Search MUST keep working when the AI provider is down (FR-012). |
| NFR-004 | **Accessibility.** WCAG 2.1 AA on the patient flows. Every action reachable by keyboard and screen reader. Touch targets ≥ 44 px. |
| NFR-005 | **Browser support.** Last 2 versions of Chrome for Android, Samsung Internet, Safari iOS, and desktop Chrome, Firefox and Edge. Opera Mini gets a usable server-rendered fallback for search (SHOULD). |
| NFR-010 | **Type safety.** 100% TypeScript with `strict: true`, no `any` in `src/core/` (lint enforced), and runtime validation at every boundary: user input, model output, webhooks, registry data, environment variables. v1 said TypeScript "eliminates runtime type errors". It does not, which is why runtime validation is required (section 16). |
| NFR-011 | **Clean build.** `tsc --noEmit`, ESLint and tests pass with no new warnings (directive section 9). |
| NFR-020 | **Observability.** Structured logs with request IDs. No personal data, prompt text, tokens or result content in logs. Alerts for payment mismatch, webhook signature failures, AI cap reached, and registry sync failure. |
| NFR-030 | **Localisation-ready.** All user-facing text goes through a translation layer, even though only English ships in v1. |

## 11. What v1 was silent on

Directive section 2 checklist.

### 11.1 Error states

| Situation | What the user sees | What the system does |
| --- | --- | --- |
| AI provider down or slow | Normal results, parsed by the fallback. No error shown unless parsing also fails | Logs; alerts if the rate crosses a threshold |
| Prompt not understood | "I couldn't tell which test or area you mean", with the structured form pre-filled | Logs the redacted prompt for eval (AI-030) |
| Location not found | "Where are you?" with a place picker and a "use my location" option | Nothing is guessed (FR-014) |
| Slot taken during checkout | "That time was just booked. Here are the next available times." | Hold rejected, nothing charged |
| Payment failed or abandoned | "Payment didn't go through. Your slot is held until HH:MM." Retry button | Hold kept until expiry |
| Payment succeeded but webhook delayed | "Confirming your payment..." then polls. Booking reference shown only once confirmed | Verify Transaction on return, plus webhook |
| Paid after hold expired | "Your payment arrived after the slot was released. A full refund has been started." | FR-055 |
| Upload rejected | "Only PDF files up to 10 MB" | Quarantines the file |
| Session expired mid-flow | Log in again and return to the same step with state kept | |

### 11.2 Empty states

- **No results nearby:** automatic widening (FR-026). If still empty: "No listed facility offers
  this test within 50 km", with nearby general facilities and a suggestion to call.
- **Registry-only area (no partners):** results show but none are bookable. An explanation and
  a "Tell us you'd use this here" demand signal (SHOULD).
- **New patient:** dashboard explains the three steps. No fake sample data.
- **New facility:** onboarding checklist covering catalogue, prices, hours, slot templates, staff
  and payout details. The facility is not bookable until the checklist is complete.

### 11.3 Scale

Assumptions to confirm (Q2):

| | Launch (pilot) | 100× |
| --- | --- | --- |
| Facilities in DB (national NHFR) | ~40,000 listed, 5–20 partners | ~40,000 listed, 2,000 partners |
| Patients | 1,000 | 100,000 |
| Searches per day | 1,000 | 100,000 (≈ 1–3 AI calls per second at peak) |
| Bookings per day | 20 | 2,000 |
| Result files | 500 per month, ~1 MB each | 50,000 per month (≈ 600 GB per year) |

Geo queries need a spatial index at national scale. AI cost at 100× needs a cap and per-user
limits (AI-008).

### 11.4 Permissions

Access control tests are written **before** the happy path (directive section 11).

| Action | Anonymous | Patient | Facility staff | Facility admin | Operator |
| --- | --- | --- | --- | --- | --- |
| Search facilities | ✓ | ✓ | ✓ | ✓ | ✓ |
| Book or pay | | own | | | |
| View appointment | | own and dependants | own facility | own facility | ✓ (audited) |
| Upload result | | | own facility, eligible states | own facility | |
| View result file | | own and dependants | own facility's uploads | own facility's uploads | **no by default**; break-glass with reason, audited (Q12) |
| Edit catalogue, prices or slots | | | | own facility | |
| Manage staff | | | | own facility | ✓ |
| Verify facility, issue refunds | | | | | ✓ |

Boundaries to test explicitly: staff of facility A reading facility B's appointment by ID; a
revoked staff member with a cached session; a patient changing `appointmentId` in a URL; an
operator downloading a result without break-glass; a dependant's record after the owner deletes
their account.

### 11.5 Data lifecycle

| Data | Retention | Deletion |
| --- | --- | --- |
| Account profile | While active | On deletion request, within 30 days |
| Appointments and payments | Proposed 6 years (financial records) | Anonymised on account deletion, amounts and references kept for accounting |
| Test results | Proposed: until the patient deletes them, or per medical-records guidance (Q13) | Patient-initiated deletion removes the storage object. The audit event stays |
| Audit events | Proposed 6 years | Not deletable by users |
| Prompt logs | 30 days, redacted | Automatic expiry |
| Webhook payloads | 90 days | Automatic expiry |
| Backups | Rolling 30 days | Deleted data drops out of backups within 30 days, and the privacy notice says so |

Facilities keep their own clinical records. The RioMed copy is a convenience for the patient.
Whether deletion by the patient affects the facility's copy is Q13.

### 11.6 Migration

There is no existing RioMed system. Two sources get migrated:

1. **The NHFR dataset**, through the idempotent ingestion job (FR-030 to FR-034), run in a
   staging environment first with a diff report.
2. **Partner catalogue and schedules**, through CSV import with validation and a dry-run preview,
   plus manual entry.

Patients' existing paper results are out of scope (6.2).

### 11.7 Rollback

- Every schema migration has a tested down path, or is written expand-and-contract so the
  previous app version still runs against the new schema.
- New flows ship behind feature flags: `ai_live`, `booking_enabled`, `payments_live` and
  `vault_enabled`. Turning a flag off falls back gracefully. With `ai_live` off, the
  deterministic parser is used. With `payments_live` off, booking is disabled and search stays.
- Vercel instant rollback for app code. Paystack stays in **test mode** until the payments gates
  pass.
- Bad registry sync: every sync run is versioned and can be reverted to the previous snapshot.

### 11.8 Concurrency

| Race | Required behaviour | Test |
| --- | --- | --- |
| Two patients hold the last unit of capacity | Exactly one succeeds | Parallel transactions against real Postgres |
| Duplicate webhooks arrive together | One confirmation, one payment record | Parallel handler calls with the same `event_id` |
| Webhook arrives while the hold-expiry job runs | Deterministic outcome: either confirmed, or expired plus refunded, never both | Interleaving test |
| Patient cancels while the webhook confirms | Ends `CANCELLED_BY_PATIENT` with refund, or `CONFIRMED` then cancelled. Never a charge without a booking | State machine property test |
| Two staff upload results for the same appointment | Two versions, the latest current, both audited | Parallel uploads |
| Two payout runs start at once for the same facility | Each payable line goes into at most one payout, and only one transfer is made | Parallel payout runs against real Postgres |
| Facility admin edits a slot template while patients book | Existing holds and confirmations are honoured. The new template applies to unbooked capacity only | |

Appointments carry a `version` column for optimistic concurrency on non-capacity updates.

### 11.9 Money and limits

- **Charging:** amount computed on the server and locked at hold time (FR-051). Verify matches
  amount and currency (FR-053).
- **Refunds:** idempotent, never more than the captured amount, and the sum of refunds never
  exceeds the payment (property test).
- **AI spend:** global daily cap, and per user proposed at 30 prompts per hour and 200 per day.
  On cap, the deterministic parser is used (AI-008).
- **SMS spend:** OTP rate limits (FR-005), notification dedupe, and a daily SMS budget alert.
- **Storage:** 10 MB per file, and a per-facility monthly upload quota with an alert.
- **Hold abuse:** at most 2 active holds per patient, which stops one account locking a whole
  schedule.
- **Enumeration:** booking references and object keys are random. IDs in URLs are UUIDs, and
  every access is checked through `core/access`.

## 12. Privacy, security and compliance

v1 said "HIPAA-inspired encryption standards". HIPAA is a US law and does not apply in Nigeria.
The binding framework is the **Nigeria Data Protection Act 2023 (NDPA)**, enforced by the Nigeria
Data Protection Commission (NDPC). Health data is sensitive personal data under the NDPA. HIPAA's
Security Rule can still be used as an engineering checklist. A lawyer must confirm the specific
obligations (Q14). The requirements below are the engineering baseline.

| ID | Requirement |
| --- | --- |
| SEC-001 | TLS everywhere, with HSTS. |
| SEC-002 | Encryption at rest for the database, backups and object storage (provider-managed keys at minimum). Whether result files also need application-level envelope encryption is an ADR (5.2). |
| SEC-003 | Least-privilege service credentials. The storage bucket is not public. Database access from the app uses a role that cannot run DDL. |
| SEC-004 | Secrets only in the platform secret store. `.env*` is gitignored. Secret scanning runs in CI. |
| SEC-005 | Sessions use `HttpOnly`, `Secure`, `SameSite=Lax` cookies. Server Actions get CSRF protection. Security headers include CSP, `X-Content-Type-Options: nosniff` (as in the starter `web_api.py`) and `Referrer-Policy`. |
| SEC-006 | Results and account pages send `Cache-Control: no-store`. |
| SEC-007 | Every data access goes through `core/access`. A missing or malformed actor or subject MUST be **denied** (fail closed), with a test for each of these. |
| SEC-008 | Audit log for all access to health data (FR-064). |
| SEC-009 | Dependency and container scanning in CI. A pen test, or at least a structured adversary review, before payments go live. |
| SEC-010 | Consent screens for (a) storing health data and (b) sending prompt text to an AI provider. Declining (b) means only the deterministic parser is used. |
| SEC-011 | A DPIA (data protection impact assessment) is written before live launch, covering the AI provider, storage region and SMS provider as processors. |
| SEC-012 | A breach response runbook, including NDPC notification timelines (to be confirmed by legal). |

## 13. Stakes tier per component (directive section 3)

| Component | Tier | Why |
| --- | --- | --- |
| Payments, refunds, reconciliation, webhooks, payouts and payout accounts | **3** | Money. Payout redirection is the highest-value attack |
| Auth, sessions, roles, `core/access` | **3** | Identity and permissions |
| Results Vault (upload, storage, download, audit) | **3** | Sensitive health data |
| Booking state machine and slot capacity | **3** | Tied to money, and double bookings cause real-world harm |
| Emergency detection (AI-020) | **3** | Safety. Silently wrong means someone in an emergency gets a booking form |
| Prompt storage and redaction | **3** | Sensitive data |
| AI intent parsing and adapter | 2 | Recoverable (editable chips, fallback), but has cost and injection exposure |
| Search ranking, geocoding, registry ingestion | 2 | Wrong results erode trust, but can be fixed |
| Notifications | 2 | |
| Dashboards UI and marketing pages | 2 / 1 | |
| Eval tooling, seed scripts, spikes | 1 | |

## 14. Test obligations (directive rule N4 and section 11)

Minimum set. Test authors derive the rest from each requirement ID.

- **Property tests:** booking state machine (no illegal transition is reachable; money is never
  captured without either `CONFIRMED` or `REFUNDED`), kobo arithmetic, refund sums, ranking
  monotonicity (closer is never ranked lower when everything else is equal), and date resolution
  across midnight and month or year boundaries in `Africa/Lagos`.
- **Fuzzing:** prompt input (empty, 1,000+ characters, emoji, RTL text, control characters,
  injection strings), webhook bodies, CSV imports and registry records.
- **Access control first:** every row of 11.4, including the listed boundary cases, and the
  fail-closed tests from SEC-007.
- **Payments:** full branch coverage, invalid signature, amount mismatch, currency mismatch,
  replayed event, out-of-order events, late payment after expiry, and concurrent webhooks.
  Payouts: the ledger invariants (FR-059e), failed and reversed transfers, a payout account
  changed during its 48-hour hold, and payout approval by the same person who started it
  (must be rejected).
- **Concurrency:** every row of 11.8, against a real Postgres (not mocks).
- **Differential:** SQL distance against `core/search` distance on generated coordinates.
- **Fixtures:** committed sample NHFR records, Paystack webhook payloads and SearchIntent JSON,
  so format changes show in diffs.
- **AI eval:** AI-010 set in CI (deterministic parser) with a threshold, plus an on-demand live
  run. Emergency and refusal prompts must reach 100% on the red-flag list.
- **Integrations:** AI provider, Paystack, storage and SMS each tested when down, slow (timeout)
  and returning unexpected shapes.
- **UI:** empty, error, loading and too-much-data states for search results, the patient
  dashboard and the facility schedule.
- **Performance:** a load test that proves NFR-001, reported in `implementation.md`, "What we
  have not proven", until it passes.

## 15. Delivery plan

### 15.1 Hackathon build: GoMyCode "Come Build with AI", 27 September 2026

Source: the participant onboarding guide (hackathon.gomycode.com/onboarding, snapshot taken
27 September 09:40). Nigeria runs on the same clock as the event's Tunis times (UTC+1, WAT). The
Nigerian event spaces are Yaba and Ikeja, which are also the demo area.

**Key times (WAT):**

| Time | What happens |
| --- | --- |
| 09:45–10:00 | Attendance and final-team roster check with your manager |
| 11:30–11:45 | Mentor checkpoint: show the search flow working |
| 13:45–14:00 | Submission briefing |
| 15:30–15:45 | Technical and submission checkpoint: **the deployed link and every submission link must open** |
| **17:30** | **Submission closes. This is a hard deadline. Aim to submit by 17:15** |
| 17:45–19:15 | Country judging from the submitted materials. The top 3 teams per country demo live 19:15–19:45 |

#### The demo is one journey

> A patient types *"I need a malaria test around Ikeja tomorrow morning"* and sees what RioMed
> understood (test, area, time) as editable chips. They get ranked, registry-labelled facilities,
> book a slot, and pay in Paystack test mode. The facility then uploads a result PDF, and the
> patient opens it from their dashboard.

| Feature | Today | Requirements | Notes |
| --- | --- | --- | --- |
| Prompt to validated SearchIntent with a live LLM, plus the deterministic fallback | **MUST** | FR-010 to FR-016, AI-001 to AI-007 | This is the AI contribution the jury scores. Provider: Gemini or Groq free tier, whichever key works first. Mock stays the labelled default |
| Emergency red-flag detection before the LLM | **MUST** | AI-020 to AI-022 | Draft list, labelled "pending clinician review" |
| Editable chips and the structured search form | **MUST** | FR-015, FR-025 | |
| Search and ranking over seeded facilities in Ikeja and Yaba | **MUST** | FR-020, FR-022, FR-023, FR-026 | About 30 facilities, marked "demo data" in the UI. Use real NHFR records only if they can be obtained in 20 minutes or less and the licence is clear (Q17) |
| Hold then confirm, with capacity enforced by the database | **MUST** | FR-042 to FR-044 | |
| Paystack test-mode checkout, signed webhook and verify | SHOULD | FR-050 to FR-056 | If test keys aren't ready, use a simulated payment clearly labelled "simulated" |
| Facility uploads a result, patient views it through a signed URL | SHOULD | FR-060 to FR-063 | |
| Sign-in | STUB | FR-001 to FR-003 | A demo role switcher (seeded patient and facility staff), labelled as a demo. There is no real OTP |
| OTP, SMS, refunds, payouts (FR-059), reconciliation, NHFR ingestion, dependants, operator admin, audit UI | OUT today | | Covered in the post-hackathon plan (15.2) |

**Stack for today:** Next.js, TypeScript strict, Tailwind, Zod and Prisma on Postgres (Neon or
Supabase free tier), deployed to Vercel for a live link, with the source on GitHub. If no hosted
database is ready by 10:30, use SQLite locally, submit a recorded demo, and say so in the
disclosure.

**Needed from the team by 10:30:** a working Gemini or Groq API key (tested with one request),
Paystack test keys, and Neon or Supabase, Vercel and GitHub accounts. Keys go only in `.env.local`
and in Vercel environment settings, never in the repository, video, slides or form.

#### How the build maps to the jury rubric (100 points)

| Criterion | Points | How we earn it |
| --- | --- | --- |
| Problem and user value | 20 | Nigeria's lost paper results, queues and unverified facilities, shown through one concrete Ikeja journey |
| Functional execution | 20 | The whole journey working live on the deployed URL, not slides |
| Quality of AI use | 20 | The AI does one well-defined job: turning plain language into a validated SearchIntent, choosing test codes from the catalogue only, and never inventing facts (AI-011). We show eval accuracy for the LLM next to the deterministic baseline |
| Testing and reliability | 15 | Eval results (AI-010, at least a 50-prompt subset today). Fallback on timeout or quota. A concurrency test for the last slot. A test that bad webhook signatures fail closed. Measured latency |
| Experience and demo | 15 | Mobile-first UI and a tight 90-second video |
| Responsible AI and data | 10 | No diagnosis, emergency routing, synthetic data only, no identity sent to the LLM, a consent notice, mock output labelled, and clinician review of the red-flag list |

#### Submission package (guide section 06)

- [ ] The same final team name and lead email as Final Team Confirmation. Country: Nigeria. The actual confirmed space (Yaba, Ikeja or ONLINE). Every member's full name
- [ ] Project title "RioMed AI", a summary of 150 words or fewer, problem, solution and key features, technologies, next step
- [ ] Working prototype link, opened in a private window
- [ ] Source code URL (public GitHub repo, or access granted to reviewers)
- [ ] Presentation URL
- [ ] 90-second demo video, opened from outside your own account
- [ ] Primary prize plus the additional partner awards that fit, each with 2–3 sentences of award-fit evidence
- [ ] AI and tool disclosure (draft below). No keys, passwords or voucher codes
- [ ] Every link checked as a reviewer would see it. Submit, then save the confirmation

**Prize direction (recommended):** primary, the *GOMYCODE × NVIDIA Real-World AI Impact Award*
(practical AI for people and public services). Additional: *Artefact Data & AI Award* (turns
registry data into usable access to care), *EY Studio+ Human-Centred Innovation Award*, and
*Thunders Engineering Excellence Award* if the tests and reliability story is strong. *Kredete
Financial Inclusion* is a weak fit, because payments are a feature here rather than the point.
Not eligible or off-theme: Click Mobile (Kenya only), Yassir (Morocco only), Catalyse (Côte
d'Ivoire only), SupplyzPro (a different challenge), and the skills and education awards.

**90-second video outline:** 0–15 s the problem (a lost paper result, a queue). 15–60 s the live
journey. 60–75 s the proof (eval accuracy, the fallback when the AI is off, the emergency
banner, tests passing). 75–90 s next steps (a pilot with Ikeja labs, clinician sign-off, NDPA
compliance).

**Draft project summary (about 110 words):**

> Finding a verified lab in Nigeria that offers a specific test usually means word of mouth,
> travel and queues, and results come back on paper that gets lost. RioMed AI lets a patient
> describe what they need in plain language, such as "malaria test around Ikeja tomorrow
> morning". An LLM turns that into a structured, validated request, and RioMed matches it against
> registry-labelled facilities ranked by distance and availability. The patient books a slot,
> pays with Paystack, and receives the result as a secure PDF in their account. RioMed never
> diagnoses: emergency phrases are caught before the AI runs and point to 112. If the AI is
> unavailable, a deterministic parser keeps search working.

**Draft AI and tool disclosure (fill in the brackets on the day):**

> *Models and providers:* [model ID] on [Gemini / Groq], called server-side through one adapter.
> Mock mode is the labelled default. *What the AI does:* turns free text into a schema-validated
> search request (test codes chosen from our catalogue, a place phrase and a time window).
> *What it does not do:* choose coordinates, generate facility facts, diagnose, or interpret
> results. *Fallback:* a deterministic keyword and gazetteer parser, used on timeout, quota or
> error. *Evaluation:* [N] labelled prompts, [x]% field accuracy for the LLM against [y]% for the
> baseline. *Data:* synthetic demo facilities [plus NHFR records, if used, with attribution]. No
> real patient data. *Payments:* Paystack test mode only. *Development tools:* code written with
> Claude Code (Anthropic) as an AI coding agent. *NVIDIA Brev:* not used. *Constraints:*
> free-tier rate limits, so the demo may show the fallback if quota runs out.

#### Process for today (directive section 3)

The demo build holds no real money (Paystack test mode) and no real patient data (synthetic
seed). Under the directive's "what happens if it is silently wrong for a month" test, it is
**tier 1**. The following still hold today:

- **N2:** tests for the core invariants are written from this PRD by a separate test author (a
  separate agent that has not seen the implementation). They cover the SearchIntent schema and
  catalogue constraint, emergency detection (including its fail-safe), the last-slot race,
  webhook signature fail-closed, and `core/access` deny-by-default.
- **N7:** git attribution is the human operator only.
- ADRs are written only for the data model.

**Demo code is not production code.** Before any real patient data, real money or payouts
(FR-059), each component must pass its tier from section 13, including the tier 3 gates.

**Timeline (WAT):**

| Time | Work |
| --- | --- |
| 10:00–10:30 | Accounts and keys. Scaffold, schema and seed data |
| 10:30–12:00 | `core/intent` (parser, emergency detection), AI adapter, search and ranking, search UI. At the 11:30 mentor checkpoint, show search |
| 12:00–13:00 | Booking hold and confirm, with the concurrency test |
| 13:00–13:45 | Lunch |
| 14:00–15:30 | Paystack test mode, results upload and view, deploy to Vercel |
| 15:30–15:45 | Checkpoint: the deployed link works end to end |
| 15:45–16:30 | Eval run and numbers, test pass, empty and error states, polish |
| 16:30–17:00 | Record the video, finish the slides and disclosure |
| 17:00–17:15 | Submit and save the confirmation. Do not wait for 17:30 |

### 15.2 Post-hackathon plan

Revised from v1's four two-week phases. It adds a week 0 to test the riskiest assumption, and it
moves auth and access control earlier because everything depends on them. Dates are relative.
Calendar and team size are Q15.

| Phase | Weeks | Output | Exit gate |
| --- | --- | --- | --- |
| **0: Validate** | 0 | `prd-questions.md` answered. NHFR spike (FR-030). Pilot facility conversations begin. ADRs: data model, auth, hosting region, geo approach | Stop conditions (5.3) reviewed |
| **1: Foundation and data** | 1–2 | Next.js, TS strict, ESLint, Tailwind, CI. `src/core/` skeleton. Prisma schema. Auth plus `core/access` with tests first. NHFR ingestion for the pilot state. TestCatalog and synonyms seeded | Access control tests green; ingestion idempotent |
| **2: Search and AI** | 3–4 | Deterministic parser and emergency detection. AI adapter with mock default and one live provider. Geocoder. Ranking. Search UI with chips and structured form. Eval set v1 | Eval thresholds met; NFR-001 measured |
| **3: Booking and payments** | 5–6 | Facility onboarding, catalogue and slots. Hold and confirm. Paystack in test mode. Webhooks, verify, refunds, reconciliation. Notifications | All tier 3 gates, including second review and adversary |
| **4: Vault, dashboards, launch** | 7–8 | Results upload and download with audit. Patient and facility dashboards. Operator admin. DPIA. Load test. Staged rollout with feature flags | Definition of done (directive section 9) for every component; `payments_live` switched on only after the pilot sign-off |

## 16. Divergences from v1, with reasons

| v1 said | v2 says | Why |
| --- | --- | --- |
| "Ensure 100% data alignment with official Federal Ministry of Health datasets" | Every displayed facility traces to an NHFR record with a sync date (FR-031). Overrides are stored separately | The v1 claim cannot be tested: we don't control source quality or update frequency. Traceability can be tested |
| "Retrieves verified hospitals/labs via vector similarity search" | Structured filters plus geo-ranking select facilities. Vector or lexical similarity only matches test and service names | Embeddings don't understand distance, opening hours or exact test availability. Using them for facility selection gives plausible but wrong results |
| Pinecone *or* pgvector | pgvector | One fewer processor for health-adjacent data. Scale is well within Postgres |
| Paystack/Flutterwave | Paystack only in v1 | Two payment integrations double the tier 3 surface. Flutterwave deferred |
| "HIPAA-inspired encryption" | NDPA 2023 compliance, with concrete SEC- requirements | HIPAA doesn't apply in Nigeria. "Inspired" can't be tested |
| TypeScript to "eliminate runtime type errors" | TS strict plus runtime validation at boundaries | Static types don't validate model output, webhooks or registry data at runtime |
| "Under 2 seconds" | p50 ≤ 1.2 s, p95 ≤ 2.0 s server time, with fallback on AI timeout | A single number with no percentile or scope can't be checked |
| GPT-4o mini (fixed) | Provider-neutral adapter. GPT-4o mini is a candidate | Matches the AI reference material. Avoids lock-in and lets the product run in mock and offline mode |
| AI "extracts geo-coordinates" | AI extracts a location *phrase*. A deterministic geocoder resolves coordinates | LLMs make up coordinates. A wrong location sends a patient to the wrong place |
| AI parses "symptoms" | Symptoms route to facility types and clinician advice. There is no test recommendation without a clinician-reviewed mapping | Recommending tests from symptoms is medical advice |
| "Transactional locks" | Two-phase hold and confirm enforced in the database, with expiry | Payment takes minutes. A lock can't be held open for that long |
| Phone number and OTP sign-in (FR-002) | Username, password and PIN, started from the search box (FR-008) | Product owner request (2026-09-27). No SMS provider is needed for the demo. OTP remains the target for launch (Q5) |
| Only registry and partner data shown (v2.0, AI-011) | Live Google Maps places are also shown, labelled unverified and not bookable (FR-027) | Product owner request (2026-09-27): users need real nearby options, and the demo database is synthetic. The AI-011 rule that the model never invents facts still holds, because places come from the tool's structured result, not from model text |
| Signed URL upload "mapping reports to user profiles" | Results are tied to an appointment and uploaded only by that facility's staff. Access is audited and versioned | Stops wrong-patient uploads and gives an access trail |
| 4 phases × 2 weeks | A one-day hackathon demo slice first (15.1), then the phased plan with week 0 added and auth moved earlier (15.2) | The hackathon deadline is the first real milestone. After it, the riskiest assumption is tested first, and access control underpins everything else |
| Paystack/Flutterwave "payment switches", with no payout model | The platform collects and pays facilities by bank transfer, with a verified-account, ledger and approval process (FR-059 to FR-059g) | Decided by the product owner. Payouts are a new money path that v1 did not describe |

## 17. Open questions

Each one needs an owner and an answer recorded in `prd-questions.md`. The **Blocks** column
shows what cannot start until it is answered.

| # | Question | Blocks |
| --- | --- | --- |
| Q1 | ~~Product name~~ **Answered 2026-09-27:** RioMed AI | |
| Q2 | Confirm the success targets (section 4) and scale assumptions (11.3) | Load test targets |
| Q3 | Which hosted AI provider for production, and does its API data policy meet AI-032? | AI live mode |
| Q4 | May we store redacted prompts for 30 days for evaluation? | AI-030 |
| Q5 | Phone OTP only, or phone plus email? Which SMS provider? | Auth ADR |
| Q6 | Minimum age for an account. Rules for booking for dependants and for teenagers' records | Dependants feature |
| Q7 | ~~Clinician available?~~ **Answered 2026-09-27:** yes. Still needed: the clinician's name, and sign-off on the red-flag list and any symptom-to-test mapping | Live launch of AI-020 and FR-017 |
| Q8 | Hide or label NHFR facilities marked non-operational? | FR-021 |
| Q9 | Should patients be able to upload their own old results (v1.1)? | Vault scope |
| Q10 | Cancellation and refund policy (cut-off hours, partial refunds, who pays Paystack fees) | FR-045, checkout UI |
| Q11 | ~~Settlement~~ **Answered 2026-09-27:** facilities are paid by transfer to their bank accounts (FR-059) | |
| Q11b | Platform fee or commission (or free for the pilot), and payout frequency (proposed weekly) | FR-051, FR-059c, FR-059g |
| Q12 | Can operators ever see result files? Break-glass process? | Access matrix |
| Q13 | Retention of results, and effect of patient deletion | 11.5 |
| Q14 | Legal: NDPA obligations (DPO, registration, DPIA filing, cross-border transfer basis), and any health-sector rules for storing results | Live launch |
| Q15 | ~~Hackathon?~~ **Answered 2026-09-27:** yes, the GoMyCode hackathon on 27 September 2026. The demo slice is in 15.1. Still needed: the team roster and which AI provider key works today | Submission form |
| Q16 | Pilot geography: confirm Ikeja / Lagos | Ingestion scope, partner recruitment |
| Q17 | NHFR licence and terms: may the data be republished in a commercial app? | FR-030, launch |

## 18. Glossary and references

- **NHFR:** Nigeria Health Facility Registry, maintained under the Federal Ministry of Health.
- **Partner facility:** a facility that has onboarded to RioMed and manages catalogue, slots and
  results. **Listed facility:** in the NHFR only, discovery only.
- **Kobo:** 1/100 of a naira. Paystack amounts are in kobo.
- **Hold:** a temporary, expiring reservation of slot capacity during payment.
- **SearchIntent:** the validated, structured output of the prompt engine (FR-010).
- **Mock mode:** AI adapter mode with no inference. It must be labelled (AI-003).
- **NDPA / NDPC:** Nigeria Data Protection Act 2023 and the Nigeria Data Protection Commission.
- **DPIA:** data protection impact assessment.

References: v1 PRD (*MedPulse AI PRD & Architecture*), [BUILD-DIRECTIVE.md](../BUILD-DIRECTIVE.md),
[reference/ai-starters/](../reference/ai-starters/), Paystack API documentation (transactions,
webhooks, refunds), NDPA 2023 text.

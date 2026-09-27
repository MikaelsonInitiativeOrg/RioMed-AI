# `src/core` contract (hackathon build)

This is the public interface of the domain core, the source of truth under directive N3. Tests
are written against this contract and [docs/PRD.md](../PRD.md), not against the
implementation. All modules are pure TypeScript with no framework imports. Import paths use the
`@/core/...` alias, which maps to `src/core/...`.

Time zone: Africa/Lagos is fixed at UTC+1 and has no daylight saving time.

---

## `@/core/catalog`

```ts
export type TestCode = string; // e.g. "MALARIA_MP"
export interface CatalogTest { code: TestCode; name: string; synonyms: string[]; category: string }
export const TEST_CATALOG: readonly CatalogTest[];
export function isKnownTestCode(code: string): boolean;
export function getTest(code: string): CatalogTest | undefined;
```

The catalogue contains at least these codes: `MALARIA_MP`, `WIDAL`, `FBC`, `PCV`, `HIV`, `HBSAG`,
`HCV`, `FBS`, `HBA1C`, `LIPID`, `URINALYSIS`, `PREGNANCY`, `GENOTYPE`, `BLOOD_GROUP`, `LFT`,
`EUCR`, `XRAY_CHEST`, `ULTRASOUND`, `COVID19`.

Minimum synonyms, all matched case-insensitively:

| Code | Synonyms |
| --- | --- |
| `MALARIA_MP` | "malaria", "malaria test", "malaria parasite", "mp", "mp test" |
| `WIDAL` | "widal", "typhoid" |
| `FBC` | "full blood count", "fbc", "cbc", "complete blood count" |
| `PCV` | "pcv", "packed cell volume" |
| `HIV` | "hiv", "hiv test" |
| `HBSAG` | "hepatitis b", "hbsag" |
| `HCV` | "hepatitis c", "hcv" |
| `FBS` | "blood sugar", "fasting blood sugar", "fbs", "glucose" |
| `HBA1C` | "hba1c" |
| `LIPID` | "lipid profile", "cholesterol" |
| `URINALYSIS` | "urinalysis", "urine test" |
| `PREGNANCY` | "pregnancy test" |
| `GENOTYPE` | "genotype", "sickle cell" |
| `BLOOD_GROUP` | "blood group" |
| `LFT` | "liver function" |
| `EUCR` | "kidney function", "e/u/cr", "electrolytes" |
| `XRAY_CHEST` | "chest x-ray", "chest xray" |
| `ULTRASOUND` | "ultrasound", "scan" |
| `COVID19` | "covid", "covid test" |

## `@/core/geo`

```ts
export interface LatLng { lat: number; lng: number }
export function haversineKm(a: LatLng, b: LatLng): number; // great-circle distance, Earth radius 6371 km
export interface Place extends LatLng { name: string; kind: "area" | "lga" | "state" }
export const PLACES: readonly Place[];
export function resolveLocation(query: string | null | undefined): Place | null;
```

`resolveLocation` matches case-insensitively on whole words and returns the **longest** place
name contained in the query. For example, "gra ikeja" matches "GRA Ikeja", not "Ikeja". It
returns `null` for empty, null or unknown input and **never guesses**.

- **State-level names are a last resort.** "Lagos" (kind `state`) is returned only if no area or
  LGA matches. So "Yaba, Lagos" resolves to Yaba, and "somewhere in Lagos" resolves to Lagos.
- "Lagos Island" is its own place and is not read as the state.
- Aliases: "vi" is Victoria Island, and "ikeja gra" is GRA Ikeja.

`PLACES` contains at least: Ikeja, GRA Ikeja, Alausa, Opebi, Allen, Maryland, Ogba, Agege,
Oshodi, Yaba, Akoka, Ebute Metta, Surulere, Mushin, Ilupeju, Gbagada, Ketu, Ojota, Magodo,
Lekki, Ajah, Victoria Island, Ikoyi, Lagos Island, Obalende, Festac and Lagos (kind `state`).
All coordinates lie inside the bounding box lat 6.3–6.8, lng 3.0–3.8.

## `@/core/intent`

```ts
export const INTENTS = ["find_test", "find_facility", "book", "emergency", "unsupported"] as const;
export const DAY_PARTS = ["morning", "afternoon", "evening", "any"] as const;
export const FACILITY_TYPES = ["hospital", "clinic", "laboratory", "diagnostic_centre", "primary_health_centre"] as const;

export interface When { day: string | null; part: (typeof DAY_PARTS)[number] }
//   day: "today" | "tomorrow" | "monday".."sunday" | "YYYY-MM-DD" | null

export interface SearchIntent {
  intent: (typeof INTENTS)[number];
  tests: string[];              // catalogue codes only, deduplicated, max 5
  locationQuery: string | null; // a place PHRASE, never coordinates, max 100 chars
  when: When | null;
  facilityType: (typeof FACILITY_TYPES)[number] | null;
  confidence: number;           // 0..1
}

export const SearchIntentSchema: import("zod").ZodType<SearchIntent>;

/** Validate untrusted model output. Accepts an object or a JSON string. The string may be
 *  wrapped in ``` or ```json fences. Unknown test codes are DROPPED, not rejected. Returns
 *  null if the shape is invalid. It never throws. */
export function validateModelIntent(raw: unknown): SearchIntent | null;

/** Deterministic parser. Needs no network. Never throws, whatever string it is given. */
export function parseDeterministic(text: string): SearchIntent;

export interface EmergencyCheck { isEmergency: boolean; matched: string[] }
export function detectEmergency(text: string): EmergencyCheck;
/** Fail-safe wrapper (AI-021): if detection throws for any reason, returns isEmergency: true. */
export function detectEmergencySafe(text: string, detector?: (t: string) => EmergencyCheck): EmergencyCheck;

export interface TimeWindow { start: Date; end: Date }
export function resolveWhen(when: When | null, now: Date): TimeWindow | null;

export const RED_FLAG_STATUS: "draft-pending-clinician-review";

/** FR-017 guard (added 2026-09-27): true if the text names this catalogue test through its
 *  name or a synonym, allowing small misspellings. Every word of the phrase must match a
 *  word in the text: exactly for words of 3 characters or fewer, within edit distance 1 for
 *  4–5 characters, and within 2 for 6 or more. Multi-word abbreviations such as "e/u/cr" also
 *  match with the punctuation removed. False for unknown codes and non-string text. Never throws. */
export function isTestMentioned(code: string, text: string): boolean;
```

Examples:

| Text | Code | Result |
| --- | --- | --- |
| "I have fever and headache" | `MALARIA_MP` or `WIDAL` | false |
| "I missed my period" | `PREGNANCY` | false |
| "abeg I wan do tyfoid test" | `WIDAL` | true |
| "malria test" | `MALARIA_MP` | true |
| "ful blood count" | `FBC` | true |
| "I need E/U/Cr" | `EUCR` | true |
| "LFT for my dad" | `LFT` | true |

### Rules for `parseDeterministic(text)`

- **`tests`:** catalogue codes found through synonyms, whole-word and case-insensitive, in order
  of first appearance, with no duplicates. Where two synonyms overlap, the longer match wins.
- **`locationQuery`:** the canonical `name` from `resolveLocation(text)`, or `null`.
- **`when.day`:**
  - "today", "tomorrow" or a weekday name ("monday" to "sunday") found in the text.
  - "tonight" means day "today" with part "evening".
  - Parts are found from "morning", "afternoon" and "evening".
  - If only a part is found, day is `null`.
  - If neither a day nor a part is found, `when` is `null`.
  - If a day is found without a part, part is `"any"`.
- **`facilityType`:**
  - "hospital" gives `hospital`.
  - "clinic" gives `clinic`.
  - "lab" or "laboratory" gives `laboratory`.
  - "diagnostic" gives `diagnostic_centre`.
  - "phc" or "primary health" gives `primary_health_centre`.
  - Otherwise `null`.
- **`intent`:**
  - `emergency` if `detectEmergency(text).isEmergency`.
  - Otherwise `find_test` if there are tests.
  - Otherwise `find_facility` if there is a facilityType or a locationQuery.
  - Otherwise `unsupported`.
- **`confidence`:** in the range 0 to 1.
- It never outputs a diagnosis, and has no field for one.

### Rules for `detectEmergency(text)`

- Matching is case-insensitive, normalises whitespace and curly apostrophes, and works on whole
  words or phrases.
- At minimum it matches: "chest pain", "difficulty breathing", "can't breathe", "cannot
  breathe", "shortness of breath", "not breathing", "heavy bleeding", "bleeding heavily",
  "unconscious", "unresponsive", "seizure", "convulsion", "convulse", "convulsed", "fitting", "stroke", "slurred speech", "suicide", "kill
  myself", "end my life", "overdose", "poisoning", "snake bite", "severe burn".
- `matched` lists the canonical phrases that matched.
- Ordinary requests such as "malaria test in Ikeja" or "blood sugar test" MUST NOT match.
- Words that only contain a phrase MUST NOT match. For example, "unfitting" does not match
  "fitting".

### Rules for `resolveWhen(when, now)`

Windows are in Lagos local time:

| Part | Window |
| --- | --- |
| morning | 07:00–12:00 |
| afternoon | 12:00–17:00 |
| evening | 17:00–21:00 |
| any | 07:00–21:00 |

The function returns UTC `Date`s. For example, Lagos 07:00 is 06:00Z.

- `when === null` gives `null`.
- "today" is the Lagos calendar date of `now`. "tomorrow" is the next one.
- A weekday name means the next date with that weekday, **including today**.
- "YYYY-MM-DD" means that date. A date before today in Lagos gives `null`, and so does an
  invalid date.
- A `null` day means today, unless today's window has already ended, in which case it means
  tomorrow.
- If the window has already started, `start` becomes `max(start, now)`.
- If the window for an explicit "today" has already ended, the result is `null`.

## `@/core/search`

```ts
export interface FacilityCandidate {
  id: string; name: string; lat: number; lng: number;
  operational: boolean; isPartner: boolean;
  offeredTests: string[];     // partner catalogue; [] for listed-only facilities
  hasSlotInWindow: boolean;   // false for listed-only facilities
}
export interface RankedFacility extends FacilityCandidate { distanceKm: number; offersTests: boolean; score: number }
export interface SearchResult { results: RankedFacility[]; radiusKm: number; widened: boolean }
export const RADII_KM: readonly number[]; // [10, 20, 35, 50]
export function searchFacilities(
  candidates: FacilityCandidate[],
  query: { origin: LatLng; testCodes: string[] },
  opts?: { minResults?: number } // default 3
): SearchResult;
```

- Non-operational candidates are excluded (Q8, decided for the demo).
- `offersTests` is true when every requested test code is in `offeredTests`. It is also true when
  no tests were requested.
- **Radius widening (FR-026):**
  - Start at 10 km. Include candidates with `distanceKm <= radius`.
  - If there are fewer than `minResults`, move to the next radius, up to 50 km.
  - `radiusKm` is the radius finally used.
  - `widened` is true if that radius is larger than 10.
- **Score** (lower is better) = `distanceKm` + 8 if tests were requested and `!offersTests`,
  + 4 if `!hasSlotInWindow`, + 3 if `!isPartner`.
- Results are sorted by score ascending, then distanceKm, then name.
- **Monotonicity:** of two candidates that differ only in distance, the closer one is never ranked
  below the farther one.

## `@/core/money`

```ts
export function assertKobo(n: number): void;          // throws unless n is a safe non-negative integer
export function computeCharge(priceKobo: number, feeKobo?: number): number; // integer sum; throws on invalid input
export function formatNaira(kobo: number): string;    // 250000 -> "₦2,500"; 250050 -> "₦2,500.50"; throws on non-integer
```

## `@/core/booking`

```ts
export const APPOINTMENT_STATUSES = ["HELD","PENDING_PAYMENT","CONFIRMED","CHECKED_IN","COMPLETED",
  "RESULT_AVAILABLE","EXPIRED","CANCELLED_BY_PATIENT","CANCELLED_BY_FACILITY","NO_SHOW","REFUNDED"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];
export function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean;
export class InvalidTransitionError extends Error {}
export function assertTransition(from: AppointmentStatus, to: AppointmentStatus): void; // throws InvalidTransitionError
export function releasesCapacity(from: AppointmentStatus, to: AppointmentStatus): boolean;
export function acquiresCapacity(from: AppointmentStatus, to: AppointmentStatus): boolean;
export const HOLD_MINUTES: 15;
export const MAX_ACTIVE_HOLDS_PER_PATIENT: 2;
export function generateBookingReference(rand?: (n: number) => Uint8Array): string;
// matches /^RM-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/  (no 0, O, 1 or I)
export function isSlotBookable(slotStart: Date, now: Date, minNoticeMinutes?: number): boolean; // default 60
```

**Allowed transitions.** Every other transition, including X → X, is invalid.

| From | Allowed to |
| --- | --- |
| HELD | PENDING_PAYMENT, CONFIRMED, EXPIRED, CANCELLED_BY_PATIENT |
| PENDING_PAYMENT | CONFIRMED, EXPIRED, CANCELLED_BY_PATIENT |
| EXPIRED | CONFIRMED (late payment when capacity can be re-acquired), REFUNDED (late payment when it cannot) |
| CONFIRMED | CHECKED_IN, CANCELLED_BY_PATIENT, CANCELLED_BY_FACILITY, NO_SHOW |
| CHECKED_IN | COMPLETED, RESULT_AVAILABLE |
| COMPLETED | RESULT_AVAILABLE |
| CANCELLED_BY_PATIENT | REFUNDED |
| CANCELLED_BY_FACILITY | REFUNDED |
| NO_SHOW, REFUNDED, RESULT_AVAILABLE | nothing (terminal) |

**Capacity.**
- `releasesCapacity(from, to)` is true exactly when `from` is in {HELD, PENDING_PAYMENT,
  CONFIRMED} and `to` is in {EXPIRED, CANCELLED_BY_PATIENT, CANCELLED_BY_FACILITY}.
- `acquiresCapacity(from, to)` is true exactly for EXPIRED → CONFIRMED.

`isSlotBookable` is true when `slotStart - now >= minNoticeMinutes`.

## `@/core/payments`

```ts
/** HMAC-SHA512 of the raw body with the secret, in hex, compared in constant time.
 *  Returns false (fail closed) if body, signature or secret is missing or empty, or the length is wrong. */
export function verifyPaystackSignature(rawBody: string, signature: string | null | undefined, secret: string | null | undefined): boolean;

/** Check Paystack's Verify Transaction `data` object against what we expect.
 *  ok only if status === "success", reference matches, amount (kobo) matches exactly and currency === "NGN".
 *  Malformed input returns { ok: false }. It never throws. */
export function checkVerifiedTransaction(
  data: unknown, expected: { reference: string; amountKobo: number }
): { ok: true } | { ok: false; reason: string };
```

## `@/core/access`

```ts
export type Role = "patient" | "facility_staff" | "facility_admin" | "operator";
export interface Actor { userId: string; role: Role; facilityId?: string | null }
export type Action = "booking:create" | "appointment:view" | "appointment:checkin" | "result:upload" | "result:view";
export interface Subject { patientUserId?: string; facilityId?: string; status?: AppointmentStatus }
export function can(actor: Actor | null | undefined, action: Action, subject: Subject | null | undefined): boolean;
```

**Deny by default (SEC-007).** A missing actor, missing subject, unknown role, unknown action,
empty userId or missing required subject field returns false.

| Action | Allowed |
| --- | --- |
| `booking:create` | A patient where `subject.patientUserId === actor.userId` |
| `appointment:view` | The owning patient. Staff or admin whose `facilityId === subject.facilityId`. An operator |
| `appointment:checkin` | Staff or admin of the same facility, with status `CONFIRMED` |
| `result:upload` | Staff or admin of the same facility, with status in {CHECKED_IN, COMPLETED, RESULT_AVAILABLE} |
| `result:view` | The owning patient. Staff or admin of the same facility. **Never an operator** (Q12 default) |

A staff actor with no `facilityId` is denied every facility-scoped action.

## `@/core/ai`

```ts
export type AiMode = "mock" | "gemini" | "groq" | "ollama" | "lmstudio";
export interface IntentResult {
  intent: SearchIntent;
  emergency: EmergencyCheck;
  source: "llm" | "fallback" | "mock";
  mode: AiMode;
  latencyMs: number;
  fallbackReason?: string;
}
export function parseIntent(
  text: string,
  opts?: { env?: Record<string, string | undefined>; fetchImpl?: typeof fetch; timeoutMs?: number; now?: Date }
): Promise<IntentResult>;
```

- `env` defaults to `process.env`. The mode is `env.AI_PROVIDER`, lowercased, defaulting to
  `"mock"`. An unknown provider is treated as mock with a `fallbackReason`.
- Input is trimmed. Empty input, or more than 1,000 characters, **rejects** with an Error whose
  message starts with `"INVALID_INPUT"`.
- Emergency detection (`detectEmergencySafe`) always runs first and does not depend on the
  model. If it matches, `intent.intent` is `"emergency"`, whatever the model says.
- The model can **add** an emergency but never remove one. If `source` is `"llm"`, the model
  returned intent `"emergency"`, and the rules did not match, then `emergency` is
  `{ isEmergency: true, matched: ["ai-flagged"] }`. (Added 2026-09-27: "my baby dey convulse" was
  missed by the rules.)
- **mock:** makes no network call. Returns `parseDeterministic` with `source: "mock"`.
- **Other modes:**
  - Calls the provider with `fetchImpl` (default `fetch`). The key comes from `env.AI_API_KEY`
    and the model from `env.AI_MODEL`.
  - The key is NEVER put in the URL. Gemini uses the `x-goog-api-key` header. Groq, Ollama and
    LM Studio use `Authorization: Bearer`, with no header when the key is empty for local.
  - `ollama` and `lmstudio` require an `AI_BASE_URL` with the http scheme on a loopback host
    (localhost, 127.0.0.1 or ::1), and no credentials or query. Otherwise it falls back.
  - A missing key (gemini, groq) or missing model falls back, with no network call.
  - The model output goes through `validateModelIntent`.
- **No tests from symptoms (FR-017, added 2026-09-27):** after validation, any model test code
  for which `isTestMentioned(code, text)` is false is removed.
  - If that leaves no tests and the model said `find_test`, the intent becomes `find_facility`
    when there is a locationQuery or facilityType, and `unsupported` otherwise.
  - The emergency rules still apply on top.
- **Fallback:** a timeout (default 1,500 ms), non-2xx response, network error, invalid JSON or
  invalid shape gives `source: "fallback"` with the `parseDeterministic` result and a
  `fallbackReason`. It never rejects in these cases, and it makes **no retry** (at most one fetch
  call per `parseIntent`).
- The prompt text sent to the provider contains the user text, but no user id, phone number or
  coordinates.

## `@riomed/backend/server/livePlaces` (pure parts, FR-027)

```ts
export interface LivePlace { placeId: string; name: string; mapsUrl: string }
/** Parse a Gemini Interactions API response. Only places from steps of type
 *  "google_maps_result" (result[].places[] with string place_id, name and url) are used.
 *  The model's prose is never used. */
export function extractPlaces(json: unknown): LivePlace[];
export function sanitizeAddress(raw: string): string | null;
export function livePlacesEnabled(env?: Record<string, string | undefined>): boolean;
```

- **`extractPlaces`:**
  - URLs must be https on maps.google.com, www.google.com or google.com. Places with any other
    URL are dropped.
  - Places are deduplicated by place_id, and a trailing " - Google Maps" is stripped from the
    name. Names are capped at 120 characters.
  - If any `model_output` step has `place_citation` annotations whose place_id is among the
    found places, only the cited places are returned, in citation order. Otherwise all found
    places are returned in their original order.
  - At most 10 places are returned.
  - Malformed input gives `[]`. It never throws.
- **`sanitizeAddress`:** removes control characters and `< > { } \` " \\`, collapses whitespace,
  trims, and caps the result at 120 characters. Returns null if the result is shorter than 2
  characters.
- **`livePlacesEnabled`:** true only when `AI_PROVIDER` is "gemini", `AI_API_KEY` is set, and
  `LIVE_PLACES` is not "off".
- **`findLivePlaces`:** network code. It is not unit-tested beyond these pure parts.

## `@/core/intent` account rules (added 2026-09-27, FR-008)

```ts
export type AccountAction = "create" | "access";
export type AccountType = "patient" | "facility";
export interface AccountIntent { action: AccountAction; type: AccountType }
export function detectAccountIntent(text: string): AccountIntent | null;
export function looksLikeCredential(text: string): boolean;
```

**`detectAccountIntent`** uses fixed rules only, with no AI. It is case-insensitive and matches
whole words or phrases. It never throws.

- **"create":** any of "create an account", "create account", "create my account", "sign up",
  "signup", "register", "open an account", "open account", "new account", "make an account" or
  "join riomed".
- **"access":** any of "access dashboard", "access my dashboard", "open dashboard", "open my
  dashboard", "my dashboard", "dashboard", "log in", "login", "sign in", "signin", "my account",
  "my bookings", "my results" or "facility desk".
- If both match, the action is "create".
- **Search wins.** The result is `null` if the text also contains any of "test", "near",
  "around", "book", "appointment", "find" or "where". For example, "register for a malaria test
  near Yaba" gives null.
- **Type:** "facility" if the text contains any of "clinic", "facility", "hospital", "lab",
  "laboratory", "diagnostic", "centre", "center", "staff" or "phc". Otherwise "patient".
- The result is `null` for non-strings, empty text, text over 200 characters, or no match.

**`looksLikeCredential`** returns true when any of these hold:

- the whole text, trimmed, is 4–6 digits;
- a keyword (password, passcode, passwd or pin) is followed by "is", ":", "=" or "na" and then a
  token of 3 or more characters;
- a keyword is followed by a token that contains a digit.

It returns false whenever the text contains "forgot", "forget", "reset" or "change". Examples:
- true: "my password is abc12345", "pin: 4821", "4821", "password hunter22", "password na mylove"
- false: "I forgot my password", "pin test", "what is a pin"

## `@/core/credentials` (added 2026-09-27)

```ts
export type Check = { ok: true; value: string } | { ok: false; error: string };
export function checkUsername(raw: unknown): Check;
export function checkPassword(raw: unknown, username?: string): Check;
export function checkPin(raw: unknown): Check;
export const MAX_FAILED_ATTEMPTS: 5;
export const LOCK_MINUTES: 15;
```

- **`checkUsername`:** the value is trimmed and lowercased. It must match `^[a-z0-9_.]{3,30}$`
  and must not start or end with "." or "_".
- **`checkPassword`:** 8–128 characters. It must not contain the username (case-insensitive).
  It rejects a single repeated character and the common passwords "password", "password1",
  "12345678", "123456789" and "qwertyui", compared case-insensitively. The value is returned
  unchanged.
- **`checkPin`:** exactly 4–6 digits, as a string. It rejects all-same digits (for example 1111)
  and runs that are ascending or descending with wrap-around. Wrap-around means runs inside
  "0123456789012345" (for example 1234, 7890, 890123) or "9876543210987654" (for example 4321,
  0987).
- Non-string input gives `{ ok: false }`. None of these functions throw.

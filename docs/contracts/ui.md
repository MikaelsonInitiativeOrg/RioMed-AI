# Frontend contract (`frontend/`)

This is the boundary between the **frontend** (UI design, owned by the frontend agent) and the
**backend** (logic and data, owned by the backend agent). If you work on the frontend, this file,
[docs/PRD.md](../PRD.md) and `frontend/` are all you need.

## Rules

1. **Never import the database.** No `@prisma/client` and no `@riomed/backend/server/db` in
   `frontend/`. Get data only from the functions listed below.
2. **No business logic in the UI.** Prices, availability, permissions, ranking, statuses and
   emergency detection all come from the backend. The UI formats and displays them. Use
   `formatNaira` for money, and `@/lib/format` for dates, which are shown in Africa/Lagos time.
3. **Keep the data flow; change the look freely.** You may restyle, restructure, split into
   components, and add client components for interaction. Keep calling the same functions and
   server actions with the same form field names.
4. **Required labels.** These are safety and honesty requirements, so they may be restyled but
   must not be removed:
   - The demo banner: synthetic data, Paystack test mode, and the AI mode. Mock mode must read
     "MOCK (no AI inference)" (AI-003).
   - The footer line "RioMed helps you find and book care. It does not give medical advice. In an
     emergency call 112." (AI-022).
   - The `EmergencyBanner` must come **first**, above all results, whenever
     `emergency.isEmergency` is true, with a working `tel:112` link (AI-020).
   - "demo data" on facility records, "Listed only" or "booking not available" on non-partner
     facilities, and "Simulated payment · no money moves" on `/pay/simulated`.
   - The "understood by AI / rule-based parser / fallback" line on search results.
5. **Required states on every screen:** loading, empty, error, and too much data. See PRD 11.1
   and 11.2.
6. **Constraints:** mobile-first. Must work on slow 3G with a mid-range Android phone. Keep the
   search route's JavaScript under 200 KB gzipped, so prefer Server Components. WCAG 2.1 AA, with
   touch targets of 44 px or more. Tailwind v4 is available. Don't add large UI libraries without
   asking.
7. **Need new data or a new action?** Add a request under "Requests" at the bottom of this file,
   and do not implement it in `frontend/`. The backend agent adds it and updates this contract.

## Pages

| Route | File | Data | Actions and links |
| --- | --- | --- | --- |
| `/` | `app/page.tsx` | `runPromptSearch(q)` for `?q=`, or `searchWithIntent(intent)` for `?area=&test=&day=&part=`, both from `server/search`. They return `SearchView`: `ai`, `emergency`, `intent`, `place`, `window`, `results[]`, `radiusKm`, `widened`, `totalMs` | GET forms only. The refine form (`components/SearchRefine`) submits `test`, `area`, `day`, `part`. "See times" links to `/facility/[id]?test=&from=&to=` |
| `/facility/[id]` | `app/facility/[id]/page.tsx` | `getFacilityBooking(id)` from `server/queries` returns `{ facility, tests[], slots[{ id, start, end, remaining }] }` or null | `holdAction` with fields `slotId`, `testCode`, `back`. Errors come back as `?error=` |
| `/appointments/[id]` | `app/appointments/[id]/page.tsx` | `getAppointmentForActor(actor, id)` returns `{ reference, status, testCode, amountKobo, holdExpiresAt, facility, slotStart, paidWith, isOwner, results[] }` or null (render 404) | `payAction` and `cancelAction` (field `appointmentId`). Result links use `resultLink(result.id)` from `server/auth` |
| `/pay/simulated` | `app/pay/simulated/page.tsx` | `getSimulatedPayment(actor, reference)` | `simulatedPayAction` (field `reference`) |
| `/dashboard` | `app/dashboard/page.tsx` | `listPatientAppointments(actor)` returns `[{ id, reference, status, testCode, amountKobo, facilityName, slotStart, hasResult }]` | Links to appointments |
| `/staff` | `app/staff/page.tsx` | `listFacilityAppointments(actor, { referenceQuery })` returns `{ facility, appointments[{ id, reference, status, testCode, slotStart, patientName, resultCount }] }` or null (redirect away) | `checkInAction` (`appointmentId`) and `uploadResultAction` (`appointmentId`, `file`: PDF of 4 MB or less) |
| `/demo-login` | `app/demo-login/page.tsx` | `listDemoUsers()` | `signInAction` (`userId`, `next`) and `signOutAction` |
| `/about` | `app/about/page.tsx` | `getEvalReport()` from `server/evalReport` | – |

- **Signed-in user:** `getSessionUser()` from `@/lib/session` returns `{ userId, role, facilityId, name }` or null.
- **Display helpers:**
  - `getTest(code)` from `core/catalog` gives a test's name.
  - `TEST_CATALOG` and `PLACES` from `core/catalog` and `core/geo` fill the form options.
  - `STATUS_LABEL` and `FACILITY_TYPE_LABEL` come from `@/lib/format`.
- **Statuses:** `HELD`, `PENDING_PAYMENT`, `CONFIRMED`, `CHECKED_IN`, `COMPLETED`,
  `RESULT_AVAILABLE`, `EXPIRED`, `CANCELLED_BY_PATIENT`, `CANCELLED_BY_FACILITY`, `NO_SHOW`,
  `REFUNDED`.

## Live nearby places (FR-027, added 2026-09-27)

- **Component:** `components/LiveNearby.tsx` (a client component) with the prop `address: string`.
  - It calls `GET /api/live-places?address=…`, which returns
    `{ status: "ok" | "disabled" | "unavailable", places[{ placeId, name, mapsUrl }], reason? }`.
  - It renders nothing when the status is `disabled`.
  - Restyle it freely, but keep these labels: "Live from Google Maps · not verified by RioMed ·
    booking not available", "Sources: Google Maps" directly with the list, and one
    "Open in Google Maps" link per place. Never add a booking button to live places.
- **Wiring, on `/`:**
  - Render `<LiveNearby address={view.intent.locationQuery ?? view.place?.name} />` **below**
    the database results whenever that address is non-empty and there is no emergency.
  - Also render it when `view.place` is null but `view.intent.locationQuery` is set. That means
    the gazetteer didn't know the area, for example "Ikorodu", and live search is the only
    source. In that case, replace the "Where are you?" message with a short note that there are
    no RioMed partners in that area yet.
  - Live search takes about 6–9 s, so its loading state must not block the rest of the page.
- **Data addition:** `SearchView.results[].ownership` ("public" | "private") is now available,
  as requested.

## Accounts (FR-008, added 2026-09-27)

- **Opening the popup:** typing "create an account", "access dashboard", "register my clinic"
  and similar phrases into search sends the user to `/account?...`. `src/proxy.ts` does this with
  fixed rules, so no page change is needed. `/account` renders a popup-style dialog from
  `components/AccountDialog.tsx`: `SignUpDialog`, `PasswordDialog`, `PinDialog`,
  `PendingDialog` or `CredentialWarningDialog`.
  - Restyle freely. You may also turn it into a real modal over the home page with an
    intercepting route.
  - Keep the form field names (`displayName`, `username`, `password`, `pin`, `facilityId`,
    `type`, `next`) and the actions `signUpAction`, `passwordLoginAction`, `pinUnlockAction`
    and `forgetDeviceAction`.
- **Never collect a password or PIN anywhere else**, especially the search box. Keep
  `type="password"` on both fields, plus `inputMode="numeric"` on the PIN.
- **`/operator`** (operator role) approves facility accounts through `decideAccountAction`.
- **`getSessionUser()`** now also returns `pending: boolean`. A pending facility account is
  signed in, but has no facility access.
- **Nav request:** add a "Sign in / Create account" link that points to `/account?mode=access`
  and `/account?mode=signup`. Keep "Demo sign-in" too.

## Backend-owned files inside `frontend/` (do not change behaviour)

These are glue code: server actions, route handlers and the session cookie. Restyling is not
relevant to them. Change them only through a request below.

- `app/actions.ts`
- `app/api/**`
- `app/account/page.tsx`, `app/operator/page.tsx` (data flow; styling is yours)
- `proxy.ts`
- `app/pay/callback/route.ts`
- `lib/session.ts`

## Requests

<!-- Frontend agent: add requests here, e.g. "- [ ] /dashboard needs the facility address per appointment". -->

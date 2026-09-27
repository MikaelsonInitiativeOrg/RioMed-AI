"use client";

import { LocateFixed } from "lucide-react";

import Link from "next/link";
import { useActionState, useState } from "react";
import { TEST_CATALOG } from "@riomed/backend/core/catalog";
import { FACILITY_TYPES, FACILITY_TYPE_LABELS, SUGGESTED_PRICES_NAIRA } from "@riomed/backend/core/facilityRegistration";
import { passwordLoginAction, pinUnlockAction, signUpAction, forgetDeviceAction, requestResetAction, resetPasswordAction, type AccountFormState } from "@/app/actions";

/**
 * Account popup opened from the search box ("create an account", "access dashboard").
 * Credentials are posted straight to server actions; they never go through search or the AI.
 */

const input = "mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";
const button = "w-full rounded-xl bg-primary px-5 py-3 font-semibold text-white hover:bg-primary-strong disabled:opacity-60";

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/40 p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="account-title">
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-surface p-5 shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <h1 id="account-title" className="text-lg font-bold text-foreground">{title}</h1>
          <Link href="/" aria-label="Close" className="-m-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-2xl leading-none text-subtle-foreground hover:text-foreground">×</Link>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

function ErrorLine({ state }: { state: AccountFormState }) {
  return state.error ? <p role="alert" className="rounded-lg bg-danger-soft p-2.5 text-sm text-danger-foreground">{state.error}</p> : null;
}

function Pending() {
  return (
    <p className="rounded-lg bg-warning-soft p-3 text-sm text-warning-foreground">
      Your facility account is created and <strong>waiting for RioMed approval</strong>. Once it&apos;s approved, type &quot;access clinic dashboard&quot; to open your facility desk.
    </p>
  );
}

export function SignUpDialog({ type, facilities }: { type: "patient" | "facility"; facilities: Array<{ id: string; name: string; area: string }> }) {
  const [state, action, busy] = useActionState(signUpAction, {});
  const [register, setRegister] = useState<"new" | "join">("new");
  if (state.pending) return <Shell title="Almost there"><Pending /></Shell>;
  return (
    <Shell title={type === "facility" ? "Register your facility" : "Create your account"}>
      <form action={action} className="space-y-3">
        <input type="hidden" name="type" value={type} />
        <ErrorLine state={state} />
        {type === "facility" && (
          <div role="radiogroup" aria-label="Facility account" className="grid grid-cols-2 gap-2 text-sm">
            {([["new", "New facility"], ["join", "Join existing"]] as const).map(([v, label]) => (
              <label key={v} className={`flex min-h-[44px] cursor-pointer items-center justify-center rounded-lg border px-3 font-semibold ${register === v ? "border-primary bg-primary-soft text-foreground" : "border-border-strong text-muted-foreground"}`}>
                <input type="radio" name="register" value={v} checked={register === v} onChange={() => setRegister(v)} className="sr-only" />
                {label}
              </label>
            ))}
          </div>
        )}
        <label className="block text-sm">{type === "facility" ? "Your name (staff member)" : "Your name"}
          <input name="displayName" required minLength={2} maxLength={60} autoComplete="name" className={input} />
        </label>
        {type === "facility" && register === "new" && <NewFacilityFields />}
        {type === "facility" && register === "join" && (
          <label className="block text-sm">Facility
            <select name="facilityId" required defaultValue="" className={input}>
              <option value="" disabled>Choose your facility</option>
              {facilities.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.area})</option>)}
            </select>
          </label>
        )}
        <label className="block text-sm">Email <span className="text-subtle-foreground">(for booking updates and password reset)</span>
          <input name="email" type="email" required maxLength={120} autoComplete="email" autoCapitalize="none" className={input} />
        </label>
        <label className="block text-sm">Username
          <input name="username" required pattern="[A-Za-z0-9_.]{3,30}" autoComplete="username" autoCapitalize="none" className={input} />
        </label>
        <label className="block text-sm">Password <span className="text-subtle-foreground">(8+ characters)</span>
          <input name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" className={input} />
        </label>
        <label className="block text-sm">PIN <span className="text-subtle-foreground">(4–6 digits, for quick unlock on this phone)</span>
          <input name="pin" type="password" inputMode="numeric" pattern="\d{4,6}" required autoComplete="off" className={input} />
        </label>
        {type === "facility" && (
          <p className="text-xs text-muted-foreground">
            {register === "new"
              ? "Your facility is listed as soon as you register, marked \u201cself-registered\u201d, and patients can book your open slots straight away. RioMed may check your details later."
              : "Staff joining an existing facility are checked by RioMed before they can see any bookings."}
          </p>
        )}
        <button disabled={busy} className={button}>{busy ? "Creating…" : "Create account"}</button>
        <p className="text-center text-sm">Already have an account? <Link className="underline" href="/account?mode=access">Sign in</Link></p>
      </form>
    </Shell>
  );
}

/** New facility: name, type, address (or current location), and the tests offered with prices. */
function NewFacilityFields() {
  const [coords, setCoords] = useState<{ lat: string; lng: string } | null>(null);
  const [locating, setLocating] = useState<"idle" | "busy" | "error">("idle");
  function useHere() {
    if (!("geolocation" in navigator)) return setLocating("error");
    setLocating("busy");
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords({ lat: p.coords.latitude.toFixed(4), lng: p.coords.longitude.toFixed(4) }); setLocating("idle"); },
      () => setLocating("error"),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }
  return (
    <fieldset className="space-y-3">
      <label className="block text-sm">Facility name
        <input name="facilityName" required minLength={3} maxLength={80} className={input} />
      </label>
      <label className="block text-sm">Type
        <select name="facilityType" required defaultValue="clinic" className={input}>
          {FACILITY_TYPES.map((t) => <option key={t} value={t}>{FACILITY_TYPE_LABELS[t]}</option>)}
        </select>
      </label>
      <label className="block text-sm">Address <span className="text-subtle-foreground">(street, area, city, country)</span>
        <input name="address" required minLength={5} maxLength={160} autoComplete="street-address" placeholder="e.g. 12 Aminu Kano Crescent, Wuse 2, Abuja" className={input} />
      </label>
      <div className="text-sm">
        <button type="button" onClick={useHere} className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-border-strong px-3 font-semibold text-primary hover:bg-primary-soft">
          <LocateFixed className="h-4 w-4" aria-hidden />{coords ? "Map pin set to your current location" : locating === "busy" ? "Finding your location…" : "I'm at the facility: use my location for the map pin"}
        </button>
        {locating === "error" && <p role="alert" className="mt-1 text-xs text-danger-foreground">Couldn&apos;t get your location. We&apos;ll place the pin from the address.</p>}
        {coords && <><input type="hidden" name="lat" value={coords.lat} /><input type="hidden" name="lng" value={coords.lng} /></>}
      </div>
      <label className="block text-sm">Phone <span className="text-subtle-foreground">(patients can call to book)</span>
        <input name="phone" type="tel" maxLength={20} autoComplete="tel" className={input} />
      </label>
      <div className="space-y-3 rounded-lg border border-border bg-background p-3">
        <p className="text-sm font-bold text-foreground">Business bank account <span className="font-normal text-subtle-foreground">(required: patients pay you directly by transfer)</span></p>
        <label className="block text-sm">Bank name
          <input name="bankName" required minLength={2} maxLength={60} placeholder="e.g. GTBank" className={input} />
        </label>
        <label className="block text-sm">Account number <span className="text-subtle-foreground">(10 digits)</span>
          <input name="accountNumber" required inputMode="numeric" pattern="[0-9 -]{10,13}" maxLength={13} autoComplete="off" className={input} />
        </label>
        <label className="block text-sm">Account name <span className="text-subtle-foreground">(as the bank shows it)</span>
          <input name="accountName" required minLength={3} maxLength={80} className={input} />
        </label>
        <p className="text-xs text-subtle-foreground">RioMed never holds patients&apos; money. You confirm each transfer on your desk when it arrives.</p>
      </div>
      <div className="text-sm">
        <p className="font-medium">Tests you offer, with your price in naira</p>
        <ul className="mt-2 max-h-64 space-y-1.5 overflow-y-auto rounded-lg border border-border-strong p-2">
          {TEST_CATALOG.map((t) => (
            <li key={t.code} className="flex items-center gap-2">
              <label className="flex min-h-[44px] flex-1 items-center gap-2">
                <input type="checkbox" name="tests" value={t.code} className="h-5 w-5 accent-primary" />
                <span>{t.name}</span>
              </label>
              <span className="text-subtle-foreground" aria-hidden="true">₦</span>
              <input name={`price_${t.code}`} inputMode="numeric" defaultValue={SUGGESTED_PRICES_NAIRA[t.code] ?? ""} aria-label={`Price for ${t.name} in naira`} className="w-24 rounded-lg border border-border-strong px-2 py-2 text-right text-base" />
            </li>
          ))}
        </ul>
        <p className="mt-1 text-xs text-subtle-foreground">Open slots are created for the next 14 days, 08:00–18:00 (closed Sundays, except hospitals), 2 patients per hour.</p>
      </div>
    </fieldset>
  );
}

export function PasswordDialog({ next }: { next: string }) {
  const [state, action, busy] = useActionState(passwordLoginAction, {});
  if (state.pending) return <Shell title="Waiting for approval"><Pending /></Shell>;
  return (
    <Shell title="Sign in">
      <form action={action} className="space-y-3">
        <input type="hidden" name="next" value={next} />
        <ErrorLine state={state} />
        <label className="block text-sm">Username
          <input name="username" required autoComplete="username" autoCapitalize="none" className={input} />
        </label>
        <label className="block text-sm">Password
          <input name="password" type="password" required autoComplete="current-password" className={input} />
        </label>
        <button disabled={busy} className={button}>{busy ? "Signing in…" : "Sign in"}</button>
        <p className="text-center text-sm"><Link className="underline" href="/account?mode=forgot">Forgot password?</Link></p>
        <p className="text-center text-sm">New here? <Link className="underline" href="/account?mode=signup">Create an account</Link> · <Link className="underline" href="/account?mode=signup&type=facility">Register a facility</Link></p>
      </form>
    </Shell>
  );
}

export function PinDialog({ next, who }: { next: string; who: string }) {
  const [state, action, busy] = useActionState(pinUnlockAction, {});
  if (state.pending) return <Shell title="Waiting for approval"><Pending /></Shell>;
  return (
    <Shell title="Enter your PIN">
      <form action={action} className="space-y-3">
        <input type="hidden" name="next" value={next} />
        <p className="text-sm text-muted-foreground">Unlocking <strong>{who}</strong> on this device.</p>
        <ErrorLine state={state} />
        <input name="pin" type="password" inputMode="numeric" pattern="\d{4,6}" required autoFocus autoComplete="off" aria-label="PIN"
          className="w-full rounded-xl border border-border-strong px-4 py-3 text-center text-2xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        <button disabled={busy} className={button}>{busy ? "Checking…" : "Unlock dashboard"}</button>
      </form>
      <form action={forgetDeviceAction} className="mt-3 text-center">
        <button className="text-sm underline">Not you, or forgot your PIN? Sign in with password</button>
      </form>
    </Shell>
  );
}

export function PendingDialog() {
  return <Shell title="Waiting for approval"><Pending /></Shell>;
}

export function CredentialWarningDialog() {
  return (
    <Shell title="Don't type passwords in the search box">
      <p className="text-sm">
        It looked like your message contained a password or PIN, so we didn&apos;t search it or send it anywhere. Enter your details only in the sign-in box.
      </p>
      <Link href="/account?mode=access" className={`${button} mt-4 block text-center`}>Sign in securely</Link>
    </Shell>
  );
}

export function ForgotDialog() {
  const [state, action, busy] = useActionState(requestResetAction, {});
  return (
    <Shell title="Reset your password">
      {state.sent ? (
        <div className="space-y-3">
          <p className="rounded-lg bg-accent-soft p-3 text-sm text-accent">{state.sent}</p>
          <p className="text-sm text-muted-foreground">Demo: the email appears in the Inbox of that account. Sign in on another device, or ask a teammate, to open it; in production it goes to the real address.</p>
          <p className="text-center text-sm"><Link className="underline" href="/account?mode=access">Back to sign in</Link></p>
        </div>
      ) : (
        <form action={action} className="space-y-3">
          <p className="text-sm text-muted-foreground">Enter your username or email. We&apos;ll email a link that works for 30 minutes.</p>
          <label className="block text-sm">Username or email
            <input name="identifier" required maxLength={120} autoComplete="username" autoCapitalize="none" className={input} />
          </label>
          <button disabled={busy} className={button}>{busy ? "Sending…" : "Email me a reset link"}</button>
        </form>
      )}
    </Shell>
  );
}

export function ResetDialog({ token }: { token: string }) {
  const [state, action, busy] = useActionState(resetPasswordAction, {});
  return (
    <Shell title="Choose a new password">
      <form action={action} className="space-y-3">
        <input type="hidden" name="token" value={token} />
        <ErrorLine state={state} />
        <label className="block text-sm">New password <span className="text-subtle-foreground">(8+ characters)</span>
          <input name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" className={input} />
        </label>
        <button disabled={busy} className={button}>{busy ? "Saving…" : "Save and sign in"}</button>
      </form>
    </Shell>
  );
}

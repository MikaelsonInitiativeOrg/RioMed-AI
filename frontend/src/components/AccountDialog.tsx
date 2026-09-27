"use client";

import Link from "next/link";
import { useActionState } from "react";
import { passwordLoginAction, pinUnlockAction, signUpAction, forgetDeviceAction, type AccountFormState } from "@/app/actions";

/**
 * Account popup opened from the search box ("create an account", "access dashboard").
 * Credentials are posted straight to server actions; they never go through search or the AI.
 */

const input = "mt-1 w-full rounded-lg border border-emerald-900/20 bg-white px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-emerald-600";
const button = "w-full rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60";

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-emerald-950/40 p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="account-title">
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-5 shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <h1 id="account-title" className="text-lg font-bold text-emerald-950">{title}</h1>
          <Link href="/" aria-label="Close" className="-m-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-2xl leading-none text-slate-500 hover:text-slate-800">×</Link>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

function ErrorLine({ state }: { state: AccountFormState }) {
  return state.error ? <p role="alert" className="rounded-lg bg-red-50 p-2.5 text-sm text-red-800">{state.error}</p> : null;
}

function Pending() {
  return (
    <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
      Your facility account is created and <strong>waiting for RioMed approval</strong>. Once it&apos;s approved, type &quot;access clinic dashboard&quot; to open your facility desk.
    </p>
  );
}

export function SignUpDialog({ type, facilities }: { type: "patient" | "facility"; facilities: Array<{ id: string; name: string; area: string }> }) {
  const [state, action, busy] = useActionState(signUpAction, {});
  if (state.pending) return <Shell title="Almost there"><Pending /></Shell>;
  return (
    <Shell title={type === "facility" ? "Create a facility account" : "Create your account"}>
      <form action={action} className="space-y-3">
        <input type="hidden" name="type" value={type} />
        <ErrorLine state={state} />
        <label className="block text-sm">{type === "facility" ? "Your name (staff member)" : "Your name"}
          <input name="displayName" required minLength={2} maxLength={60} autoComplete="name" className={input} />
        </label>
        {type === "facility" && (
          <label className="block text-sm">Facility
            <select name="facilityId" required defaultValue="" className={input}>
              <option value="" disabled>Choose your facility</option>
              {facilities.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.area})</option>)}
            </select>
          </label>
        )}
        <label className="block text-sm">Username
          <input name="username" required pattern="[A-Za-z0-9_.]{3,30}" autoComplete="username" autoCapitalize="none" className={input} />
        </label>
        <label className="block text-sm">Password <span className="text-slate-500">(8+ characters)</span>
          <input name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" className={input} />
        </label>
        <label className="block text-sm">PIN <span className="text-slate-500">(4–6 digits, for quick unlock on this phone)</span>
          <input name="pin" type="password" inputMode="numeric" pattern="\d{4,6}" required autoComplete="off" className={input} />
        </label>
        {type === "facility" && <p className="text-xs text-slate-600">Facility accounts are checked by RioMed before they can see any bookings.</p>}
        <button disabled={busy} className={button}>{busy ? "Creating…" : "Create account"}</button>
        <p className="text-center text-sm">Already have an account? <Link className="underline" href="/account?mode=access">Sign in</Link></p>
      </form>
    </Shell>
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
        <p className="text-sm text-slate-600">Unlocking <strong>{who}</strong> on this device.</p>
        <ErrorLine state={state} />
        <input name="pin" type="password" inputMode="numeric" pattern="\d{4,6}" required autoFocus autoComplete="off" aria-label="PIN"
          className="w-full rounded-xl border border-emerald-900/20 px-4 py-3 text-center text-2xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-emerald-600" />
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

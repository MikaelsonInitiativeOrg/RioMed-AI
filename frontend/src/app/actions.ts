"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { BookingError, cancelByPatient, checkIn, holdSlot, uploadResult } from "@riomed/backend/server/booking";
import { promptBook } from "@riomed/backend/server/promptBook";
import { completePayment, startPayment } from "@riomed/backend/server/payments";
import { clearSession, forgetDevice, getDeviceUserId, getSessionUser, rememberDevice, setSessionUser } from "@/lib/session";
import { decideFacilityAccount, loginWithPassword, signUp, unlockWithPin, type AccountResult } from "@riomed/backend/server/accounts";

function safeNext(next: FormDataEntryValue | null): string {
  const n = typeof next === "string" ? next : "/";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/";
}

export async function signOutAction() {
  await clearSession();
  redirect("/");
}

export async function holdAction(formData: FormData) {
  const actor = await getSessionUser();
  const slotId = String(formData.get("slotId") ?? "");
  const testCode = String(formData.get("testCode") ?? "");
  const back = safeNext(formData.get("back"));
  if (!actor) redirect(`/account?mode=access&next=${encodeURIComponent(back)}`);
  let id: string;
  try {
    id = (await holdSlot(actor, { slotId, testCode })).id;
  } catch (e) {
    const msg = e instanceof BookingError ? e.message : "Something went wrong. Please try again.";
    redirect(`${back}${back.includes("?") ? "&" : "?"}error=${encodeURIComponent(msg)}`);
  }
  redirect(`/appointments/${id}`);
}

/** Book from a prompt that names a clinic. Anonymous users sign in first, then retry. */
export async function promptBookAction(formData: FormData) {
  const actor = await getSessionUser();
  const q = String(formData.get("q") ?? "");
  const slotId = String(formData.get("slotId") ?? "") || undefined;
  const back = `/?q=${encodeURIComponent(q)}`;
  if (!actor) redirect(`/account?mode=access&next=${encodeURIComponent(back)}`);
  let id: string;
  try {
    id = (await promptBook(actor, q, slotId)).appointmentId;
  } catch (e) {
    const msg = e instanceof BookingError ? e.message : "Something went wrong. Please try again.";
    redirect(`${back}&error=${encodeURIComponent(msg)}`);
  }
  redirect(`/appointments/${id}`);
}

export async function payAction(formData: FormData) {
  const actor = await getSessionUser();
  const id = String(formData.get("appointmentId") ?? "");
  let url: string;
  try {
    url = await startPayment(actor, id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Payment could not start.";
    redirect(`/appointments/${id}?error=${encodeURIComponent(msg)}`);
  }
  redirect(url);
}

export async function simulatedPayAction(formData: FormData) {
  const reference = String(formData.get("reference") ?? "");
  const r = await completePayment(reference, { simulated: true });
  if (!r.ok || !("appointmentId" in r)) redirect("/dashboard?payment=failed");
  redirect(`/appointments/${r.appointmentId}`);
}

export async function cancelAction(formData: FormData) {
  const actor = await getSessionUser();
  const id = String(formData.get("appointmentId") ?? "");
  try {
    await cancelByPatient(actor, id);
  } catch (e) {
    redirect(`/appointments/${id}?error=${encodeURIComponent(e instanceof Error ? e.message : "Could not cancel")}`);
  }
  redirect(`/appointments/${id}`);
}

export async function checkInAction(formData: FormData) {
  const actor = await getSessionUser();
  const id = String(formData.get("appointmentId") ?? "");
  try {
    await checkIn(actor, id);
  } catch (e) {
    redirect(`/staff?error=${encodeURIComponent(e instanceof Error ? e.message : "Check-in failed")}`);
  }
  revalidatePath("/staff");
  redirect("/staff");
}

export async function uploadResultAction(formData: FormData) {
  const actor = await getSessionUser();
  const id = String(formData.get("appointmentId") ?? "");
  const file = formData.get("file");
  if (!(file instanceof File)) redirect(`/staff?error=${encodeURIComponent("Choose a PDF file")}`);
  try {
    await uploadResult(actor, id, { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) });
  } catch (e) {
    redirect(`/staff?error=${encodeURIComponent(e instanceof Error ? e.message : "Upload failed")}`);
  }
  redirect("/staff?uploaded=1");
}

// ---- Real accounts (username + password + PIN) ----

export interface AccountFormState {
  error?: string;
  pending?: boolean;
}

function homeFor(role: string): string {
  return role === "patient" ? "/dashboard" : role === "operator" ? "/operator" : "/staff";
}

async function finishSignIn(r: AccountResult, next: string): Promise<AccountFormState> {
  if (!r.ok) return { error: r.error };
  await setSessionUser(r.userId);
  await rememberDevice(r.userId);
  if (r.status === "pending") return { pending: true };
  redirect(next !== "/" ? next : homeFor(r.role));
}

export async function signUpAction(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const type = formData.get("type") === "facility" ? "facility" : "patient";
  const r = await signUp({
    username: formData.get("username"),
    password: formData.get("password"),
    pin: formData.get("pin"),
    displayName: formData.get("displayName"),
    type,
    facilityId: formData.get("facilityId"),
  });
  return finishSignIn(r, "/");
}

export async function passwordLoginAction(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const r = await loginWithPassword(formData.get("username"), formData.get("password"));
  return finishSignIn(r, safeNext(formData.get("next")));
}

export async function pinUnlockAction(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const deviceUser = await getDeviceUserId();
  if (!deviceUser) return { error: "Sign in with your username and password." };
  const r = await unlockWithPin(deviceUser, formData.get("pin"));
  if (!r.ok && r.forgetDevice) await forgetDevice();
  return finishSignIn(r, safeNext(formData.get("next")));
}

export async function forgetDeviceAction() {
  await forgetDevice();
  await clearSession();
  redirect("/account?mode=access");
}

export async function decideAccountAction(formData: FormData) {
  const actor = await getSessionUser();
  await decideFacilityAccount(actor, String(formData.get("userId") ?? ""), formData.get("decision") === "approve");
  revalidatePath("/operator");
  redirect("/operator");
}

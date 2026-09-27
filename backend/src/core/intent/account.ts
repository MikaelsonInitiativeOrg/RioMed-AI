import { findPhrases, normalize } from "../text";

/**
 * Account requests typed into the search box ("create an account", "access my dashboard").
 * Detected by fixed rules BEFORE any AI call, so account flows never depend on the model and
 * credentials never reach it. The UI then opens the sign-up or unlock dialog.
 */

export type AccountAction = "create" | "access";
export type AccountType = "patient" | "facility";
export interface AccountIntent {
  action: AccountAction;
  type: AccountType;
}

const CREATE = [
  "create an account", "create account", "create my account", "sign up", "signup", "register",
  "open an account", "open account", "new account", "make an account", "join riomed",
].map((phrase) => ({ phrase, value: "create" as const }));

const ACCESS = [
  "access dashboard", "access my dashboard", "open dashboard", "open my dashboard", "my dashboard",
  "dashboard", "log in", "login", "sign in", "signin", "my account", "my bookings", "my results",
  "facility desk",
].map((phrase) => ({ phrase, value: "access" as const }));

const FACILITY = ["clinic", "facility", "hospital", "lab", "laboratory", "diagnostic", "centre", "center", "staff", "phc"].map((phrase) => ({
  phrase,
  value: true,
}));

// Words that mean the user is looking for care, not managing an account.
const SEARCH_WORDS = ["test", "near", "around", "book", "appointment", "find", "where"].map((phrase) => ({ phrase, value: true }));

export function detectAccountIntent(text: string): AccountIntent | null {
  if (typeof text !== "string") return null;
  const t = normalize(text);
  if (!t || t.length > 200) return null;
  const create = findPhrases(t, CREATE).length > 0;
  const access = findPhrases(t, ACCESS).length > 0;
  if (!create && !access) return null;
  // "register for a malaria test near Yaba" is a search, not an account request.
  if (findPhrases(t, SEARCH_WORDS).length > 0) return null;
  const type: AccountType = findPhrases(t, FACILITY).length > 0 ? "facility" : "patient";
  return { action: create ? "create" : "access", type };
}

/**
 * True when the text looks like it contains a password or PIN, for example "my password is
 * abc123", "pin: 4821", or a bare 4–6 digit number. Such text must never be searched, logged or
 * sent to the AI.
 */
export function looksLikeCredential(text: string): boolean {
  if (typeof text !== "string") return false;
  const t = normalize(text);
  if (/^\d{4,6}$/.test(t)) return true;
  if (/\b(forgot|reset|change|forget)\b/.test(t)) return false;
  // "password is x", "pin: x", "pin = x", or a keyword followed by something with a digit.
  return /\b(password|passcode|passwd|pin)\b\s*(is|:|=|na)\s*\S{3,}/.test(t) || /\b(password|passcode|passwd|pin)\b\s*\S*\d\S*/.test(t);
}

/** "near me", "nearby", "close to me", "around me", "wey dey near me": the user wants their own location used. */
export function wantsNearMe(text: string): boolean {
  if (typeof text !== "string") return false;
  return /\b(near me|nearby|near by|close to me|closest to me|around me|near my (house|home|place|area|location)|my location|where i am)\b/.test(normalize(text));
}

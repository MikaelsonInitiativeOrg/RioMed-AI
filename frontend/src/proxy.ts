import { NextResponse, type NextRequest } from "next/server";
import { detectAccountIntent, looksLikeCredential } from "@riomed/backend/core/intent";

/**
 * Account requests typed into search ("create an account", "access dashboard") open the account
 * dialog instead of running a search. Text that looks like a password or PIN is never searched or
 * sent to the AI: the user is warned instead. Fixed rules only; no AI involved.
 */
export function proxy(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.search = "";
  url.pathname = "/account";
  if (looksLikeCredential(q)) {
    url.searchParams.set("mode", "warning");
    return NextResponse.redirect(url);
  }
  const intent = detectAccountIntent(q);
  if (!intent) return NextResponse.next();
  url.searchParams.set("mode", intent.action === "create" ? "signup" : "access");
  url.searchParams.set("type", intent.type);
  return NextResponse.redirect(url);
}

export const config = { matcher: "/" };

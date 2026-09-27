import { NextResponse } from "next/server";
import { completePayment } from "@riomed/backend/server/payments";

export const dynamic = "force-dynamic";

/** Paystack redirect. We still verify server-side; the redirect alone never confirms (FR-053). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference") ?? url.searchParams.get("trxref") ?? "";
  const r = await completePayment(reference).catch(() => ({ ok: false as const, reason: "error", appointmentId: undefined }));
  const target = "appointmentId" in r && r.appointmentId ? `/appointments/${r.appointmentId}` : "/dashboard";
  return NextResponse.redirect(new URL(target + (r.ok ? "" : "?payment=failed"), url));
}

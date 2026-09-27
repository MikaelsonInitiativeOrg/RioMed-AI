import { verifyResultLink } from "@riomed/backend/server/auth";
import { getResultFileForActor } from "@riomed/backend/server/queries";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** FR-063: short-lived signed link AND a permission check for the current user; every view is audited (FR-064). */
export async function GET(request: Request, ctx: RouteContext<"/api/results/[id]">) {
  const { id } = await ctx.params;
  const url = new URL(request.url);
  const exp = Number(url.searchParams.get("exp"));
  const sig = url.searchParams.get("sig") ?? "";
  if (!verifyResultLink(id, exp, sig)) {
    return new Response("Link expired or invalid", { status: 403 });
  }
  const actor = await getSessionUser();
  const result = await getResultFileForActor(actor, id);
  if (!result) return new Response("Not found", { status: 404 });
  return new Response(result.content, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${result.fileName}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

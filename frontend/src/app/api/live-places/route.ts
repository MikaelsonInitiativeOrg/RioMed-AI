import { resolveLocation } from "@riomed/backend/core/geo";
import { findLivePlaces } from "@riomed/backend/server/livePlaces";

export const dynamic = "force-dynamic";

// Per-IP limit to protect the free-tier quota (demo: in-memory, per server instance).
const hits = new Map<string, number[]>();
const LIMIT = 15;
const WINDOW_MS = 10 * 60_000;

function allowed(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) return false;
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

/** GET /api/live-places?address=… → { status, places[{ placeId, name, mapsUrl }], reason? } */
export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get("address") ?? "";
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allowed(ip)) return Response.json({ status: "unavailable", places: [], reason: "Too many live searches, try again in a few minutes" }, { status: 429 });
  const origin = resolveLocation(address); // bias toward a known area when we have one; never guessed
  const result = await findLivePlaces({ address, origin });
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}

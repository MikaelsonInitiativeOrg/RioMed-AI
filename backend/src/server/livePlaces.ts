import "server-only";
import { nearestPlace, type LatLng } from "../core/geo";

/**
 * FR-027 (added 2026-09-27): live nearby health facilities from Google Maps, via Gemini's
 * "Grounding with Google Maps" tool (Interactions API).
 *
 * Only places returned in the structured `google_maps_result` step are shown. The model's
 * prose is never displayed, so it cannot invent a facility (AI-011). Live places are
 * unverified and not bookable, and must be shown with Google Maps attribution.
 */

export interface LivePlace {
  placeId: string;
  name: string;
  mapsUrl: string;
}

export type LivePlacesResult =
  | { status: "ok"; places: LivePlace[]; latencyMs: number; cached: boolean }
  | { status: "disabled" | "unavailable"; places: []; reason: string };

const CACHE_MS = 10 * 60_000;
const MAX_PLACES = 10;
const cache = new Map<string, { at: number; places: LivePlace[] }>();

export function livePlacesEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return (env.AI_PROVIDER ?? "").toLowerCase() === "gemini" && !!env.AI_API_KEY && (env.LIVE_PLACES ?? "on") !== "off";
}

/** Clean user-supplied location text before it goes into the model input. */
export function sanitizeAddress(raw: string): string | null {
  const s = String(raw).replace(/[\u0000-\u001f\u007f<>{}`"\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
  return s.length >= 2 ? s : null;
}

function isMapsUrl(u: unknown): u is string {
  if (typeof u !== "string") return false;
  try {
    const url = new URL(u);
    return url.protocol === "https:" && (url.hostname === "maps.google.com" || url.hostname === "www.google.com" || url.hostname === "google.com");
  } catch {
    return false;
  }
}

interface Step {
  type?: string;
  result?: Array<{ places?: Array<{ place_id?: unknown; name?: unknown; url?: unknown }> }>;
  content?: Array<{ annotations?: Array<{ type?: string; place_id?: unknown }> }>;
}

/** Extract places from an Interactions API response. Pure; exported for tests. Never throws. */
export function extractPlaces(json: unknown): LivePlace[] {
  try {
    return extractPlacesUnsafe(json);
  } catch {
    return [];
  }
}

function extractPlacesUnsafe(json: unknown): LivePlace[] {
  const steps: Step[] = Array.isArray((json as { steps?: unknown })?.steps) ? (json as { steps: Step[] }).steps : [];
  const found = new Map<string, LivePlace>();
  for (const s of steps) {
    if (s?.type !== "google_maps_result" || !Array.isArray(s.result)) continue;
    for (const r of s.result) {
      for (const p of Array.isArray(r?.places) ? r.places : []) {
        if (typeof p?.place_id !== "string" || typeof p?.name !== "string" || !isMapsUrl(p.url)) continue;
        if (!found.has(p.place_id)) {
          found.set(p.place_id, { placeId: p.place_id, name: p.name.replace(/\s*-\s*Google Maps$/i, "").trim().slice(0, 120), mapsUrl: p.url });
        }
      }
    }
  }
  // Prefer places the model actually cited (its relevance pick), in citation order.
  const cited: string[] = [];
  for (const s of steps) {
    if (s?.type !== "model_output") continue;
    for (const c of s.content ?? []) {
      for (const a of c.annotations ?? []) {
        if (a?.type === "place_citation" && typeof a.place_id === "string" && found.has(a.place_id) && !cited.includes(a.place_id)) cited.push(a.place_id);
      }
    }
  }
  const ordered = cited.length > 0 ? cited.map((id) => found.get(id)!) : [...found.values()];
  return ordered.slice(0, MAX_PLACES);
}

export async function findLivePlaces(
  input: { address: string; origin?: LatLng | null },
  opts: { env?: Record<string, string | undefined>; fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<LivePlacesResult> {
  const env = opts.env ?? process.env;
  if (!livePlacesEnabled(env)) return { status: "disabled", places: [], reason: "Live search needs AI_PROVIDER=gemini and a key" };
  // With a shared device location and no typed address: name the nearest known area (fast, reliable),
  // else search by coordinates alone (slower, works anywhere). The coordinates still bias the tool.
  const typed = sanitizeAddress(input.address);
  const near = !typed && input.origin ? nearestPlace(input.origin) : null;
  const address = typed ?? (near ? `${near.name}, Lagos` : input.origin ? "the user's current location" : null);
  if (!address) return { status: "unavailable", places: [], reason: "No address" };

  const key = `${address.toLowerCase()}|${input.origin ? `${input.origin.lat.toFixed(3)},${input.origin.lng.toFixed(3)}` : ""}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return { status: "ok", places: hit.places, latencyMs: 0, cached: true };

  const started = Date.now();
  const model = env.LIVE_PLACES_MODEL || env.AI_MODEL || "gemini-3.5-flash-lite";
  const tool: Record<string, unknown> = { type: "google_maps" };
  if (input.origin) Object.assign(tool, { latitude: input.origin.lat, longitude: input.origin.lng });
  try {
    const res = await (opts.fetchImpl ?? fetch)("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.AI_API_KEY! },
      body: JSON.stringify({
        model,
        input: input.origin && !typed && !near
          ? // Device location: search around the exact coordinates, wherever they are.
            `List up to 8 hospitals, clinics, diagnostic laboratories and primary health centres closest to latitude ${input.origin.lat}, longitude ${input.origin.lng}. Only medical facilities, nearest first.`
          : `List up to 8 hospitals, clinics, diagnostic laboratories and primary health centres near this location: ${address}. Only medical facilities, nearest first.`,
        tools: [tool],
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 25_000), // loads in the background; Maps grounding takes 5–10 s
    });
    if (!res.ok) return { status: "unavailable", places: [], reason: res.status === 429 ? "Live search quota reached, try again later" : `Live search error ${res.status}` };
    const places = extractPlaces(await res.json());
    cache.set(key, { at: Date.now(), places });
    if (cache.size > 500) cache.delete(cache.keys().next().value!);
    return { status: "ok", places, latencyMs: Date.now() - started, cached: false };
  } catch (e) {
    return { status: "unavailable", places: [], reason: e instanceof Error && e.name === "TimeoutError" ? "Live search timed out" : "Live search unavailable" };
  }
}

import "server-only";
import { resolveLocation, type Place } from "../core/geo";
import { sanitizeAddress } from "./livePlaces";

/**
 * Universal location (added 2026-09-27, product owner request): places outside the built-in
 * Lagos list are looked up on OpenStreetMap (Nominatim), so search works in any city or country.
 * Only the typed place text is sent. Never the user's name, account or device location.
 * Returns null when nothing is found or the lookup is slow: the app never guesses a place.
 */

const CACHE_MS = 24 * 60 * 60_000;
const cache = new Map<string, { at: number; place: Place | null }>();

export function geocoderEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return (env.GEOCODER ?? "on") !== "off";
}

export async function geocodePlace(
  text: string | null | undefined,
  opts: { env?: Record<string, string | undefined>; fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<Place | null> {
  const known = resolveLocation(text);
  if (known) return known;
  const q = typeof text === "string" ? sanitizeAddress(text) : null;
  if (!q || !geocoderEnabled(opts.env ?? process.env)) return null;

  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.place;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=0&q=${encodeURIComponent(q)}`;
    const res = await (opts.fetchImpl ?? fetch)(url, {
      headers: { "User-Agent": "RioMed-AI/0.1 (hackathon demo; https://riomed-ai.vercel.app)", "Accept-Language": "en" },
      signal: AbortSignal.timeout(opts.timeoutMs ?? 3000),
    });
    if (!res.ok) return null; // not cached: may be a temporary error
    const rows = (await res.json()) as Array<{ lat?: string; lon?: string; name?: string; display_name?: string; addresstype?: string }>;
    const r = Array.isArray(rows) ? rows[0] : undefined;
    const lat = Number(r?.lat);
    const lng = Number(r?.lon);
    const place: Place | null =
      r && Number.isFinite(lat) && Number.isFinite(lng)
        ? { name: (r.name || q).slice(0, 80), kind: r.addresstype === "state" || r.addresstype === "country" ? "state" : "area", lat, lng }
        : null;
    cache.set(key, { at: Date.now(), place });
    if (cache.size > 1000) cache.delete(cache.keys().next().value!);
    return place;
  } catch {
    return null;
  }
}

/**
 * A facility's street address: try it in full, then drop the leading parts ("12 Aminu Kano
 * Crescent, Wuse 2, Abuja" -> "Wuse 2, Abuja" -> "Abuja"). At most 3 lookups, 1 s apart (Nominatim limit).
 */
export async function geocodeAddress(address: string, opts: Parameters<typeof geocodePlace>[1] & { pauseMs?: number } = {}): Promise<Place | null> {
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  const tries = [...new Set(parts.map((_, i) => parts.slice(i).join(", ")))].slice(0, 3);
  for (let i = 0; i < tries.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, opts.pauseMs ?? 1000));
    const hit = await geocodePlace(tries[i], opts);
    if (hit) return hit;
  }
  return null;
}

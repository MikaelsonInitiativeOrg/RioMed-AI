import { haversineKm, type LatLng } from "./geo";

export interface FacilityCandidate {
  id: string;
  name: string;
  lat: number;
  lng: number;
  operational: boolean;
  isPartner: boolean;
  offeredTests: string[];
  hasSlotInWindow: boolean;
}

export interface RankedFacility extends FacilityCandidate {
  distanceKm: number;
  offersTests: boolean;
  score: number;
}

export interface SearchResult {
  results: RankedFacility[];
  radiusKm: number;
  widened: boolean;
}

export const RADII_KM: readonly number[] = [10, 20, 35, 50];

// Penalties expressed in "equivalent km", so ranking stays monotonic in distance (FR-020).
const PENALTY_NOT_OFFERED = 8;
const PENALTY_NO_SLOT = 4;
const PENALTY_NOT_PARTNER = 3;

export function searchFacilities(
  candidates: FacilityCandidate[],
  query: { origin: LatLng; testCodes: string[] },
  opts: { minResults?: number } = {},
): SearchResult {
  const minResults = opts.minResults ?? 3;
  const wanted = query.testCodes ?? [];
  const ranked: RankedFacility[] = candidates
    .filter((c) => c.operational)
    .map((c) => {
      const distanceKm = haversineKm(query.origin, c);
      const offersTests = wanted.every((t) => c.offeredTests.includes(t));
      const score =
        distanceKm +
        (wanted.length > 0 && !offersTests ? PENALTY_NOT_OFFERED : 0) +
        (!c.hasSlotInWindow ? PENALTY_NO_SLOT : 0) +
        (!c.isPartner ? PENALTY_NOT_PARTNER : 0);
      return { ...c, distanceKm, offersTests, score };
    });

  let radiusKm = RADII_KM[0];
  let within: RankedFacility[] = [];
  for (const r of RADII_KM) {
    radiusKm = r;
    within = ranked.filter((c) => c.distanceKm <= r);
    if (within.length >= minResults) break;
  }

  within.sort((a, b) => a.score - b.score || a.distanceKm - b.distanceKm || a.name.localeCompare(b.name));
  return { results: within, radiusKm, widened: radiusKm > RADII_KM[0] };
}

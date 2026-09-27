import { findPhrases } from "./text";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Place extends LatLng {
  name: string;
  kind: "area" | "lga" | "state";
}

const EARTH_RADIUS_KM = 6371;

export function haversineKm(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Approximate centroids for the Lagos pilot area. Demo gazetteer, not survey data.
export const PLACES: readonly Place[] = [
  { name: "Ikeja", kind: "lga", lat: 6.6018, lng: 3.3515 },
  { name: "GRA Ikeja", kind: "area", lat: 6.5833, lng: 3.3617 },
  { name: "Alausa", kind: "area", lat: 6.6167, lng: 3.3583 },
  { name: "Opebi", kind: "area", lat: 6.5928, lng: 3.3606 },
  { name: "Allen", kind: "area", lat: 6.6003, lng: 3.3561 },
  { name: "Maryland", kind: "area", lat: 6.5707, lng: 3.3665 },
  { name: "Ogba", kind: "area", lat: 6.6256, lng: 3.3399 },
  { name: "Agege", kind: "lga", lat: 6.6180, lng: 3.3209 },
  { name: "Oshodi", kind: "lga", lat: 6.5550, lng: 3.3436 },
  { name: "Yaba", kind: "area", lat: 6.5095, lng: 3.3711 },
  { name: "Akoka", kind: "area", lat: 6.5196, lng: 3.3903 },
  { name: "Ebute Metta", kind: "area", lat: 6.4850, lng: 3.3800 },
  { name: "Surulere", kind: "lga", lat: 6.5000, lng: 3.3500 },
  { name: "Mushin", kind: "lga", lat: 6.5273, lng: 3.3414 },
  { name: "Ilupeju", kind: "area", lat: 6.5536, lng: 3.3572 },
  { name: "Gbagada", kind: "area", lat: 6.5544, lng: 3.3886 },
  { name: "Ketu", kind: "area", lat: 6.5967, lng: 3.3889 },
  { name: "Ojota", kind: "area", lat: 6.5851, lng: 3.3801 },
  { name: "Magodo", kind: "area", lat: 6.6150, lng: 3.3900 },
  { name: "Lekki", kind: "area", lat: 6.4474, lng: 3.4723 },
  { name: "Ajah", kind: "area", lat: 6.4698, lng: 3.5852 },
  { name: "Victoria Island", kind: "area", lat: 6.4281, lng: 3.4219 },
  { name: "Ikoyi", kind: "area", lat: 6.4549, lng: 3.4346 },
  { name: "Lagos Island", kind: "lga", lat: 6.4541, lng: 3.3947 },
  { name: "Obalende", kind: "area", lat: 6.4474, lng: 3.4030 },
  { name: "Festac", kind: "area", lat: 6.4667, lng: 3.2833 },
  { name: "Lagos", kind: "state", lat: 6.5244, lng: 3.3792 },
];

const ALIASES: Array<{ phrase: string; value: Place }> = [
  ...PLACES.map((p) => ({ phrase: p.name, value: p })),
  { phrase: "vi", value: PLACES.find((p) => p.name === "Victoria Island")! },
  { phrase: "ikeja gra", value: PLACES.find((p) => p.name === "GRA Ikeja")! },
  { phrase: "festac town", value: PLACES.find((p) => p.name === "Festac")! },
  { phrase: "ebute-metta", value: PLACES.find((p) => p.name === "Ebute Metta")! },
];

/** Longest whole-word place match in the query. Never guesses. */
export function resolveLocation(query: string | null | undefined): Place | null {
  if (typeof query !== "string" || !query.trim()) return null;
  const hits = findPhrases(query, ALIASES);
  if (hits.length === 0) return null;
  // Prefer the most specific (longest phrase); "Lagos" (state) only if nothing else matched.
  const best = [...hits].sort((a, b) => {
    const stateA = a.value.kind === "state" ? 1 : 0;
    const stateB = b.value.kind === "state" ? 1 : 0;
    return stateA - stateB || b.phrase.length - a.phrase.length || a.index - b.index;
  })[0];
  return best.value;
}

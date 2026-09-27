import { findPhrases } from "../text";

/**
 * Deterministic red-flag list (AI-020). DRAFT, pending clinician review. Do not launch
 * with real users until it has been signed off.
 */
export const RED_FLAG_STATUS = "draft-pending-clinician-review" as const;

const RED_FLAGS: Array<{ phrase: string; value: string }> = [
  ["chest pain", "chest pain"],
  ["pain in my chest", "chest pain"],
  ["difficulty breathing", "difficulty breathing"],
  ["trouble breathing", "difficulty breathing"],
  ["can't breathe", "can't breathe"],
  ["cant breathe", "can't breathe"],
  ["cannot breathe", "cannot breathe"],
  ["shortness of breath", "shortness of breath"],
  ["not breathing", "not breathing"],
  ["heavy bleeding", "heavy bleeding"],
  ["bleeding heavily", "bleeding heavily"],
  ["bleeding a lot", "heavy bleeding"],
  ["unconscious", "unconscious"],
  ["collapsed", "unconscious"],
  ["seizure", "seizure"],
  ["seizures", "seizure"],
  ["convulsion", "convulsion"],
  ["convulsions", "convulsion"],
  ["convulsing", "convulsion"],
  ["convulse", "convulse"],
  ["convulsed", "convulsed"],
  ["unresponsive", "unresponsive"],
  ["fitting", "fitting"],
  ["stroke", "stroke"],
  ["slurred speech", "slurred speech"],
  ["face drooping", "stroke"],
  ["suicide", "suicide"],
  ["suicidal", "suicide"],
  ["kill myself", "kill myself"],
  ["end my life", "end my life"],
  ["overdose", "overdose"],
  ["poisoning", "poisoning"],
  ["poisoned", "poisoning"],
  ["snake bite", "snake bite"],
  ["snakebite", "snake bite"],
  ["bitten by a snake", "snake bite"],
  ["severe burn", "severe burn"],
  ["severe burns", "severe burn"],
].map(([phrase, value]) => ({ phrase, value }));

export interface EmergencyCheck {
  isEmergency: boolean;
  matched: string[];
}

export function detectEmergency(text: string): EmergencyCheck {
  if (typeof text !== "string") throw new TypeError("text must be a string");
  const matched = [...new Set(findPhrases(text, RED_FLAGS).map((h) => h.value))];
  return { isEmergency: matched.length > 0, matched };
}

/** AI-021: if detection fails for any reason, show the emergency guidance. */
export function detectEmergencySafe(
  text: string,
  detector: (t: string) => EmergencyCheck = detectEmergency,
): EmergencyCheck {
  try {
    const r = detector(text);
    if (!r || typeof r.isEmergency !== "boolean" || !Array.isArray(r.matched)) {
      return { isEmergency: true, matched: ["detector-error"] };
    }
    return r;
  } catch {
    return { isEmergency: true, matched: ["detector-error"] };
  }
}

import type { TestCode } from "./catalog";
import { findPhrases } from "./text";
import { detectEmergencySafe } from "./intent/emergency";

/**
 * Symptom help (added 2026-09-27, product owner request). When someone describes how they feel
 * instead of naming a test, show the tests that are OFTEN REQUESTED for those symptoms, as options
 * they choose. Rules:
 * - A fixed, reviewable list, never the AI. It is a DRAFT pending clinician review, like the
 *   emergency list (AI-020), and the UI says so.
 * - Suggestions are never added to the search by themselves (FR-017 still holds for the intent):
 *   the person taps one, and the page says only a clinician can decide what they need.
 * - Emergencies win: if the red-flag rules match, no suggestions are shown.
 */

export const SYMPTOM_LIST_STATUS = "draft, pending clinician review" as const;

interface SymptomGroup {
  label: string;
  phrases: string[];
  tests: TestCode[];
}

const GROUPS: SymptomGroup[] = [
  {
    label: "fever",
    phrases: ["fever", "feverish", "body hot", "hot body", "my body is hot", "body dey hot", "my body dey hot", "high temperature",
      // Yoruba: ibà, ara mi gbóná / ara mi ń gbóná; Igbo: ịba, ahụ na-ekpo m ọkụ
      "iba", "ara mi gbona", "ara gbona", "ara mi n gbona", "ahu na-ekpo m oku", "ahu m na-ekpo oku", "na-ekpo oku", "temperature", "chills", "shivering", "malaria symptoms", "cold and catarrh with fever"],
    tests: ["MALARIA_MP", "WIDAL", "FBC"],
  },
  {
    label: "tiredness or weakness",
    phrases: ["weak", "weakness", "tired", "tiredness", "fatigue", "no strength", "body weak", "body dey weak", "i no get strength", "body no strong",
      // Yoruba: ara mi kò le, àìlera, ó rẹ̀ mí; Igbo: ike gwụrụ m, adịghị m ike
      "ara mi o le", "ara mi ko le", "ailera", "o re mi", "ike gwuru m", "adighi m ike", "dizzy", "dizziness", "pale"],
    tests: ["PCV", "FBC", "FBS"],
  },
  {
    label: "urinary symptoms",
    phrases: ["burning urine", "pain when urinating", "painful urination", "frequent urination", "urinating often", "i dey piss well well", "peeing often", "smelly urine", "always thirsty"],
    tests: ["URINALYSIS", "FBS"],
  },
  {
    label: "yellow eyes or skin",
    phrases: ["yellow eyes", "yellow eye", "eyes are yellow", "yellow skin", "jaundice"],
    tests: ["LFT", "HBSAG", "HCV"],
  },
  {
    label: "a possible pregnancy",
    phrases: ["missed period", "missed my period", "late period", "might be pregnant", "am i pregnant", "i think i'm pregnant", "i think im pregnant"],
    tests: ["PREGNANCY"],
  },
  {
    label: "a lasting cough",
    phrases: ["cough for weeks", "coughing for weeks", "persistent cough", "cough that won't go", "long cough"],
    tests: ["XRAY_CHEST", "FBC"],
  },
];

const PHRASES = GROUPS.flatMap((g, i) => g.phrases.map((phrase) => ({ phrase, value: i })));

export interface SymptomHelp {
  matched: string[];
  tests: TestCode[];
}

/** Tests often requested for the symptoms described; empty for emergencies or when nothing matches. */
export function suggestTestsForSymptoms(text: string): SymptomHelp {
  const input = typeof text === "string" ? text.slice(0, 2000) : "";
  if (!input.trim() || detectEmergencySafe(input).isEmergency) return { matched: [], tests: [] };
  const hits = [...new Set(findPhrases(input, PHRASES).map((h) => h.value))].sort((a, b) => a - b);
  const tests = [...new Set(hits.flatMap((i) => GROUPS[i].tests))].slice(0, 5);
  return { matched: hits.map((i) => GROUPS[i].label), tests };
}

import { describe, expect, it } from "vitest";
import { parseDeterministic } from "../../src/core/intent";
import { suggestTestsForSymptoms } from "../../src/core/symptoms";
import { detectEmergencySafe } from "../../src/core/intent";
import { normalize } from "../../src/core/text";

// Offline fallback parser: must understand Yoruba, Igbo and Pidgin when the AI is slow or down.
const CASES: Array<[string, string, Partial<{ tests: string[]; place: string | null; day: string | null; part: string; type: string | null }>]> = [
  ["yoruba, tone marks", "Mo fẹ́ ṣe àyẹ̀wò ibà ní Yaba lọ́la àárọ̀", { tests: ["MALARIA_MP"], place: "Yaba", day: "tomorrow", part: "morning" }],
  ["yoruba, no tone marks", "mo fe se ayewo iba ni Yaba lola aaro", { tests: ["MALARIA_MP"], place: "Yaba", day: "tomorrow", part: "morning" }],
  ["yoruba pregnancy today", "àyẹ̀wò oyún ní Ikeja lónìí", { tests: ["PREGNANCY"], place: "Ikeja", day: "today" }],
  ["yoruba hospital near", "ilé ìwòsàn nítòsí Surulere", { tests: [], place: "Surulere", type: "hospital" }],
  ["igbo malaria tomorrow morning", "Achọrọ m ime nnwale ịba na Surulere echi ụtụtụ", { tests: ["MALARIA_MP"], place: "Surulere", day: "tomorrow", part: "morning" }],
  ["igbo hospital today", "ụlọ ọgwụ na Yaba taa", { tests: [], place: "Yaba", day: "today", type: "hospital" }],
  ["pidgin typhoid", "Abeg I wan do typhoid test for Yaba tomorrow", { tests: ["WIDAL"], place: "Yaba", day: "tomorrow" }],
  ["pidgin malaria", "I wan check malaria for Ikeja", { tests: ["MALARIA_MP"], place: "Ikeja" }],
  ["pidgin hospital", "hospital wey dey near Lekki", { tests: [], place: "Lekki", type: "hospital" }],
];

describe("Nigerian languages: offline parser", () => {
  for (const [name, text, want] of CASES) {
    it(name, () => {
      const r = parseDeterministic(text);
      if (want.tests) expect(r.tests).toEqual(want.tests);
      if (want.place !== undefined) expect(r.locationQuery).toBe(want.place);
      if (want.day !== undefined) expect(r.when?.day ?? null).toBe(want.day);
      if (want.part) expect(r.when?.part).toBe(want.part);
      if (want.type !== undefined) expect(r.facilityType).toBe(want.type);
    });
  }
  it("tone marks never change a match", () => {
    expect(normalize("Ìbà ní Ọ̀ṣọ́di")).toBe("iba ni osodi");
  });
});

describe("Nigerian languages: symptoms stay symptoms", () => {
  it("fever in Yoruba, Igbo and Pidgin gives symptom help but never a chosen test (FR-017)", () => {
    for (const q of ["ara mi gbóná gan", "ahụ na-ekpo m ọkụ", "my body dey hot"]) {
      expect(parseDeterministic(q).tests).toEqual([]);
      expect(suggestTestsForSymptoms(q).tests).toContain("MALARIA_MP");
    }
  });
  it("weakness in Yoruba, Igbo and Pidgin", () => {
    for (const q of ["ara mi ò le", "ike gwụrụ m", "I no get strength"]) expect(suggestTestsForSymptoms(q).matched).toContain("tiredness or weakness");
  });
  it("English emergencies still win with accents present", () => {
    expect(detectEmergencySafe("chest pain, I can't breathe, ara mi gbóná").isEmergency).toBe(true);
    expect(suggestTestsForSymptoms("chest pain, I can't breathe, ara mi gbóná").tests).toEqual([]);
  });
});

describe("Pidgin sugar check", () => {
  it("'check sugar level' names the fasting blood sugar test", () => {
    expect(parseDeterministic("I wan check sugar level for Ikeja this evening").tests).toEqual(["FBS"]);
  });
});

import { describe, it, expect } from "vitest";
import { isTestMentioned } from "@/core/intent";
import { TEST_CATALOG } from "@/core/catalog";

describe("isTestMentioned: contract examples", () => {
  const cases: [string, string, boolean][] = [
    ["I have fever and headache", "MALARIA_MP", false],
    ["I have fever and headache", "WIDAL", false],
    ["I missed my period", "PREGNANCY", false],
    ["abeg I wan do tyfoid test", "WIDAL", true],
    ["malria test", "MALARIA_MP", true],
    ["ful blood count", "FBC", true],
    ["I need E/U/Cr", "EUCR", true],
    ["LFT for my dad", "LFT", true],
  ];
  for (const [text, code, want] of cases) {
    it(`${JSON.stringify(text)} / ${code} -> ${want}`, () => {
      expect(isTestMentioned(code, text)).toBe(want);
    });
  }
});

describe("isTestMentioned: exact names and synonyms", () => {
  it("every catalogue synonym names its own test", () => {
    for (const t of TEST_CATALOG) {
      for (const s of t.synonyms) {
        expect(isTestMentioned(t.code, `I need ${s} please`), `${t.code} / ${s}`).toBe(true);
        expect(isTestMentioned(t.code, s.toUpperCase()), `${t.code} / ${s}`).toBe(true);
      }
    }
  });

  it("every catalogue name names its own test", () => {
    for (const t of TEST_CATALOG) {
      expect(isTestMentioned(t.code, `book ${t.name} tomorrow`), `${t.code} / ${t.name}`).toBe(true);
    }
  });

  it("E/U/Cr also matches with the punctuation removed", () => {
    expect(isTestMentioned("EUCR", "eucr please")).toBe(true);
    expect(isTestMentioned("EUCR", "e/u/cr")).toBe(true);
  });
});

describe("isTestMentioned: misspelling tolerance by word length", () => {
  it("6+ character words allow edit distance 2", () => {
    expect(isTestMentioned("MALARIA_MP", "mlria")).toBe(true); // malaria, distance 2
    expect(isTestMentioned("GENOTYPE", "genotipe")).toBe(true);
    expect(isTestMentioned("ULTRASOUND", "ultrasaund")).toBe(true);
    expect(isTestMentioned("LIPID", "kolesterol")).toBe(true); // cholesterol, distance 2
  });

  it("6+ character words reject edit distance 3", () => {
    expect(isTestMentioned("MALARIA_MP", "mlri")).toBe(false);
    expect(isTestMentioned("GENOTYPE", "jenotipi")).toBe(false);
  });

  it("4–5 character words allow edit distance 1 only", () => {
    expect(isTestMentioned("WIDAL", "wida")).toBe(true);
    expect(isTestMentioned("WIDAL", "widl")).toBe(true);
    expect(isTestMentioned("WIDAL", "wdl")).toBe(false);
    expect(isTestMentioned("COVID19", "kovid")).toBe(true);
    expect(isTestMentioned("COVID19", "kovit")).toBe(false);
  });

  it("3-character-or-shorter words must match exactly", () => {
    expect(isTestMentioned("HIV", "hiv")).toBe(true);
    expect(isTestMentioned("HIV", "hib")).toBe(false);
    expect(isTestMentioned("HIV", "hive")).toBe(false);
    expect(isTestMentioned("FBC", "fbs")).toBe(false);
    expect(isTestMentioned("FBS", "fbs")).toBe(true);
    expect(isTestMentioned("PCV", "pvc")).toBe(false);
    expect(isTestMentioned("MALARIA_MP", "np")).toBe(false);
    expect(isTestMentioned("MALARIA_MP", "mpp test")).toBe(false);
  });

  it("whole words only: a short synonym inside a longer word does not count", () => {
    expect(isTestMentioned("MALARIA_MP", "I felt an impulse")).toBe(false);
    expect(isTestMentioned("HIV", "hivemind")).toBe(false);
  });

  it("every word of a multi-word phrase must match", () => {
    expect(isTestMentioned("BLOOD_GROUP", "blood")).toBe(false);
    expect(isTestMentioned("BLOOD_GROUP", "blod group")).toBe(true); // "blood" 5 chars, distance 1
    expect(isTestMentioned("FBC", "full count")).toBe(false);
  });
});

describe("isTestMentioned: symptoms never name a test", () => {
  const symptoms = [
    "I have fever and headache",
    "my body dey hot and I dey vomit",
    "I feel weak and dizzy",
    "stomach pain since yesterday",
    "I missed my period",
  ];
  it("no catalogue test is named by symptom-only text", () => {
    for (const text of symptoms) {
      for (const t of TEST_CATALOG) {
        expect(isTestMentioned(t.code, text), `${t.code} / ${text}`).toBe(false);
      }
    }
  });
});

describe("isTestMentioned: edge cases", () => {
  it("false for unknown codes", () => {
    expect(isTestMentioned("NOT_A_CODE", "malaria")).toBe(false);
    expect(isTestMentioned("", "malaria")).toBe(false);
    expect(isTestMentioned("malaria", "malaria")).toBe(false);
    expect(isTestMentioned("__proto__", "malaria")).toBe(false);
  });

  it("false for non-string text, never throws", () => {
    for (const v of [null, undefined, 42, {}, [], ["malaria"], true]) {
      expect(() => isTestMentioned("MALARIA_MP", v as unknown as string)).not.toThrow();
      expect(isTestMentioned("MALARIA_MP", v as unknown as string)).toBe(false);
    }
  });

  it("false and no throw for a non-string code", () => {
    for (const v of [null, undefined, 42, {}]) {
      expect(() => isTestMentioned(v as unknown as string, "malaria")).not.toThrow();
      expect(isTestMentioned(v as unknown as string, "malaria")).toBe(false);
    }
  });

  it("false for empty or whitespace text", () => {
    expect(isTestMentioned("MALARIA_MP", "")).toBe(false);
    expect(isTestMentioned("MALARIA_MP", "   \n")).toBe(false);
  });

  it("never throws on hostile or very long text", () => {
    for (const text of ["(((", "\\", "😷 malaria", "\u0000‮", "a".repeat(10_000), "malaria ".repeat(1000)]) {
      expect(() => isTestMentioned("MALARIA_MP", text)).not.toThrow();
    }
    expect(isTestMentioned("MALARIA_MP", "😷 malaria")).toBe(true);
  });
});

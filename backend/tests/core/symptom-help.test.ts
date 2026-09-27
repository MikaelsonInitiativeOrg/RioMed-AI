import { describe, expect, it } from "vitest";
import { suggestTestsForSymptoms, SYMPTOM_LIST_STATUS } from "../../src/core/symptoms";
import { TEST_CATALOG } from "../../src/core/catalog";
import { getTestInfo, TEST_INFO } from "../../src/core/testInfo";
import { parseDeterministic } from "../../src/core/intent";

describe("suggestTestsForSymptoms", () => {
  it("offers tests often requested for fever and weakness (Nigerian phrasing too)", () => {
    const r = suggestTestsForSymptoms("My body is hot and I feel weak around Ikeja");
    expect(r.matched).toEqual(["fever", "tiredness or weakness"]);
    expect(r.tests).toEqual(["MALARIA_MP", "WIDAL", "FBC", "PCV", "FBS"]);
    expect(suggestTestsForSymptoms("body dey hot since yesterday").tests).toContain("MALARIA_MP");
  });
  it("shows nothing for emergencies, which go to 112 instead", () => {
    expect(suggestTestsForSymptoms("fever and severe chest pain, I can't breathe").tests).toEqual([]);
  });
  it("shows nothing when no symptom is described", () => {
    expect(suggestTestsForSymptoms("clinics in Yaba").tests).toEqual([]);
    expect(suggestTestsForSymptoms("").tests).toEqual([]);
  });
  it("only ever suggests known catalogue tests, at most 5", () => {
    const codes = new Set(TEST_CATALOG.map((t) => t.code));
    const r = suggestTestsForSymptoms("fever, weak, yellow eyes, burning urine, missed period, persistent cough");
    expect(r.tests.length).toBeLessThanOrEqual(5);
    for (const t of r.tests) expect(codes.has(t)).toBe(true);
  });
  it("never changes the parsed search: symptoms alone still name no test (FR-017)", () => {
    expect(parseDeterministic("my body is hot and I feel weak").tests).toEqual([]);
  });
  it("is labelled as a draft pending clinician review", () => {
    expect(SYMPTOM_LIST_STATUS).toMatch(/pending clinician review/);
  });
});

describe("test glossary", () => {
  it("covers every catalogue test in plain words", () => {
    for (const t of TEST_CATALOG) {
      const info = getTestInfo(t.code);
      expect(info?.measures.length).toBeGreaterThan(20);
      expect(info?.prepare.length).toBeGreaterThan(5);
    }
    expect(Object.keys(TEST_INFO).length).toBe(TEST_CATALOG.length);
  });
  it("never talks about the patient's own values", () => {
    for (const info of Object.values(TEST_INFO)) expect(`${info.measures} ${info.prepare}`).not.toMatch(/your result (is|shows)|normal range|you have/i);
  });
});

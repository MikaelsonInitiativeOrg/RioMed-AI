import { describe, it, expect } from "vitest";
import { detectEmergency, detectEmergencySafe, type EmergencyCheck } from "@/core/intent";

const PHRASES = [
  "chest pain",
  "difficulty breathing",
  "can't breathe",
  "cannot breathe",
  "shortness of breath",
  "not breathing",
  "heavy bleeding",
  "bleeding heavily",
  "unconscious",
  "unresponsive",
  "seizure",
  "convulsion",
  "convulse",
  "convulsed",
  "fitting",
  "stroke",
  "slurred speech",
  "suicide",
  "kill myself",
  "end my life",
  "overdose",
  "poisoning",
  "snake bite",
  "severe burn",
];

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

describe("detectEmergency: red-flag phrases", () => {
  for (const phrase of PHRASES) {
    it(`matches "${phrase}" in varied forms`, () => {
      const variants = [
        phrase,
        phrase.toUpperCase(),
        titleCase(phrase),
        `please help, ${phrase} now`,
        `My brother has ${phrase.toUpperCase()}!!`,
        `  ${phrase.replace(/ /g, "   ")}  `,
        phrase.replace(/ /g, "\t"),
        `${phrase}.`,
      ];
      for (const v of variants) {
        const r = detectEmergency(v);
        expect(r.isEmergency, v).toBe(true);
        expect(r.matched, v).toContain(phrase);
      }
    });
  }

  it("matches curly apostrophes in can't breathe", () => {
    for (const v of ["I can’t breathe", "I CAN’T BREATHE", "i can‘t   breathe", "can't breathe"]) {
      const r = detectEmergency(v);
      expect(r.isEmergency, v).toBe(true);
      expect(r.matched, v).toContain("can't breathe");
    }
  });

  it("matches the live-test prompt \"my baby dey convulse\"", () => {
    const r = detectEmergency("my baby dey convulse");
    expect(r.isEmergency).toBe(true);
    expect(r.matched).toContain("convulse");
    expect(detectEmergency("She CONVULSED last night").matched).toContain("convulsed");
    expect(detectEmergency("he is unresponsive").matched).toContain("unresponsive");
  });

  it("lists several matched phrases when several occur", () => {
    const r = detectEmergency("chest pain and slurred speech, he is unconscious");
    expect(r.isEmergency).toBe(true);
    expect(r.matched).toEqual(expect.arrayContaining(["chest pain", "slurred speech", "unconscious"]));
  });
});

describe("detectEmergency: non-matches", () => {
  const ordinary = [
    "malaria test in Ikeja",
    "blood sugar test",
    "full blood count tomorrow morning in Yaba",
    "chest x-ray in Surulere",
    "pregnancy test near Lekki",
    "HIV test this afternoon",
    "clinic in Victoria Island",
    "I need a scan on friday",
    "hello",
    "",
    "   ",
    "unfitting",
    "the uniform is unfitting",
    "a befitting clinic",
  ];
  for (const text of ordinary) {
    it(`does not match ${JSON.stringify(text)}`, () => {
      const r = detectEmergency(text);
      expect(r.isEmergency).toBe(false);
      expect(r.matched).toEqual([]);
    });
  }

  it('does not match "fitting" inside "unfitting"', () => {
    expect(detectEmergency("unfitting").matched).not.toContain("fitting");
  });
});

describe("detectEmergencySafe", () => {
  it("returns isEmergency true when the detector throws (AI-021)", () => {
    const throwing = (): EmergencyCheck => {
      throw new Error("detector broke");
    };
    expect(detectEmergencySafe("malaria test in Ikeja", throwing).isEmergency).toBe(true);
    expect(detectEmergencySafe("", throwing).isEmergency).toBe(true);
  });

  it("returns isEmergency true when the detector throws a non-Error", () => {
    const throwing = (): EmergencyCheck => {
      throw "string thrown";
    };
    expect(detectEmergencySafe("anything", throwing).isEmergency).toBe(true);
  });

  it("passes through a non-throwing detector's result", () => {
    const none = (): EmergencyCheck => ({ isEmergency: false, matched: [] });
    expect(detectEmergencySafe("chest pain", none).isEmergency).toBe(false);
    const yes = (): EmergencyCheck => ({ isEmergency: true, matched: ["stroke"] });
    expect(detectEmergencySafe("hello", yes)).toEqual({ isEmergency: true, matched: ["stroke"] });
  });

  it("uses detectEmergency by default", () => {
    expect(detectEmergencySafe("he is having a seizure").isEmergency).toBe(true);
    expect(detectEmergencySafe("malaria test in Ikeja").isEmergency).toBe(false);
  });
});

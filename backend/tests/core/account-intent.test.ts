import { describe, it, expect } from "vitest";
import { detectAccountIntent, looksLikeCredential } from "@/core/intent";

const CREATE_PHRASES = [
  "create an account",
  "create account",
  "create my account",
  "sign up",
  "signup",
  "register",
  "open an account",
  "open account",
  "new account",
  "make an account",
  "join riomed",
];

const ACCESS_PHRASES = [
  "access dashboard",
  "access my dashboard",
  "open dashboard",
  "open my dashboard",
  "my dashboard",
  "dashboard",
  "log in",
  "login",
  "sign in",
  "signin",
  "my account",
  "my bookings",
  "my results",
  // "facility desk" is covered separately: it contains "facility", so its type is facility.
];

const SEARCH_WORDS = ["test", "near", "around", "book", "appointment", "find", "where"];
const FACILITY_WORDS = ["clinic", "facility", "hospital", "lab", "laboratory", "diagnostic", "centre", "center", "staff", "phc"];

const ORDINARY_SEARCHES = [
  "malaria test in Ikeja tomorrow",
  "PCV test near Yaba",
  "full blood count in Surulere",
  "HIV test this afternoon",
  "fbc at 4pm in Lekki",
  "blood sugar test 2026-10-01",
  "clinic open 24 hours in Ikeja",
  "hba1c",
  "covid19 test",
  "e/u/cr in lekki",
  "scan on 12 October",
  "book 2 slots tomorrow at 9",
  "pregnancy test in Lekki phase 1",
  "lipid profile 5000 naira",
  "genotype AS test",
  "widal and mp test for my son, 5 years old",
  "hospital in Victoria Island",
  "chest x-ray around Ojota",
  "where can I do ultrasound",
  "I have fever and headache",
  "urinalysis at 10am",
  "spinal ultrasound 1234 Allen Avenue",
  "pin code for Yaba",
  "abeg I wan do tyfoid test",
];

describe("detectAccountIntent: create phrases", () => {
  for (const p of CREATE_PHRASES) {
    it(`"${p}" -> create/patient`, () => {
      expect(detectAccountIntent(p)).toEqual({ action: "create", type: "patient" });
      expect(detectAccountIntent(`please ${p} for me`)).toEqual({ action: "create", type: "patient" });
      expect(detectAccountIntent(p.toUpperCase())).toEqual({ action: "create", type: "patient" });
    });
  }
});

describe("detectAccountIntent: access phrases", () => {
  for (const p of ACCESS_PHRASES) {
    it(`"${p}" -> access/patient`, () => {
      expect(detectAccountIntent(p)).toEqual({ action: "access", type: "patient" });
      expect(detectAccountIntent(`abeg ${p} now`)).toEqual({ action: "access", type: "patient" });
      expect(detectAccountIntent(p.toUpperCase())).toEqual({ action: "access", type: "patient" });
    });
  }

  it('"facility desk" -> access/facility', () => {
    expect(detectAccountIntent("facility desk")).toEqual({ action: "access", type: "facility" });
  });
});

describe("detectAccountIntent: facility vs patient type", () => {
  for (const w of FACILITY_WORDS) {
    it(`"${w}" makes the type facility`, () => {
      expect(detectAccountIntent(`register my ${w}`)).toEqual({ action: "create", type: "facility" });
      expect(detectAccountIntent(`${w} login`)).toEqual({ action: "access", type: "facility" });
    });
  }

  it("contract examples from FR-008", () => {
    expect(detectAccountIntent("create an account")).toEqual({ action: "create", type: "patient" });
    expect(detectAccountIntent("access dashboard")).toEqual({ action: "access", type: "patient" });
    expect(detectAccountIntent("register my clinic")).toEqual({ action: "create", type: "facility" });
    expect(detectAccountIntent("access clinic dashboard")).toEqual({ action: "access", type: "facility" });
  });

  it("facility words are case-insensitive", () => {
    expect(detectAccountIntent("Sign Up My HOSPITAL")).toEqual({ action: "create", type: "facility" });
    expect(detectAccountIntent("Diagnostic Centre sign in")).toEqual({ action: "access", type: "facility" });
  });
});

describe("detectAccountIntent: both match -> create", () => {
  const cases = [
    "sign up or log in",
    "login or create account",
    "create account then access dashboard",
    "create my account", // contains "my account"
    "register, then my dashboard",
  ];
  for (const t of cases) {
    it(JSON.stringify(t), () => {
      expect(detectAccountIntent(t)?.action).toBe("create");
    });
  }
  it("keeps the facility type when both match", () => {
    expect(detectAccountIntent("register my clinic and open dashboard")).toEqual({ action: "create", type: "facility" });
  });
});

describe("detectAccountIntent: search words win", () => {
  it("contract example: 'register for a malaria test near Yaba' -> null", () => {
    expect(detectAccountIntent("register for a malaria test near Yaba")).toBeNull();
  });
  for (const w of SEARCH_WORDS) {
    it(`"${w}" overrides create and access`, () => {
      expect(detectAccountIntent(`create account ${w}`)).toBeNull();
      expect(detectAccountIntent(`${w} my dashboard`)).toBeNull();
      expect(detectAccountIntent(`${w.toUpperCase()} LOGIN`)).toBeNull();
      expect(detectAccountIntent(`register my clinic, ${w}`)).toBeNull();
    });
  }
  it("'my bookings' is not overridden by 'book' (whole words)", () => {
    expect(detectAccountIntent("my bookings")).toEqual({ action: "access", type: "patient" });
  });
});

describe("detectAccountIntent: case, punctuation and Pidgin", () => {
  const cases: [string, { action: string; type: string }][] = [
    ["CREATE AN ACCOUNT", { action: "create", type: "patient" }],
    ["Log In", { action: "access", type: "patient" }],
    ["sign up!", { action: "create", type: "patient" }],
    ["login?", { action: "access", type: "patient" }],
    ["Create account.", { action: "create", type: "patient" }],
    ["Dashboard, please", { action: "access", type: "patient" }],
    ["(register my clinic)", { action: "create", type: "facility" }],
    ["  my   results  ", { action: "access", type: "patient" }],
    ["I wan open account", { action: "create", type: "patient" }],
    ["abeg make I login", { action: "access", type: "patient" }],
    ["I wan register my clinic", { action: "create", type: "facility" }],
    ["abeg show me my dashboard", { action: "access", type: "patient" }],
  ];
  for (const [t, want] of cases) {
    it(`${JSON.stringify(t)} -> ${want.action}/${want.type}`, () => {
      expect(detectAccountIntent(t)).toEqual(want);
    });
  }

  it("matches whole words only", () => {
    for (const t of ["registered nurse", "unregister", "loginx", "signups123", "dashboardy", "clinical signupish"]) {
      expect(detectAccountIntent(t), t).toBeNull();
    }
  });

  it("a facility word inside another word does not make it facility", () => {
    // "label" contains "lab", "clinical" contains "clinic"
    expect(detectAccountIntent("sign up label")).toEqual({ action: "create", type: "patient" });
    expect(detectAccountIntent("clinical login")).toEqual({ action: "access", type: "patient" });
  });
});

describe("detectAccountIntent: limits and invalid input", () => {
  it("accepts exactly 200 characters and rejects 201", () => {
    const base = "create account ";
    const t200 = base + "x".repeat(200 - base.length);
    expect(t200.length).toBe(200);
    expect(detectAccountIntent(t200)).toEqual({ action: "create", type: "patient" });
    expect(detectAccountIntent(t200 + "x")).toBeNull();
    expect(detectAccountIntent("login " + "y".repeat(1000))).toBeNull();
  });

  it("null for empty text and no match", () => {
    for (const t of ["", "   ", "\n\t", "hello", "good morning", "account", "access", "open", "my"]) {
      expect(detectAccountIntent(t), JSON.stringify(t)).toBeNull();
    }
  });

  it("null for non-strings, never throws", () => {
    for (const v of [null, undefined, 42, true, {}, [], ["login"], { text: "login" }, Symbol("login")]) {
      expect(() => detectAccountIntent(v as unknown as string)).not.toThrow();
      expect(detectAccountIntent(v as unknown as string)).toBeNull();
    }
  });

  it("never throws on hostile text", () => {
    for (const t of ["(((", "\\", "[a-z]*", "😷 login", "\u0000register", "‮sign up"]) {
      expect(() => detectAccountIntent(t)).not.toThrow();
    }
  });

  it("ordinary health searches give null", () => {
    for (const t of ORDINARY_SEARCHES) {
      expect(detectAccountIntent(t), t).toBeNull();
    }
  });
});

describe("looksLikeCredential: contract examples", () => {
  for (const t of ["my password is abc12345", "pin: 4821", "4821", "password hunter22", "password na mylove"]) {
    it(`${JSON.stringify(t)} -> true`, () => {
      expect(looksLikeCredential(t)).toBe(true);
    });
  }
  for (const t of ["I forgot my password", "pin test", "what is a pin"]) {
    it(`${JSON.stringify(t)} -> false`, () => {
      expect(looksLikeCredential(t)).toBe(false);
    });
  }
});

describe("looksLikeCredential: bare PINs", () => {
  it("true for 4-6 digits, trimmed", () => {
    for (const t of ["0000", "1234", "48213", "482193", "  4821  ", "\t123456\n"]) {
      expect(looksLikeCredential(t), JSON.stringify(t)).toBe(true);
    }
  });
  it("false for 3 or 7 digits, or digits mixed with other text", () => {
    for (const t of ["482", "4821937", "12 34", "48-21", "4821 please"]) {
      expect(looksLikeCredential(t), JSON.stringify(t)).toBe(false);
    }
  });
});

describe("looksLikeCredential: keyword forms", () => {
  const trueCases = [
    "password is secret",
    "PASSWORD IS Hunter2",
    "my password: abc",
    "password=qwerty",
    "password = qwerty",
    "passcode: 9999",
    "passcode is 482193",
    "passwd=secret",
    "passwd is letmein",
    "PIN is 1234",
    "my pin na 4821",
    "pin 1234",
    "pin 48a",
    "Password abc123",
    "abeg my password na chioma1990",
    "Pin: 0000",
  ];
  for (const t of trueCases) {
    it(`${JSON.stringify(t)} -> true`, () => {
      expect(looksLikeCredential(t)).toBe(true);
    });
  }

  const falseCases = [
    "password is ab", // token under 3 characters, no digit
    "pin is",
    "password",
    "my pin",
    "what is my pin",
    "pin code for Yaba", // no separator, token has no digit
    "password manager",
    "spinal ultrasound 1234 Allen Avenue", // "pin" inside "spinal"
    "pinpoint 1234 location",
  ];
  for (const t of falseCases) {
    it(`${JSON.stringify(t)} -> false`, () => {
      expect(looksLikeCredential(t)).toBe(false);
    });
  }
});

describe("looksLikeCredential: forgot/forget/reset/change always false", () => {
  const cases = [
    "I forgot my password",
    "forgot password is abc12345",
    "I forget my pin: 4821",
    "reset my pin 4821",
    "reset password=hunter22",
    "change password to abc12345",
    "CHANGE my PIN is 1234",
    "Forgot PIN",
  ];
  for (const t of cases) {
    it(`${JSON.stringify(t)} -> false`, () => {
      expect(looksLikeCredential(t)).toBe(false);
    });
  }
});

describe("looksLikeCredential: no false positives on ordinary health searches", () => {
  for (const t of ORDINARY_SEARCHES) {
    it(`${JSON.stringify(t)} -> false`, () => {
      expect(looksLikeCredential(t)).toBe(false);
    });
  }
});

describe("looksLikeCredential: invalid input", () => {
  it("false for non-strings, never throws", () => {
    for (const v of [null, undefined, 4821, 123456, true, {}, [], ["4821"], Symbol("pin")]) {
      expect(() => looksLikeCredential(v as unknown as string)).not.toThrow();
      expect(looksLikeCredential(v as unknown as string)).toBe(false);
    }
  });
  it("false for empty text and never throws on hostile text", () => {
    expect(looksLikeCredential("")).toBe(false);
    expect(looksLikeCredential("   ")).toBe(false);
    for (const t of ["(((", "\\", "pin: (((", "password=\u0000\u0000", "a".repeat(100_000)]) {
      expect(() => looksLikeCredential(t)).not.toThrow();
    }
  });
});

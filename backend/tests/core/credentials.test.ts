import { describe, it, expect } from "vitest";
import { checkUsername, checkPassword, checkPin, MAX_FAILED_ATTEMPTS, LOCK_MINUTES } from "@/core/credentials";
import { mulberry32, randInt } from "./_helpers";

type C = ReturnType<typeof checkUsername>;
const expectOk = (r: C, value?: string) => {
  expect(r.ok, JSON.stringify(r)).toBe(true);
  if (r.ok && value !== undefined) expect(r.value).toBe(value);
};
const expectFail = (r: C, label = "") => {
  expect(r.ok, `${label} ${JSON.stringify(r)}`).toBe(false);
  if (!r.ok) {
    expect(typeof r.error).toBe("string");
    expect(r.error.length).toBeGreaterThan(0);
  }
};

const NON_STRINGS: unknown[] = [null, undefined, 1234, 12345678, true, {}, [], ["abcd"], { value: "x" }, Symbol("s"), () => "x"];

describe("constants", () => {
  it("MAX_FAILED_ATTEMPTS is 5 and LOCK_MINUTES is 15", () => {
    expect(MAX_FAILED_ATTEMPTS).toBe(5);
    expect(LOCK_MINUTES).toBe(15);
  });
});

describe("checkUsername", () => {
  it("accepts 3 and 30 characters, rejects 2 and 31", () => {
    expectOk(checkUsername("abc"), "abc");
    expectFail(checkUsername("ab"));
    expectOk(checkUsername("a".repeat(30)), "a".repeat(30));
    expectFail(checkUsername("a".repeat(31)));
  });

  it("trims and lowercases the value", () => {
    expectOk(checkUsername("  Ada_Obi  "), "ada_obi");
    expectOk(checkUsername("ADA.OBI"), "ada.obi");
    expectOk(checkUsername("\tChioma99\n"), "chioma99");
  });

  it("measures length after trimming", () => {
    expectFail(checkUsername("  ab  "));
    expectOk(checkUsername(" abc "), "abc");
    expectOk(checkUsername("  " + "b".repeat(30) + "  "), "b".repeat(30));
  });

  it("allows letters, digits, underscore and dot inside", () => {
    for (const u of ["a.b", "a_b", "a__b", "a..b", "123", "ada.obi_2", "x9_y.z"]) expectOk(checkUsername(u), u);
  });

  it("rejects leading or trailing dot or underscore", () => {
    for (const u of [".ada", "ada.", "_ada", "ada_", "._a", "a._", "...", "___"]) expectFail(checkUsername(u), u);
  });

  it("rejects other characters", () => {
    for (const u of ["ada-obi", "ada obi", "adé", "ada@obi", "ada!", "ada/obi", "ada\u0000b", "адa", "😷ada", ""]) {
      expectFail(checkUsername(u), u);
    }
  });

  it("rejects non-strings without throwing", () => {
    for (const v of NON_STRINGS) {
      expect(() => checkUsername(v)).not.toThrow();
      expectFail(checkUsername(v));
    }
  });
});

describe("checkPassword", () => {
  const strong128 = "Ab3$xY7!".repeat(16);

  it("accepts 8 and 128 characters, rejects 7 and 129", () => {
    expectOk(checkPassword("Xk9#mQ2z"), "Xk9#mQ2z");
    expectFail(checkPassword("Xk9#mQ2"));
    expect(strong128.length).toBe(128);
    expectOk(checkPassword(strong128), strong128);
    expectFail(checkPassword(strong128 + "q"));
  });

  it("returns the value unchanged (no trim, no lowercasing)", () => {
    const pw = "  Spaces In Pass9 ";
    expectOk(checkPassword(pw), pw);
    expectOk(checkPassword("MiXeD-CaSe-42"), "MiXeD-CaSe-42");
  });

  it("rejects a password containing the username, case-insensitively", () => {
    expectFail(checkPassword("ada_obi_rocks!", "ada_obi"));
    expectFail(checkPassword("MyADA_OBIpass9", "ada_obi"));
    expectFail(checkPassword("xx-chioma-xx", "Chioma"));
    expectFail(checkPassword("chioma99", "chioma99"));
  });

  it("allows the same password without a username, or with an unrelated one", () => {
    expectOk(checkPassword("ada_obi_rocks!"));
    expectOk(checkPassword("ada_obi_rocks!", "tunde"));
  });

  it("rejects a single repeated character", () => {
    for (const pw of ["aaaaaaaa", "11111111", "        ", "ZZZZZZZZZZZZ", "!".repeat(128)]) expectFail(checkPassword(pw), pw);
  });

  it("allows a password that only mostly repeats", () => {
    expectOk(checkPassword("aaaaaaab"));
  });

  it("rejects the common passwords, case-insensitively", () => {
    for (const pw of [
      "password",
      "password1",
      "12345678",
      "123456789",
      "qwertyui",
      "PASSWORD",
      "Password1",
      "QwErTyUi",
      "PaSsWoRd",
    ]) {
      expectFail(checkPassword(pw), pw);
    }
  });

  it("allows unicode and symbols", () => {
    expectOk(checkPassword("Ọjọ́-àìkú-2026"));
    expectOk(checkPassword("🦟🦟malaria🦟x"));
  });

  it("rejects non-strings without throwing", () => {
    for (const v of NON_STRINGS) {
      expect(() => checkPassword(v)).not.toThrow();
      expectFail(checkPassword(v));
      expect(() => checkPassword(v, "ada")).not.toThrow();
    }
  });
});

describe("checkPin", () => {
  it("accepts ordinary 4, 5 and 6 digit PINs, returning the string", () => {
    for (const p of ["4821", "0482", "48213", "482193", "1357", "2468", "1029", "907153"]) expectOk(checkPin(p), p);
  });

  it("rejects 3 and 7 digits", () => {
    expectFail(checkPin("482"));
    expectFail(checkPin("4821937"));
    expectFail(checkPin(""));
    expectFail(checkPin("1"));
  });

  it("rejects non-digit characters", () => {
    for (const p of ["12a4", "12 34", "48.21", "-482", "+4821", "4821\n", "١٢٣٤", "４８２１", "0x12"]) {
      expectFail(checkPin(p), JSON.stringify(p));
    }
  });

  it("rejects all-same digits", () => {
    for (const p of ["0000", "1111", "99999", "555555", "777777"]) expectFail(checkPin(p), p);
  });

  it("rejects ascending runs, including wrap-around", () => {
    for (const p of ["0123", "1234", "3456", "6789", "7890", "8901", "9012", "56789", "89012", "012345", "890123", "901234", "678901"]) {
      expectFail(checkPin(p), p);
    }
  });

  it("rejects descending runs, including wrap-around", () => {
    for (const p of ["4321", "9876", "3210", "2109", "1098", "0987", "98765", "10987", "987654", "210987", "109876", "321098"]) {
      expectFail(checkPin(p), p);
    }
  });

  it("does not treat non-consecutive or broken runs as sequences", () => {
    for (const p of ["1235", "1243", "9780", "0986", "13579", "123465"]) expectOk(checkPin(p), p);
  });

  it("rejects a number (not a string) and other non-strings without throwing", () => {
    for (const v of NON_STRINGS) {
      expect(() => checkPin(v)).not.toThrow();
      expectFail(checkPin(v));
    }
  });

  it("property: over seeded random PINs, ok iff not all-same and not a wrap-around run", () => {
    const ASC = "0123456789012345";
    const DESC = "9876543210987654";
    const rng = mulberry32(4821);
    for (let i = 0; i < 3000; i++) {
      const len = randInt(rng, 4, 6);
      let p = "";
      // bias towards runs and repeats so both branches are exercised
      const mode = rng();
      if (mode < 0.15) {
        const s = randInt(rng, 0, 9);
        p = ASC.slice(s, s + len);
      } else if (mode < 0.3) {
        const s = randInt(rng, 0, 9);
        p = DESC.slice(s, s + len);
      } else if (mode < 0.4) {
        p = String(randInt(rng, 0, 9)).repeat(len);
      } else {
        for (let j = 0; j < len; j++) p += String(randInt(rng, 0, 9));
      }
      const bad = /^(\d)\1+$/.test(p) || ASC.includes(p) || DESC.includes(p);
      expect(checkPin(p).ok, p).toBe(!bad);
    }
  });
});

import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifyPaystackSignature, checkVerifiedTransaction } from "@/core/payments";

const SECRET = "sk_test_abc123";
const BODY = JSON.stringify({ event: "charge.success", data: { reference: "RM-ABCD-EFGH", amount: 250000 } });
const sign = (body: string, secret: string) => createHmac("sha512", secret).update(body).digest("hex");

describe("verifyPaystackSignature", () => {
  it("accepts a valid HMAC-SHA512 hex signature", () => {
    expect(verifyPaystackSignature(BODY, sign(BODY, SECRET), SECRET)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const sig = sign(BODY, SECRET);
    expect(verifyPaystackSignature(BODY.replace("250000", "1"), sig, SECRET)).toBe(false);
    expect(verifyPaystackSignature(BODY + " ", sig, SECRET)).toBe(false);
  });

  it("rejects a signature made with the wrong secret", () => {
    expect(verifyPaystackSignature(BODY, sign(BODY, "sk_test_other"), SECRET)).toBe(false);
  });

  it("rejects a flipped hex digit", () => {
    const sig = sign(BODY, SECRET);
    const flipped = (sig[0] === "a" ? "b" : "a") + sig.slice(1);
    expect(verifyPaystackSignature(BODY, flipped, SECRET)).toBe(false);
  });

  it("fails closed on missing or empty signature", () => {
    expect(verifyPaystackSignature(BODY, null, SECRET)).toBe(false);
    expect(verifyPaystackSignature(BODY, undefined, SECRET)).toBe(false);
    expect(verifyPaystackSignature(BODY, "", SECRET)).toBe(false);
  });

  it("fails closed on missing or empty secret, even if signature matches that secret", () => {
    expect(verifyPaystackSignature(BODY, sign(BODY, ""), "")).toBe(false);
    expect(verifyPaystackSignature(BODY, sign(BODY, SECRET), null)).toBe(false);
    expect(verifyPaystackSignature(BODY, sign(BODY, SECRET), undefined)).toBe(false);
  });

  it("fails closed on an empty body", () => {
    expect(verifyPaystackSignature("", sign("", SECRET), SECRET)).toBe(false);
  });

  it("returns false (does not throw) on wrong-length signatures", () => {
    const sig = sign(BODY, SECRET);
    const cases = [
      sig.slice(0, -1),
      sig.slice(0, 64),
      sig + "0",
      sig + "00",
      createHmac("sha256", SECRET).update(BODY).digest("hex"),
      "a",
    ];
    for (const c of cases) {
      expect(() => verifyPaystackSignature(BODY, c, SECRET)).not.toThrow();
      expect(verifyPaystackSignature(BODY, c, SECRET)).toBe(false);
    }
  });

  it("returns false (does not throw) on non-hex signatures of the right length", () => {
    const bogus = "z".repeat(128);
    expect(() => verifyPaystackSignature(BODY, bogus, SECRET)).not.toThrow();
    expect(verifyPaystackSignature(BODY, bogus, SECRET)).toBe(false);
    const unicode = "é".repeat(128);
    expect(() => verifyPaystackSignature(BODY, unicode, SECRET)).not.toThrow();
    expect(verifyPaystackSignature(BODY, unicode, SECRET)).toBe(false);
  });

  it("verifies bodies with unicode content", () => {
    const body = JSON.stringify({ note: "Ọjọ́ ₦2,500 ✓" });
    expect(verifyPaystackSignature(body, sign(body, SECRET), SECRET)).toBe(true);
  });
});

describe("checkVerifiedTransaction", () => {
  const expected = { reference: "RM-ABCD-EFGH", amountKobo: 250000 };
  const good = { status: "success", reference: "RM-ABCD-EFGH", amount: 250000, currency: "NGN" };

  const expectNotOk = (r: ReturnType<typeof checkVerifiedTransaction>) => {
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(typeof r.reason).toBe("string");
      expect(r.reason.length).toBeGreaterThan(0);
    }
  };

  it("accepts a matching successful transaction", () => {
    expect(checkVerifiedTransaction(good, expected)).toEqual({ ok: true });
  });

  it("accepts extra fields from Paystack", () => {
    expect(checkVerifiedTransaction({ ...good, id: 123, gateway_response: "Successful" }, expected).ok).toBe(true);
  });

  it("rejects non-success status", () => {
    for (const status of ["failed", "abandoned", "pending", "reversed", "SUCCESS", "Success", "", null, undefined]) {
      expectNotOk(checkVerifiedTransaction({ ...good, status }, expected));
    }
  });

  it("rejects a reference mismatch", () => {
    expectNotOk(checkVerifiedTransaction({ ...good, reference: "RM-ABCD-EFGX" }, expected));
    expectNotOk(checkVerifiedTransaction({ ...good, reference: "rm-abcd-efgh" }, expected));
    expectNotOk(checkVerifiedTransaction({ ...good, reference: "" }, expected));
  });

  it("rejects an amount mismatch (exact kobo)", () => {
    for (const amount of [249999, 250001, 2500, 25000000, 0, -250000, 250000.5]) {
      expectNotOk(checkVerifiedTransaction({ ...good, amount }, expected));
    }
  });

  it("rejects a non-number amount", () => {
    for (const amount of ["250000", null, undefined, {}, NaN]) {
      expectNotOk(checkVerifiedTransaction({ ...good, amount }, expected));
    }
  });

  it("rejects a currency mismatch", () => {
    for (const currency of ["USD", "GHS", "ngn", "", null, undefined]) {
      expectNotOk(checkVerifiedTransaction({ ...good, currency }, expected));
    }
  });

  it("returns ok:false and never throws on malformed input", () => {
    const throwing = new Proxy(
      {},
      {
        get() {
          throw new Error("boom");
        },
        has() {
          throw new Error("boom");
        },
      },
    );
    const inputs: unknown[] = [null, undefined, 0, 42, "success", true, [], [good], {}, { data: good }, throwing];
    for (const input of inputs) {
      expect(() => checkVerifiedTransaction(input, expected)).not.toThrow();
      expectNotOk(checkVerifiedTransaction(input, expected));
    }
  });
});

import { describe, expect, it } from "vitest";
import { checkBankDetails, checkEmail, hasBankDetails, transferNarration } from "../../src/core/bankDetails";

describe("checkBankDetails (direct transfer)", () => {
  it("accepts a 10-digit NUBAN and ignores spaces and dashes", () => {
    const r = checkBankDetails({ bankName: "GTBank", accountNumber: "012 345-6789", accountName: "Wuse Family Clinic Ltd" });
    expect(r.ok && r.value.accountNumber).toBe("0123456789");
  });
  it("rejects missing bank, wrong-length numbers, letters and short names", () => {
    expect(checkBankDetails({ bankName: "", accountNumber: "0123456789", accountName: "Clinic" }).ok).toBe(false);
    expect(checkBankDetails({ bankName: "GTBank", accountNumber: "123456789", accountName: "Clinic" }).ok).toBe(false);
    expect(checkBankDetails({ bankName: "GTBank", accountNumber: "01234567890", accountName: "Clinic" }).ok).toBe(false);
    expect(checkBankDetails({ bankName: "GTBank", accountNumber: "01234abcde", accountName: "Clinic" }).ok).toBe(false);
    expect(checkBankDetails({ bankName: "GTBank", accountNumber: "0123456789", accountName: "AB" }).ok).toBe(false);
  });
  it("strips markup from names", () => {
    const r = checkBankDetails({ bankName: "<b>GTBank</b>", accountNumber: "0123456789", accountName: "Clinic <script>" });
    expect(r.ok && r.value.bankName + r.value.accountName).not.toMatch(/[<>]/);
  });
});

describe("hasBankDetails: bookable online only with a complete account", () => {
  it("needs all three fields and a valid number", () => {
    expect(hasBankDetails({ bankName: "GTBank", accountNumber: "0123456789", accountName: "Clinic" })).toBe(true);
    expect(hasBankDetails({ bankName: "GTBank", accountNumber: null, accountName: "Clinic" })).toBe(false);
    expect(hasBankDetails({ bankName: null, accountNumber: "0123456789", accountName: "Clinic" })).toBe(false);
    expect(hasBankDetails({ bankName: "GTBank", accountNumber: "12", accountName: "Clinic" })).toBe(false);
    expect(hasBankDetails({})).toBe(false);
  });
});

describe("transferNarration and checkEmail", () => {
  it("uses the booking reference, uppercase, safe characters only", () => {
    expect(transferNarration("rm-ab12-cd34")).toBe("RM-AB12-CD34");
    expect(transferNarration("RM-AB12 <x>")).toBe("RM-AB12X");
  });
  it("validates and lower-cases email", () => {
    const r = checkEmail(" Ada@Example.COM ");
    expect(r.ok && r.value).toBe("ada@example.com");
    for (const bad of ["", "ada", "ada@", "ada@x", "a b@x.com", 5]) expect(checkEmail(bad).ok).toBe(false);
  });
});

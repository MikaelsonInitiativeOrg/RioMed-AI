/** Account flow smoke test (local DB). Run: npm run smoke:accounts */
import { prisma } from "../src/server/db";
import { decideFacilityAccount, loginWithPassword, signUp, unlockWithPin } from "../src/server/accounts";
import { findUser } from "../src/server/queries";
import { can } from "../src/core/access";

function check(name: string, ok: boolean) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) process.exitCode = 1;
}

async function main() {
  const tag = Date.now().toString(36);
  const pat = await signUp({ username: `ada_${tag}`, password: "lagos-rain-2026", pin: "4821", displayName: "Ada Test", type: "patient" });
  check("patient sign-up is active", pat.ok && pat.status === "active");
  const stored = await prisma.user.findUnique({ where: { username: `ada_${tag}` } });
  check("password and PIN stored only as scrypt hashes", !!stored?.passwordHash?.startsWith("scrypt$") && !stored.passwordHash.includes("lagos") && !!stored.pinHash?.startsWith("scrypt$"));
  check("duplicate username rejected", !(await signUp({ username: `ADA_${tag}`, password: "another-pass-1", pin: "4822", displayName: "X Y", type: "patient" })).ok);
  check("weak PIN 1234 rejected", !(await signUp({ username: `b_${tag}`, password: "lagos-rain-2026", pin: "1234", displayName: "B B", type: "patient" })).ok);
  check("password login works (case-insensitive username)", (await loginWithPassword(`ADA_${tag}`, "lagos-rain-2026")).ok);
  const wrong = await loginWithPassword(`ada_${tag}`, "nope-nope-nope");
  const unknown = await loginWithPassword(`nobody_${tag}`, "nope-nope-nope");
  check("same error for wrong password and unknown user", !wrong.ok && !unknown.ok && wrong.error === unknown.error);
  if (pat.ok) {
    check("PIN unlock works", (await unlockWithPin(pat.userId, "4821")).ok);
    for (let i = 0; i < 5; i++) await unlockWithPin(pat.userId, "0000");
    const locked = await unlockWithPin(pat.userId, "4821");
    check("5 wrong PINs lock the account (even the right PIN fails)", !locked.ok && /Too many/.test(locked.error));
    check("locked account also blocks password login", !(await loginWithPassword(`ada_${tag}`, "lagos-rain-2026")).ok);
  }

  const fac = await signUp({ username: `lab_${tag}`, password: "yaba-lab-staff-9", pin: "7302", displayName: "Lab Staff", type: "facility", facilityId: "fac_008" });
  check("facility sign-up is pending", fac.ok && fac.status === "pending");
  check("facility sign-up refused for non-partner facility", !(await signUp({ username: `x_${tag}`, password: "yaba-lab-staff-9", pin: "7302", displayName: "Lab Staff", type: "facility", facilityId: "fac_013" })).ok);
  if (fac.ok) {
    const before = await findUser(fac.userId);
    check("pending facility user has no facility access", before?.facilityId === null && !can({ userId: fac.userId, role: "facility_staff", facilityId: before?.facilityId }, "appointment:checkin", { facilityId: "fac_008", status: "CONFIRMED" }));
    check("non-operator cannot approve", !(await decideFacilityAccount({ userId: "usr_patient_ada", role: "patient" }, fac.userId, true)));
    check("operator approves", await decideFacilityAccount({ userId: "usr_operator", role: "operator" }, fac.userId, true));
    const after = await findUser(fac.userId);
    check("approved facility user gets facility access", after?.facilityId === "fac_008");
  }
}

main().finally(() => prisma.$disconnect());

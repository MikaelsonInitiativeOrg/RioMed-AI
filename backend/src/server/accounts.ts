import "server-only";
import { randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { checkPassword, checkPin, checkUsername, LOCK_MINUTES, MAX_FAILED_ATTEMPTS } from "../core/credentials";
import { prisma } from "./db";
import { audit } from "./booking";
import { buildOpeningSlots, checkFacilityRegistration } from "../core/facilityRegistration";
import { nearestPlace, type LatLng } from "../core/geo";
import { geocodeAddress } from "./geocode";

/**
 * Real accounts (added 2026-09-27, product owner request; replaces FR-002 phone OTP for the demo).
 * - Sign-up: username + password + 4–6 digit PIN. Patients are active at once.
 * - Facilities: registering a NEW facility lists it at once, bookable, with the new user as its
 *   admin (product owner request, 2026-09-27). Joining an EXISTING facility stays "pending" until
 *   an operator approves it, so nobody can claim to be staff at someone else's clinic.
 * - Sign-in: username + password on a new device. On a remembered device the PIN unlocks.
 * - 5 wrong passwords or PINs lock the account for 15 minutes. Errors never say which part was wrong.
 * - Passwords and PINs are scrypt-hashed with a per-secret salt, and are never logged or sent to the AI.
 */

function scrypt(secret: string, salt: Buffer, keylen: number, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => scryptCb(secret, salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key))));
}

const PARAMS = { N: 16384, r: 8, p: 1 };

export async function hashSecret(secret: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(secret, salt, 32, PARAMS);
  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifySecret(secret: string, stored: string | null | undefined): Promise<boolean> {
  if (typeof secret !== "string" || !stored) return false;
  const [alg, n, r, p, saltB64, keyB64] = stored.split("$");
  if (alg !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64");
  const actual = await scrypt(secret, Buffer.from(saltB64, "base64"), expected.length, { N: Number(n), r: Number(r), p: Number(p) });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// Spend similar time for unknown usernames, so response time doesn't reveal which usernames exist.
const DUMMY_HASH = hashSecret("not-a-real-password-" + randomUUID());

export type AccountResult =
  | { ok: true; userId: string; role: string; status: "active" | "pending" }
  | { ok: false; error: string };

export async function listSignupFacilities() {
  return prisma.facility.findMany({ where: { isPartner: true, operational: true }, select: { id: true, name: true, area: true }, orderBy: { name: "asc" } });
}

export async function signUp(input: {
  username: unknown;
  password: unknown;
  pin: unknown;
  displayName: unknown;
  type: "patient" | "facility";
  facilityId?: unknown;
  /** New facility details (type "facility" without facilityId). prices: ticked testCode -> naira. */
  registration?: { name: unknown; type: unknown; address: unknown; phone: unknown; prices: Record<string, unknown> };
  /** Where the facility is, when the person registering shared their location; else the address is geocoded. */
  origin?: LatLng | null;
}): Promise<AccountResult> {
  const u = checkUsername(input.username);
  if (!u.ok) return u;
  const pw = checkPassword(input.password, u.value);
  if (!pw.ok) return pw;
  const pin = checkPin(input.pin);
  if (!pin.ok) return pin;
  const name = typeof input.displayName === "string" ? input.displayName.trim().replace(/\s+/g, " ").slice(0, 60) : "";
  if (name.length < 2) return { ok: false, error: "Enter your name (at least 2 characters)." };

  if (input.type === "facility" && input.registration) return registerFacility(u.value, pw.value, pin.value, name, input.registration, input.origin ?? null);

  let facilityId: string | null = null;
  if (input.type === "facility") {
    if (typeof input.facilityId !== "string") return { ok: false, error: "Choose your facility." };
    const f = await prisma.facility.findUnique({ where: { id: input.facilityId } });
    if (!f || !f.isPartner) return { ok: false, error: "Choose a RioMed partner facility." };
    facilityId = f.id;
  }

  const [passwordHash, pinHash] = await Promise.all([hashSecret(pw.value), hashSecret(pin.value)]);
  try {
    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        username: u.value,
        name,
        passwordHash,
        pinHash,
        role: input.type === "facility" ? "facility_staff" : "patient",
        facilityId,
        status: input.type === "facility" ? "pending" : "active",
      },
    });
    await audit(user.id, "account.signup", "User", user.id);
    return { ok: true, userId: user.id, role: user.role, status: user.status as "active" | "pending" };
  } catch {
    return { ok: false, error: "That username is taken. Try another." };
  }
}

async function registerFacility(
  username: string,
  password: string,
  pin: string,
  name: string,
  raw: NonNullable<Parameters<typeof signUp>[0]["registration"]>,
  origin: LatLng | null,
): Promise<AccountResult> {
  const reg = checkFacilityRegistration(raw);
  if (!reg.ok) return reg;
  const f = reg.value;
  const located = origin ?? (await geocodeAddress(f.address));
  if (!located) return { ok: false, error: "We couldn't find that address on the map. Add the area, city and country, or use your current location." };
  const where = { lat: located.lat, lng: located.lng };
  const area = ("name" in located && typeof located.name === "string" ? located.name : null) ?? nearestPlace(where)?.name ?? f.address.split(",")[0];

  const [passwordHash, pinHash] = await Promise.all([hashSecret(password), hashSecret(pin)]);
  const facilityId = `fac_${randomUUID().slice(0, 12)}`;
  const userId = randomUUID();
  const now = new Date();
  try {
    await prisma.$transaction([
      prisma.facility.create({
        data: {
          id: facilityId,
          nhfrId: null, // not registry-verified; shown as self-registered
          name: f.name,
          type: f.type,
          ownership: "private",
          address: f.address,
          area: area.slice(0, 80),
          lat: where.lat,
          lng: where.lng,
          phone: f.phone,
          operational: true,
          isPartner: true,
          source: "self_registered",
          sourceSyncedAt: now,
        },
      }),
      prisma.facilityTest.createMany({ data: f.tests.map((t) => ({ facilityId, testCode: t.testCode, priceKobo: t.priceKobo, turnaroundHours: 24 })) }),
      prisma.slot.createMany({ data: buildOpeningSlots(facilityId, f.type, now) }),
      prisma.user.create({
        data: { id: userId, username, name, passwordHash, pinHash, role: "facility_admin", facilityId, status: "active" },
      }),
    ]);
  } catch (e) {
    if ((e as { code?: string })?.code === "P2002") return { ok: false, error: "That username is taken. Try another." };
    console.error("facility registration failed", (e as Error)?.message?.slice(-400));
    return { ok: false, error: "Registration didn't go through. Please try again." };
  }
  await audit(userId, "account.signup", "User", userId);
  await audit(userId, "facility.register", "Facility", facilityId);
  return { ok: true, userId, role: "facility_admin", status: "active" };
}

type LockableUser = { id: string; lockedUntil: Date | null };

function isLocked(u: LockableUser): boolean {
  return !!u.lockedUntil && u.lockedUntil.getTime() > Date.now();
}

async function recordFailure(userId: string, field: "failedLogins" | "failedPins") {
  const u = await prisma.user.update({ where: { id: userId }, data: { [field]: { increment: 1 } } });
  if (u[field] >= MAX_FAILED_ATTEMPTS) {
    await prisma.user.update({ where: { id: userId }, data: { lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000), failedLogins: 0, failedPins: 0 } });
    await audit(userId, "account.locked", "User", userId);
  }
}

const LOCKED_MSG = `Too many wrong attempts. Try again in ${LOCK_MINUTES} minutes.`;

function outcome(u: { id: string; role: string; status: string }): AccountResult {
  if (u.status === "rejected") return { ok: false, error: "This facility account was not approved. Contact RioMed support." };
  return { ok: true, userId: u.id, role: u.role, status: u.status === "pending" ? "pending" : "active" };
}

export async function loginWithPassword(usernameRaw: unknown, password: unknown): Promise<AccountResult> {
  const generic: AccountResult = { ok: false, error: "Username or password is wrong." };
  const u = checkUsername(usernameRaw);
  const user = u.ok ? await prisma.user.findUnique({ where: { username: u.value } }) : null;
  if (!user || !user.passwordHash || typeof password !== "string") {
    await verifySecret(typeof password === "string" ? password : "", await DUMMY_HASH);
    return generic;
  }
  if (isLocked(user)) return { ok: false, error: LOCKED_MSG };
  if (!(await verifySecret(password, user.passwordHash))) {
    await recordFailure(user.id, "failedLogins");
    return generic;
  }
  await prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, failedPins: 0, lockedUntil: null } });
  await audit(user.id, "account.login.password", "User", user.id);
  return outcome(user);
}

/** PIN unlock for the user remembered on this device (the caller verifies the signed device cookie). */
export async function unlockWithPin(userId: string, pin: unknown): Promise<AccountResult & { forgetDevice?: boolean }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.pinHash || typeof pin !== "string") return { ok: false, error: "Sign in with your password.", forgetDevice: true };
  if (isLocked(user)) return { ok: false, error: LOCKED_MSG };
  if (!(await verifySecret(pin, user.pinHash))) {
    await recordFailure(user.id, "failedPins");
    const after = await prisma.user.findUnique({ where: { id: user.id }, select: { lockedUntil: true } });
    // After a lockout the device is forgotten: the next sign-in needs the password.
    if (after?.lockedUntil && after.lockedUntil.getTime() > Date.now()) return { ok: false, error: LOCKED_MSG, forgetDevice: true };
    return { ok: false, error: "Wrong PIN." };
  }
  await prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, failedPins: 0, lockedUntil: null } });
  await audit(user.id, "account.login.pin", "User", user.id);
  return outcome(user);
}

export async function getDeviceUserSummary(userId: string) {
  return prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true, name: true, role: true } });
}

// ---- Operator approval of facility accounts ----

export async function listPendingFacilityAccounts(actor: { userId: string; role: string } | null) {
  if (actor?.role !== "operator") return null;
  const rows = await prisma.user.findMany({ where: { status: "pending" }, include: { facility: true }, orderBy: { createdAt: "asc" } });
  return rows.map((u) => ({ id: u.id, username: u.username, name: u.name, facilityName: u.facility?.name ?? "?", createdAt: u.createdAt }));
}

export async function decideFacilityAccount(actor: { userId: string; role: string } | null, userId: string, approve: boolean) {
  if (actor?.role !== "operator") return false;
  const r = await prisma.user.updateMany({ where: { id: userId, status: "pending" }, data: { status: approve ? "active" : "rejected" } });
  if (r.count === 1) await audit(actor.userId, approve ? "account.approve" : "account.reject", "User", userId);
  return r.count === 1;
}

import "server-only";
import { cookies } from "next/headers";
import type { Actor, Role } from "@riomed/backend/core/access";
import { sign, verifySigned } from "@riomed/backend/server/auth";
import { findUser } from "@riomed/backend/server/queries";

/**
 * DEMO sign-in (PRD 15.1: auth is stubbed). A signed cookie holds a seeded user id.
 * Real phone OTP (FR-002) replaces this before any real user touches the app.
 */
const COOKIE = "rm_demo_session";

const DEVICE_COOKIE = "rm_device";

const base = () => ({ httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" });

/** Real accounts get a short session (30 min), after which "access dashboard" asks for the PIN again. */
export async function setSessionUser(userId: string, opts: { demo?: boolean } = {}) {
  (await cookies()).set(COOKIE, `${userId}.${sign(userId)}`, { ...base(), maxAge: opts.demo ? 60 * 60 * 12 : 30 * 60 });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

/** Remembers which account uses this device, so a PIN can unlock it (30 days). Holds no secret. */
export async function rememberDevice(userId: string) {
  (await cookies()).set(DEVICE_COOKIE, `${userId}.${sign(`device:${userId}`)}`, { ...base(), maxAge: 60 * 60 * 24 * 30 });
}

export async function forgetDevice() {
  (await cookies()).delete(DEVICE_COOKIE);
}

export async function getDeviceUserId(): Promise<string | null> {
  const raw = (await cookies()).get(DEVICE_COOKIE)?.value;
  if (!raw) return null;
  const i = raw.lastIndexOf(".");
  if (i <= 0) return null;
  const userId = raw.slice(0, i);
  return verifySigned(`device:${userId}`, raw.slice(i + 1)) ? userId : null;
}

export interface SessionUser extends Actor {
  name: string;
  /** Facility account waiting for operator approval: signed in, but no facility access. */
  pending: boolean;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const i = raw.lastIndexOf(".");
  if (i <= 0) return null;
  const userId = raw.slice(0, i);
  if (!verifySigned(userId, raw.slice(i + 1))) return null;
  const user = await findUser(userId);
  if (!user) return null;
  return { userId: user.id, role: user.role as Role, facilityId: user.facilityId, name: user.name, pending: user.pending };
}

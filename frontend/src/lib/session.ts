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

export async function setSessionUser(userId: string) {
  (await cookies()).set(COOKIE, `${userId}.${sign(userId)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export interface SessionUser extends Actor {
  name: string;
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
  return { userId: user.id, role: user.role as Role, facilityId: user.facilityId, name: user.name };
}

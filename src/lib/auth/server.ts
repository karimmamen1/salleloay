import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { ApiError } from "@/lib/api/server";
import { database } from "@/lib/db/client";
import { adminFromRow } from "@/lib/db/rows";
import type { AdminUser, UserRole } from "@/types";

const cookieName = "louay_session";
const sessionLifetimeSeconds = 7 * 24 * 60 * 60;
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionLifetimeSeconds * 1000);
  const sql = database();
  await sql`DELETE FROM sessions WHERE expires_at <= now()`;
  await sql`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (${tokenHash(token)}, ${userId}, ${expiresAt.toISOString()})`;
  const store = await cookies();
  store.set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionLifetimeSeconds,
    priority: "high",
  });
}

export async function deleteCurrentSession() {
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  if (token) await database()`DELETE FROM sessions WHERE token_hash = ${tokenHash(token)}`;
  store.delete(cookieName);
}

export async function revokeUserSessions(userId: string) {
  await database()`DELETE FROM sessions WHERE user_id = ${userId}`;
}

export async function getSessionUser(): Promise<AdminUser | null> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  const rows = await database()`
    SELECT u.id AS uid, u.name, u.username, u.username_lower, u.role, u.active, u.created_at, u.created_by
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${tokenHash(token)} AND s.expires_at > now() AND u.active = true
    LIMIT 1
  `;
  return rows[0] ? adminFromRow(rows[0] as Record<string, unknown>) : null;
}

export async function requireUser(requiredRole?: UserRole): Promise<AdminUser> {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, "unauthenticated");
  if (requiredRole && user.role !== requiredRole) throw new ApiError(403, "permission-denied");
  return user;
}


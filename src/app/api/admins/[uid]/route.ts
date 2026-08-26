import { z } from "zod";
import { ApiError, assertSameOrigin, jsonError } from "@/lib/api/server";
import { requireUser, revokeUserSessions } from "@/lib/auth/server";
import { database, isUniqueViolation } from "@/lib/db/client";
import { adminFromRow } from "@/lib/db/rows";

const uidSchema = z.string().uuid();
const usernameSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,32}$/);
const updateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  username: usernameSchema.optional(),
  active: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0);

async function uidFrom(context: { params: Promise<{ uid: string }> }) {
  const { uid } = await context.params;
  if (!uidSchema.safeParse(uid).success) throw new ApiError(400, "invalid-argument");
  return uid;
}
export async function GET(_request: Request, context: { params: Promise<{ uid: string }> }) {
  try {
    await requireUser("super_admin");
    const uid = await uidFrom(context);
    const rows = await database()`
      SELECT u.id AS uid, u.name, u.username, u.username_lower, u.role, u.active, u.created_at, u.created_by,
        count(r.reservation_date)::integer AS reservation_count
      FROM users u LEFT JOIN reservations r ON r.created_by_user_id = u.id
      WHERE u.id = ${uid}
      GROUP BY u.id LIMIT 1
    `;
    if (!rows[0]) throw new ApiError(404, "admin-not-found");
    return Response.json({ data: adminFromRow(rows[0] as Record<string, unknown>) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ uid: string }> }) {
  try {
    assertSameOrigin(request);
    const caller = await requireUser("super_admin");
    const uid = await uidFrom(context);
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) throw new ApiError(400, "invalid-argument");
    const changes = parsed.data;
    try {
      const rows = await database()`
        WITH updated AS (
          UPDATE users SET
            name = COALESCE(${changes.name ?? null}, name),
            username = COALESCE(${changes.username ?? null}, username),
            username_lower = COALESCE(${changes.username ?? null}, username_lower),
            active = COALESCE(${changes.active ?? null}, active),
            updated_at = now(), updated_by = ${caller.uid}
          WHERE id = ${uid} AND role = 'admin'
          RETURNING *
        ), logged AS (
          INSERT INTO audit_logs (action, performed_by_user_id, performed_by_name, target_user_id)
          SELECT CASE
            WHEN ${typeof changes.active === "boolean"} THEN CASE WHEN active THEN 'admin_enabled' ELSE 'admin_disabled' END
            ELSE 'admin_updated'
          END, ${caller.uid}, ${caller.name}, id FROM updated
        )
        SELECT id AS uid, name, username, username_lower, role, active, created_at, created_by FROM updated
      `;
      if (!rows[0]) throw new ApiError(403, "protected-account");
      if (changes.active === false) await revokeUserSessions(uid);
      return Response.json({ data: adminFromRow(rows[0] as Record<string, unknown>) });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ApiError(409, "username-exists");
      throw error;
    }
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ uid: string }> }) {
  try {
    assertSameOrigin(request);
    const caller = await requireUser("super_admin");
    const uid = await uidFrom(context);
    if (uid === caller.uid) throw new ApiError(403, "protected-account");
    const rows = await database()`
      WITH deleted AS (
        DELETE FROM users WHERE id = ${uid} AND role = 'admin' RETURNING *
      ), logged AS (
        INSERT INTO audit_logs (action, performed_by_user_id, performed_by_name, target_user_id, snapshot)
        SELECT 'admin_deleted', ${caller.uid}, ${caller.name}, id, to_jsonb(deleted) - 'password_hash' FROM deleted
      )
      SELECT id FROM deleted
    `;
    if (!rows[0]) throw new ApiError(403, "protected-account");
    return Response.json({ data: { uid } });
  } catch (error) {
    return jsonError(error);
  }
}

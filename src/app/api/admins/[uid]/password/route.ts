import { hash } from "bcryptjs";
import { z } from "zod";
import { ApiError, assertSameOrigin, jsonError } from "@/lib/api/server";
import { requireUser, revokeUserSessions } from "@/lib/auth/server";
import { database } from "@/lib/db/client";

const passwordSchema = z.string().min(10).max(128)
  .regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/);

export async function POST(request: Request, context: { params: Promise<{ uid: string }> }) {
  try {
    assertSameOrigin(request);
    const caller = await requireUser("super_admin");
    const { uid } = await context.params;
    if (!z.string().uuid().safeParse(uid).success) throw new ApiError(400, "invalid-argument");
    const parsed = z.object({ password: passwordSchema }).safeParse(await request.json());
    if (!parsed.success) throw new ApiError(400, "weak-password");
    const passwordHash = await hash(parsed.data.password, 12);
    const rows = await database()`
      WITH updated AS (
        UPDATE users SET password_hash = ${passwordHash}, updated_at = now(), updated_by = ${caller.uid}
        WHERE id = ${uid} AND (role = 'admin' OR id = ${caller.uid}) RETURNING id
      ), logged AS (
        INSERT INTO audit_logs (action, performed_by_user_id, performed_by_name, target_user_id)
        SELECT 'admin_password_reset', ${caller.uid}, ${caller.name}, id FROM updated
      )
      SELECT id FROM updated
    `;
    if (!rows[0]) throw new ApiError(403, "protected-account");
    await revokeUserSessions(uid);
    return Response.json({ data: { uid } });
  } catch (error) {
    return jsonError(error);
  }
}

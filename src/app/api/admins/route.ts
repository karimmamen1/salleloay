import { hash } from "bcryptjs";
import { z } from "zod";
import { ApiError, assertSameOrigin, jsonError } from "@/lib/api/server";
import { requireUser } from "@/lib/auth/server";
import { database, isUniqueViolation } from "@/lib/db/client";
import { adminFromRow } from "@/lib/db/rows";

const usernameSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,32}$/);
const passwordSchema = z.string().min(10).max(128)
  .regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/);
const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  username: usernameSchema,
  password: passwordSchema,
});

export async function GET() {
  try {
    await requireUser("super_admin");
    const rows = await database()`
      SELECT u.id AS uid, u.name, u.username, u.username_lower, u.role, u.active, u.created_at, u.created_by,
        count(r.reservation_date)::integer AS reservation_count
      FROM users u
      LEFT JOIN reservations r ON r.created_by_user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `;
    return Response.json({ data: rows.map((row) => adminFromRow(row as Record<string, unknown>)) });
  } catch (error) {
    return jsonError(error);
  }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const caller = await requireUser("super_admin");
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      const weakPassword = parsed.error.issues.some((issue) => issue.path[0] === "password");
      throw new ApiError(400, weakPassword ? "weak-password" : "invalid-argument");
    }
    const { name, username, password } = parsed.data;
    const passwordHash = await hash(password, 12);
    try {
      const rows = await database()`
        WITH inserted AS (
          INSERT INTO users (name, username, username_lower, password_hash, role, active, created_by)
          VALUES (${name}, ${username}, ${username}, ${passwordHash}, 'admin', true, ${caller.uid})
          RETURNING *
        ), logged AS (
          INSERT INTO audit_logs (action, performed_by_user_id, performed_by_name, target_user_id)
          SELECT 'admin_created', ${caller.uid}, ${caller.name}, id FROM inserted
        )
        SELECT id AS uid, name, username, username_lower, role, active, created_at, created_by FROM inserted
      `;
      return Response.json({ data: adminFromRow(rows[0] as Record<string, unknown>) }, { status: 201 });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ApiError(409, "username-exists");
      throw error;
    }
  } catch (error) {
    return jsonError(error);
  }
}

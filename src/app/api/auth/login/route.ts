import { createHash } from "node:crypto";
import { compare } from "bcryptjs";
import { z } from "zod";
import { ApiError, assertSameOrigin, jsonError } from "@/lib/api/server";
import { createSession } from "@/lib/auth/server";
import { database } from "@/lib/db/client";
import { adminFromRow } from "@/lib/db/rows";

const schema = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,32}$/),
  password: z.string().min(1).max(128),
});
const dummyPasswordHash = "$2b$12$EnIMSbNYVnjVKYktX7FKjOaBhSw02xgjknzsY86w5TI2UAPbhE0Q.";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) throw new ApiError(401, "invalid-credentials");

    const { username, password } = parsed.data;
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const attemptKey = createHash("sha256").update(`${username}\0${ip}`).digest("hex");
    const sql = database();
    const attempts = await sql`SELECT locked_until FROM login_attempts WHERE attempt_key = ${attemptKey}`;
    if (attempts[0]?.locked_until && new Date(String(attempts[0].locked_until)).getTime() > Date.now()) {
      throw new ApiError(429, "too-many-attempts");
    }

    const rows = await sql`
      SELECT id AS uid, name, username, username_lower, password_hash, role, active, created_at, created_by
      FROM users WHERE username_lower = ${username} LIMIT 1
    `;
    const row = rows[0] as Record<string, unknown> | undefined;
    const validPassword = await compare(password, row ? String(row.password_hash) : dummyPasswordHash);
    if (!row || !validPassword) {
      await sql`
        INSERT INTO login_attempts (attempt_key, attempts, window_started_at, locked_until)
        VALUES (${attemptKey}, 1, now(), NULL)
        ON CONFLICT (attempt_key) DO UPDATE SET
          attempts = CASE WHEN login_attempts.window_started_at < now() - interval '15 minutes' THEN 1 ELSE login_attempts.attempts + 1 END,
          window_started_at = CASE WHEN login_attempts.window_started_at < now() - interval '15 minutes' THEN now() ELSE login_attempts.window_started_at END,
          locked_until = CASE
            WHEN login_attempts.window_started_at >= now() - interval '15 minutes' AND login_attempts.attempts + 1 >= 5 THEN now() + interval '15 minutes'
            ELSE NULL
          END
      `;
      throw new ApiError(401, "invalid-credentials");
    }
    if (row.active !== true) throw new ApiError(403, "account-disabled");

    await sql`DELETE FROM login_attempts WHERE attempt_key = ${attemptKey}`;
    await createSession(String(row.uid));
    return Response.json({ data: adminFromRow(row) });
  } catch (error) {
    return jsonError(error);
  }
}

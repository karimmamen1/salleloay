import { jsonError } from "@/lib/api/server";
import { requireUser } from "@/lib/auth/server";
import { database } from "@/lib/db/client";
import { auditFromRow } from "@/lib/db/rows";

export async function GET() {
  try {
    await requireUser("super_admin");
    const rows = await database()`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 300`;
    return Response.json({ data: rows.map((row) => auditFromRow(row as Record<string, unknown>)) });
  } catch (error) {
    return jsonError(error);
  }
}

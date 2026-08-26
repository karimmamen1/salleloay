import { z } from "zod";
import { AdminApiError, adminAuth, auditRecord, createWrite, firestoreCommit, firestoreGet, jsonError, randomDocumentPath, requireSuperAdmin, withAdminContext } from "@/lib/firebase/admin-server";

const passwordSchema = z.string().min(10).max(128)
  .regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/);

export async function POST(request: Request, context: { params: Promise<{ uid: string }> }) {
  return withAdminContext(request, async () => {
  try {
    const caller = await requireSuperAdmin(request);
    const { uid } = await context.params;
    const parsed = z.object({ password: passwordSchema }).safeParse(await request.json());
    if (!parsed.success) throw new AdminApiError(400, "weak-password");

    const target = await firestoreGet(`users/${uid}`);
    if (!target) throw new AdminApiError(404, "admin-not-found");
    if (target.role !== "admin") throw new AdminApiError(403, "protected-account");

    await adminAuth().updateUser(uid, { password: parsed.data.password });
    await firestoreCommit([createWrite(randomDocumentPath("auditLogs"), auditRecord(caller, "admin_password_reset", {
      targetUserId: uid,
      targetUserName: target.name,
    }))]);
    return Response.json({ data: { uid } });
  } catch (error) {
    return jsonError(error);
  }
  });
}

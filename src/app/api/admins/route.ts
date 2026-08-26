import { z } from "zod";
import { AdminApiError, adminAuth, auditRecord, createWrite, firestoreCommit, firestoreGet, jsonError, randomDocumentPath, requireSuperAdmin, serverTimestamp } from "@/lib/firebase/admin-server";

const usernameSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,32}$/);
const passwordSchema = z.string().min(10).max(128)
  .regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/);
const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  username: usernameSchema,
  password: passwordSchema,
});

export async function POST(request: Request) {
  let createdUid: string | undefined;
  try {
    const caller = await requireSuperAdmin(request);
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      const weakPassword = parsed.error.issues.some((issue) => issue.path[0] === "password");
      throw new AdminApiError(400, weakPassword ? "weak-password" : "invalid-argument");
    }

    const { name, username, password } = parsed.data;
    if (await firestoreGet(`usernames/${username}`)) throw new AdminApiError(409, "username-exists");

    const user = await adminAuth().createUser({
      email: `${username}@auth.salle-loay.local`,
      password,
      displayName: name,
      emailVerified: true,
      disabled: false,
    });
    createdUid = user.uid;
    await adminAuth().setCustomUserClaims(user.uid, { role: "admin" });

    await firestoreCommit([
      createWrite(`usernames/${username}`, { uid: user.uid, createdAt: serverTimestamp }),
      createWrite(`users/${user.uid}`, {
      name,
      username,
      usernameLower: username,
      role: "admin",
      active: true,
      createdAt: serverTimestamp,
      createdBy: caller.uid,
      }),
      createWrite(randomDocumentPath("auditLogs"), auditRecord(caller, "admin_created", {
        targetUserId: user.uid,
        targetUserName: name,
      })),
    ]);
    return Response.json({ data: { uid: user.uid, name, username, role: "admin", active: true } }, { status: 201 });
  } catch (error) {
    if (createdUid) {
      try { await adminAuth().deleteUser(createdUid); } catch { /* Best-effort rollback. */ }
    }
    return jsonError(error);
  }
}

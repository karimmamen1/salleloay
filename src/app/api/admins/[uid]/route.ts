import { z } from "zod";
import { AdminApiError, adminAuth, auditRecord, createWrite, deleteWrite, firestoreCommit, firestoreGet, jsonError, randomDocumentPath, requireSuperAdmin, serverTimestamp, updateWrite } from "@/lib/firebase/admin-server";

const usernameSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,32}$/);
const updateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  username: usernameSchema.optional(),
  active: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0);

async function normalAdmin(uid: string) {
  const data = await firestoreGet(`users/${uid}`);
  if (!data) throw new AdminApiError(404, "admin-not-found");
  if (data.role !== "admin") throw new AdminApiError(403, "protected-account");
  return data;
}

export async function PATCH(request: Request, context: { params: Promise<{ uid: string }> }) {
  try {
    const caller = await requireSuperAdmin(request);
    const { uid } = await context.params;
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) throw new AdminApiError(400, "invalid-argument");
    const before = await normalAdmin(uid);
    const oldData = before;
    const changes = parsed.data;
    const auth = adminAuth();
    const oldUsername = String(oldData.usernameLower);
    const newUsername = changes.username || oldUsername;

    if (newUsername !== oldUsername) {
      const existing = await firestoreGet(`usernames/${newUsername}`);
      if (existing && existing.uid !== uid) throw new AdminApiError(409, "username-exists");
      try {
        const existingAuth = await auth.getUserByEmail(`${newUsername}@auth.salle-loay.local`);
        if (existingAuth.uid !== uid) throw new AdminApiError(409, "username-exists");
      } catch (error) {
        if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
      }
    }

    const authUpdate = {
      ...(changes.name ? { displayName: changes.name } : {}),
      ...(newUsername !== oldUsername ? { email: `${newUsername}@auth.salle-loay.local` } : {}),
      ...(typeof changes.active === "boolean" ? { disabled: !changes.active } : {}),
    };
    await auth.updateUser(uid, authUpdate);

    try {
      const writes = [];
      if (newUsername !== oldUsername) {
        writes.push(createWrite(`usernames/${newUsername}`, { uid, createdAt: serverTimestamp }));
        writes.push(deleteWrite(`usernames/${oldUsername}`));
      }
      const profileChanges = {
        ...(changes.name ? { name: changes.name } : {}),
        ...(newUsername !== oldUsername ? { username: newUsername, usernameLower: newUsername } : {}),
        ...(typeof changes.active === "boolean" ? { active: changes.active } : {}),
        updatedAt: serverTimestamp,
        updatedBy: caller.uid,
      };
      writes.push(updateWrite(`users/${uid}`, profileChanges));
      const action = typeof changes.active === "boolean"
        ? (changes.active ? "admin_enabled" : "admin_disabled")
        : "admin_updated";
      writes.push(createWrite(randomDocumentPath("auditLogs"), auditRecord(caller, action, {
        targetUserId: uid,
        targetUserName: changes.name || oldData.name,
      })));
      await firestoreCommit(writes);
    } catch (error) {
      await auth.updateUser(uid, {
        displayName: String(oldData.name),
        email: `${oldUsername}@auth.salle-loay.local`,
        disabled: oldData.active !== true,
      });
      throw error;
    }
    return Response.json({ data: { uid } });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ uid: string }> }) {
  try {
    const caller = await requireSuperAdmin(request);
    const { uid } = await context.params;
    if (uid === caller.uid) throw new AdminApiError(403, "protected-account");
    const target = await normalAdmin(uid);
    const data = target;
    await adminAuth().deleteUser(uid);

    await firestoreCommit([
      deleteWrite(`users/${uid}`),
      deleteWrite(`usernames/${data.usernameLower}`),
      createWrite(randomDocumentPath("auditLogs"), auditRecord(caller, "admin_deleted", {
        targetUserId: uid,
        targetUserName: data.name,
      })),
    ]);
    return Response.json({ data: { uid } });
  } catch (error) {
    return jsonError(error);
  }
}

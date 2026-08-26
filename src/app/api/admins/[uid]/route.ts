import { z } from "zod";
import { AdminApiError, auditRecord, createWrite, deleteAuthUser, deleteWrite, firestoreCommit, firestoreGet, getAuthUserByEmail, jsonError, randomDocumentPath, requireSuperAdmin, serverTimestamp, updateAuthUser, updateWrite, withAdminContext } from "@/lib/firebase/admin-server";

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
  return withAdminContext(request, async () => {
    try {
      const caller = await requireSuperAdmin(request);
      const { uid } = await context.params;
      const parsed = updateSchema.safeParse(await request.json());
      if (!parsed.success) throw new AdminApiError(400, "invalid-argument");
      const oldData = await normalAdmin(uid);
      const changes = parsed.data;
      const oldUsername = String(oldData.usernameLower);
      const newUsername = changes.username || oldUsername;

      if (newUsername !== oldUsername) {
        const existing = await firestoreGet(`usernames/${newUsername}`);
        if (existing && existing.uid !== uid) throw new AdminApiError(409, "username-exists");
        const existingAuth = await getAuthUserByEmail(`${newUsername}@auth.salle-loay.local`);
        if (existingAuth && existingAuth.localId !== uid) throw new AdminApiError(409, "username-exists");
      }

      const authUpdate = {
        ...(changes.name ? { displayName: changes.name } : {}),
        ...(newUsername !== oldUsername ? { email: `${newUsername}@auth.salle-loay.local` } : {}),
        ...(typeof changes.active === "boolean" ? { disabled: !changes.active } : {}),
      };
      await updateAuthUser(uid, authUpdate);

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
        await updateAuthUser(uid, {
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
  });
}

export async function DELETE(request: Request, context: { params: Promise<{ uid: string }> }) {
  return withAdminContext(request, async () => {
    try {
      const caller = await requireSuperAdmin(request);
      const { uid } = await context.params;
      if (uid === caller.uid) throw new AdminApiError(403, "protected-account");
      const data = await normalAdmin(uid);
      await deleteAuthUser(uid);

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
  });
}

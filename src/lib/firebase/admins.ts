import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { auth, db } from "./client";
import type { AdminUser } from "@/types";

export const listenToAdmins = (next: (items: AdminUser[]) => void) => onSnapshot(query(collection(db, "users"), orderBy("createdAt", "desc")), (snapshot) => next(snapshot.docs.map((item) => ({ uid: item.id, ...item.data() }) as AdminUser)));

export const listenToReservationCounts = (next: (counts: Record<string, number>) => void) => onSnapshot(collection(db, "reservations"), (snapshot) => {
  const counts: Record<string, number> = {};
  snapshot.forEach((item) => {
    const uid = String(item.data().createdByUserId || "");
    if (uid) counts[uid] = (counts[uid] || 0) + 1;
  });
  next(counts);
});

export class AdminRequestError extends Error {
  constructor(public readonly code: string) { super(code); }
}

async function adminRequest<T>(path: string, method: "POST" | "PATCH" | "DELETE", body?: unknown): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new AdminRequestError("unauthenticated");
  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json().catch(() => ({})) as { data?: T; error?: { code?: string } };
  if (!response.ok) throw new AdminRequestError(result.error?.code || "internal");
  return result.data as T;
}

export const createAdmin = (data: { name: string; username: string; password: string }) => adminRequest<{ uid: string }>("/api/admins", "POST", data);
export const updateAdmin = (uid: string, data: { name?: string; username?: string; active?: boolean }) => adminRequest<void>(`/api/admins/${encodeURIComponent(uid)}`, "PATCH", data);
export const resetAdminPassword = (uid: string, password: string) => adminRequest<void>(`/api/admins/${encodeURIComponent(uid)}/password`, "POST", { password });
export const removeAdmin = (uid: string) => adminRequest<void>(`/api/admins/${encodeURIComponent(uid)}`, "DELETE");

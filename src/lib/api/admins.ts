import { ApiRequestError, apiRequest, pollApi } from "./client";
import type { AdminUser } from "@/types";

export class AdminRequestError extends Error {
  constructor(public readonly code: string) { super(code); }
}

const translateError = (reason: unknown): never => {
  if (reason instanceof ApiRequestError) throw new AdminRequestError(reason.code);
  throw reason;
};

export const listenToAdmins = (next: (items: AdminUser[]) => void, error?: (reason: Error) => void) =>
  pollApi<AdminUser[]>("/api/admins", next, error);

export const listenToReservationCounts = (next: (counts: Record<string, number>) => void, error?: (reason: Error) => void) =>
  pollApi<AdminUser[]>("/api/admins", (items) => next(Object.fromEntries(items.map((item) => [item.uid, item.reservationCount || 0]))), error);

export const createAdmin = (data: { name: string; username: string; password: string }) =>
  apiRequest<AdminUser>("/api/admins", { method: "POST", body: JSON.stringify(data) }).catch(translateError);

export const updateAdmin = (uid: string, data: { name?: string; username?: string; active?: boolean }) =>
  apiRequest<AdminUser>(`/api/admins/${encodeURIComponent(uid)}`, { method: "PATCH", body: JSON.stringify(data) }).catch(translateError);

export const resetAdminPassword = (uid: string, password: string) =>
  apiRequest<{ uid: string }>(`/api/admins/${encodeURIComponent(uid)}/password`, { method: "POST", body: JSON.stringify({ password }) }).catch(translateError);

export const removeAdmin = (uid: string) =>
  apiRequest<{ uid: string }>(`/api/admins/${encodeURIComponent(uid)}`, { method: "DELETE" }).catch(translateError);

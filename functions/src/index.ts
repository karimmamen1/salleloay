import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { defineBoolean } from "firebase-functions/params";
import { z } from "zod";

initializeApp();
const db = getFirestore();
const auth = getAuth();
const region = "europe-west1";
const enforceAppCheck = defineBoolean("ENFORCE_APP_CHECK", { default: false, description: "Reject callable requests without a valid Firebase App Check token." });
const callable = { region, enforceAppCheck, cors: true } as const;

const reservationSchema = z.object({
  reservationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), customerName: z.string().trim().min(2).max(120), phone: z.string().trim().regex(/^(\+213|0)[5-7][0-9]{8}$/), eventType: z.enum(["wedding", "engagement", "circumcision", "birthday", "reception", "other"]), customEventType: z.string().trim().max(80).nullable().optional(), guestCount: z.number().int().min(0), totalCost: z.number().min(0), advancePayment: z.number().min(0), cookName: z.string().trim().max(120).optional(), cookCost: z.number().min(0), serverCount: z.number().int().min(0), cleaningCost: z.number().min(0),
}).refine((data) => data.advancePayment <= data.totalCost).refine((data) => data.eventType !== "other" || Boolean(data.customEventType));
const usernameSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,32}$/);
const passwordSchema = z.string().min(10).max(128);
const todayAlgiers = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Algiers", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

interface Caller { uid: string; name: string; role: "super_admin" | "admin"; }
async function requireCaller(request: { auth?: { uid: string; token: Record<string, unknown> } }, superOnly = false): Promise<Caller> {
  if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required.");
  const snapshot = await db.doc(`users/${request.auth.uid}`).get();
  if (!snapshot.exists || snapshot.data()?.active !== true) throw new HttpsError("permission-denied", "Account disabled.");
  const profile = snapshot.data()!;
  if (superOnly && (request.auth.token.role !== "super_admin" || profile.role !== "super_admin")) throw new HttpsError("permission-denied", "Super admin required.");
  return { uid: request.auth.uid, name: String(profile.name), role: profile.role } as Caller;
}
const audit = (caller: Caller, action: string, extra: Record<string, unknown> = {}) => ({ action, performedByUserId: caller.uid, performedByName: caller.name, timestamp: FieldValue.serverTimestamp(), ...extra });

export const createReservation = onCall(callable, async (request) => {
  const caller = await requireCaller(request); const input = reservationSchema.safeParse(request.data);
  if (!input.success) throw new HttpsError("invalid-argument", "Invalid reservation.");
  const date = input.data.reservationDate;
  if (date < todayAlgiers()) throw new HttpsError("failed-precondition", "Past reservations are not allowed.");
  await db.runTransaction(async (transaction) => {
    const reference = db.doc(`reservations/${date}`); if ((await transaction.get(reference)).exists) throw new HttpsError("already-exists", "date-reserved");
    const data = { ...input.data, customEventType: input.data.eventType === "other" ? input.data.customEventType : null, createdByUserId: caller.uid, createdByName: caller.name, createdAt: FieldValue.serverTimestamp(), updatedByUserId: caller.uid, updatedByName: caller.name, updatedAt: FieldValue.serverTimestamp() };
    transaction.create(reference, data); transaction.create(db.collection("auditLogs").doc(), audit(caller, "reservation_created", { reservationId: date }));
  }); return { id: date };
});

export const updateReservation = onCall(callable, async (request) => {
  const caller = await requireCaller(request); const body = z.object({ originalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), reservation: reservationSchema }).safeParse(request.data);
  if (!body.success) throw new HttpsError("invalid-argument", "Invalid reservation.");
  const { originalDate, reservation } = body.data; const newDate = reservation.reservationDate;
  if (newDate !== originalDate && newDate < todayAlgiers()) throw new HttpsError("failed-precondition", "Cannot move a reservation into the past.");
  await db.runTransaction(async (transaction) => {
    const oldRef = db.doc(`reservations/${originalDate}`); const oldSnap = await transaction.get(oldRef); if (!oldSnap.exists) throw new HttpsError("not-found", "Reservation not found.");
    if (newDate !== originalDate) { const newRef = db.doc(`reservations/${newDate}`); if ((await transaction.get(newRef)).exists) throw new HttpsError("already-exists", "date-reserved"); transaction.create(newRef, { ...oldSnap.data(), ...reservation, customEventType: reservation.eventType === "other" ? reservation.customEventType : null, updatedByUserId: caller.uid, updatedByName: caller.name, updatedAt: FieldValue.serverTimestamp() }); transaction.delete(oldRef); }
    else transaction.update(oldRef, { ...reservation, customEventType: reservation.eventType === "other" ? reservation.customEventType : null, updatedByUserId: caller.uid, updatedByName: caller.name, updatedAt: FieldValue.serverTimestamp() });
    const changedFields = Object.keys(reservation).filter((key) => oldSnap.data()?.[key] !== reservation[key as keyof typeof reservation]);
    transaction.create(db.collection("auditLogs").doc(), audit(caller, "reservation_updated", { reservationId: newDate, previousReservationId: originalDate, changedFields }));
  }); return { id: newDate };
});

export const deleteReservation = onCall(callable, async (request) => {
  const caller = await requireCaller(request, true); const parsed = z.object({ reservationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).safeParse(request.data); if (!parsed.success) throw new HttpsError("invalid-argument", "Invalid date.");
  await db.runTransaction(async (transaction) => { const ref = db.doc(`reservations/${parsed.data.reservationDate}`); const snap = await transaction.get(ref); if (!snap.exists) throw new HttpsError("not-found", "Reservation not found."); transaction.delete(ref); transaction.create(db.collection("auditLogs").doc(), audit(caller, "reservation_deleted", { reservationId: parsed.data.reservationDate, snapshot: snap.data() })); });
});

export const createAdmin = onCall(callable, async (request) => {
  const caller = await requireCaller(request, true); const parsed = z.object({ name: z.string().trim().min(2).max(120), username: usernameSchema, password: passwordSchema }).safeParse(request.data); if (!parsed.success) throw new HttpsError("invalid-argument", "Invalid administrator.");
  const { name, username, password } = parsed.data; const email = `${username}@auth.salle-loay.local`; let user;
  try { user = await auth.createUser({ email, password, displayName: name, emailVerified: true, disabled: false }); } catch (error) { if ((error as { code?: string }).code === "auth/email-already-exists") throw new HttpsError("already-exists", "Username exists."); throw error; }
  try { await auth.setCustomUserClaims(user.uid, { role: "admin" }); const batch = db.batch(); batch.create(db.doc(`usernames/${username}`), { uid: user.uid, createdAt: FieldValue.serverTimestamp() }); batch.create(db.doc(`users/${user.uid}`), { name, username, usernameLower: username, role: "admin", active: true, createdAt: FieldValue.serverTimestamp(), createdBy: caller.uid }); batch.create(db.collection("auditLogs").doc(), audit(caller, "admin_created", { targetUserId: user.uid })); await batch.commit(); } catch (error) { await auth.deleteUser(user.uid); throw error; }
  return { uid: user.uid };
});

export const updateAdmin = onCall(callable, async (request) => {
  const caller = await requireCaller(request, true); const parsed = z.object({ uid: z.string().min(1), data: z.object({ name: z.string().trim().min(2).max(120).optional(), active: z.boolean().optional() }) }).safeParse(request.data); if (!parsed.success || parsed.data.uid === caller.uid) throw new HttpsError("invalid-argument", "Invalid administrator update.");
  const before = await db.doc(`users/${parsed.data.uid}`).get(); if (!before.exists || before.data()?.role === "super_admin") throw new HttpsError("permission-denied", "Cannot modify this account.");
  const data = parsed.data.data; await auth.updateUser(parsed.data.uid, { ...(data.name ? { displayName: data.name } : {}), ...(typeof data.active === "boolean" ? { disabled: !data.active } : {}) });
  const action = typeof data.active === "boolean" ? (data.active ? "admin_enabled" : "admin_disabled") : "admin_updated"; const batch = db.batch(); batch.update(before.ref, { ...data, updatedAt: FieldValue.serverTimestamp(), updatedBy: caller.uid }); batch.create(db.collection("auditLogs").doc(), audit(caller, action, { targetUserId: parsed.data.uid })); await batch.commit();
});

export const resetAdminPassword = onCall(callable, async (request) => {
  const caller = await requireCaller(request, true); const parsed = z.object({ uid: z.string().min(1), password: passwordSchema }).safeParse(request.data); if (!parsed.success || parsed.data.uid === caller.uid) throw new HttpsError("invalid-argument", "Invalid password reset.");
  const target = await db.doc(`users/${parsed.data.uid}`).get(); if (!target.exists || target.data()?.role === "super_admin") throw new HttpsError("permission-denied", "Cannot reset this account."); await auth.updateUser(parsed.data.uid, { password: parsed.data.password }); await db.collection("auditLogs").add(audit(caller, "admin_password_reset", { targetUserId: parsed.data.uid }));
});

export const deleteAdmin = onCall(callable, async (request) => {
  const caller = await requireCaller(request, true); const parsed = z.object({ uid: z.string().min(1) }).safeParse(request.data); if (!parsed.success || parsed.data.uid === caller.uid) throw new HttpsError("invalid-argument", "Invalid administrator.");
  const ref = db.doc(`users/${parsed.data.uid}`); const snapshot = await ref.get(); if (!snapshot.exists || snapshot.data()?.role === "super_admin") throw new HttpsError("permission-denied", "Cannot delete this account."); await auth.deleteUser(parsed.data.uid); const batch = db.batch(); batch.delete(ref); batch.delete(db.doc(`usernames/${snapshot.data()?.usernameLower}`)); batch.create(db.collection("auditLogs").doc(), audit(caller, "admin_deleted", { targetUserId: parsed.data.uid, snapshot: snapshot.data() })); await batch.commit();
});

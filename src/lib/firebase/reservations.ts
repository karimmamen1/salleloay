import { collection, doc, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, where, type Transaction, type Unsubscribe } from "firebase/firestore";
import { auth, db } from "./client";
import type { Reservation, ReservationInput } from "@/types";

export function listenToMonth(monthStart: string, monthEnd: string, next: (items: Reservation[]) => void, error?: (error: Error) => void): Unsubscribe {
  const q = query(collection(db, "reservations"), where("reservationDate", ">=", monthStart), where("reservationDate", "<=", monthEnd), orderBy("reservationDate"));
  return onSnapshot(q, (snapshot) => next(snapshot.docs.map((item) => item.data() as Reservation)), error);
}

export function listenToAllReservations(next: (items: Reservation[]) => void, error?: (error: Error) => void): Unsubscribe {
  return onSnapshot(query(collection(db, "reservations"), orderBy("reservationDate", "desc")), (snapshot) => next(snapshot.docs.map((item) => item.data() as Reservation)), error);
}

export function listenToUpcoming(fromDate: string, count: number, next: (items: Reservation[]) => void): Unsubscribe {
  const q = query(collection(db, "reservations"), where("reservationDate", ">=", fromDate), orderBy("reservationDate"), limit(count));
  return onSnapshot(q, (snapshot) => next(snapshot.docs.map((item) => item.data() as Reservation)));
}

async function currentProfile(transaction: Transaction) {
  const user = auth.currentUser;
  if (!user) throw new Error("unauthenticated");
  const snapshot = await transaction.get(doc(db, "users", user.uid));
  if (!snapshot.exists() || snapshot.data().active !== true) throw new Error("account-disabled");
  return { uid: user.uid, name: String(snapshot.data().name), role: String(snapshot.data().role) };
}

export async function createReservation(data: ReservationInput) {
  await runTransaction(db, async (transaction) => {
    const profile = await currentProfile(transaction);
    const reference = doc(db, "reservations", data.reservationDate);
    if ((await transaction.get(reference)).exists()) throw new Error("date-reserved");
    transaction.set(reference, {
      ...data,
      cookName: data.cookName || "",
      customEventType: data.eventType === "other" ? data.customEventType || "" : null,
      createdByUserId: profile.uid,
      createdByName: profile.name,
      createdAt: serverTimestamp(),
      updatedByUserId: profile.uid,
      updatedByName: profile.name,
      updatedAt: serverTimestamp(),
    });
    transaction.set(doc(collection(db, "auditLogs")), { action: "reservation_created", performedByUserId: profile.uid, performedByName: profile.name, reservationId: data.reservationDate, timestamp: serverTimestamp() });
  });
  return { data: { id: data.reservationDate } };
}

export async function updateReservation(originalDate: string, data: ReservationInput) {
  await runTransaction(db, async (transaction) => {
    const profile = await currentProfile(transaction);
    const oldReference = doc(db, "reservations", originalDate);
    const oldSnapshot = await transaction.get(oldReference);
    if (!oldSnapshot.exists()) throw new Error("reservation-not-found");
    const update = { ...oldSnapshot.data(), ...data, cookName: data.cookName || "", customEventType: data.eventType === "other" ? data.customEventType || "" : null, updatedByUserId: profile.uid, updatedByName: profile.name, updatedAt: serverTimestamp() };
    if (originalDate !== data.reservationDate) {
      if (profile.role !== "super_admin") throw new Error("date-move-requires-super-admin");
      const newReference = doc(db, "reservations", data.reservationDate);
      if ((await transaction.get(newReference)).exists()) throw new Error("date-reserved");
      transaction.set(newReference, update);
      transaction.delete(oldReference);
    } else transaction.set(oldReference, update);
    transaction.set(doc(collection(db, "auditLogs")), { action: "reservation_updated", performedByUserId: profile.uid, performedByName: profile.name, reservationId: data.reservationDate, previousReservationId: originalDate, timestamp: serverTimestamp() });
  });
  return { data: { id: data.reservationDate } };
}

export async function deleteReservation(reservationDate: string) {
  await runTransaction(db, async (transaction) => {
    const profile = await currentProfile(transaction);
    if (profile.role !== "super_admin") throw new Error("permission-denied");
    const reference = doc(db, "reservations", reservationDate);
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists()) throw new Error("reservation-not-found");
    transaction.delete(reference);
    transaction.set(doc(collection(db, "auditLogs")), { action: "reservation_deleted", performedByUserId: profile.uid, performedByName: profile.name, reservationId: reservationDate, timestamp: serverTimestamp() });
  });
}

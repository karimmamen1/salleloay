import { apiRequest, pollApi } from "./client";
import type { Reservation, ReservationInput } from "@/types";

export function listenToMonth(monthStart: string, monthEnd: string, next: (items: Reservation[]) => void, error?: (reason: Error) => void) {
  return pollApi(`/api/reservations?from=${encodeURIComponent(monthStart)}&to=${encodeURIComponent(monthEnd)}&limit=300`, next, error);
}

export function listenToAllReservations(next: (items: Reservation[]) => void, error?: (reason: Error) => void) {
  return pollApi("/api/reservations?limit=300", next, error);
}

export function listenToUpcoming(fromDate: string, count: number, next: (items: Reservation[]) => void, error?: (reason: Error) => void) {
  return pollApi(`/api/reservations?from=${encodeURIComponent(fromDate)}&upcoming=true&limit=${count}`, next, error);
}

export function listenToReservation(id: string, next: (item: Reservation | null) => void, error?: (reason: Error) => void) {
  return pollApi<Reservation>(`/api/reservations/${encodeURIComponent(id)}`, next, (reason) => {
    if ("status" in reason && reason.status === 404) next(null);
    else error?.(reason);
  });
}

export async function createReservation(data: ReservationInput) {
  const result = await apiRequest<{ id: string }>("/api/reservations", { method: "POST", body: JSON.stringify(data) });
  return { data: result };
}

export async function updateReservation(originalDate: string, data: ReservationInput) {
  const result = await apiRequest<{ id: string }>(`/api/reservations/${encodeURIComponent(originalDate)}`, { method: "PATCH", body: JSON.stringify(data) });
  return { data: result };
}

export async function deleteReservation(reservationDate: string) {
  return apiRequest<{ id: string }>(`/api/reservations/${encodeURIComponent(reservationDate)}`, { method: "DELETE" });
}

"use client";
import { useEffect, useState } from "react";
import { listenToAllReservations, listenToMonth, listenToUpcoming } from "@/lib/firebase/reservations";
import type { Reservation } from "@/types";

export function useMonthReservations(start: string, end: string) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => listenToMonth(start, end, (items) => { setReservations(items); setLoading(false); }, (reason) => { setError(reason); setLoading(false); }), [start, end]);
  return { reservations, loading, error };
}

export function useAllReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => listenToAllReservations((items) => { setReservations(items); setLoading(false); }, () => setLoading(false)), []);
  return { reservations, loading };
}

export function useUpcomingReservations(fromDate: string, count = 5) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  useEffect(() => listenToUpcoming(fromDate, count, setReservations), [fromDate, count]);
  return reservations;
}

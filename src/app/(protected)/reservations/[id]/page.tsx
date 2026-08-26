"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ReservationDetails } from "@/components/reservations/reservation-details";
import { ReservationForm } from "@/components/reservations/reservation-form";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/contexts/toast-context";
import { deleteReservation, listenToReservation, updateReservation } from "@/lib/api/reservations";
import type { Reservation, ReservationInput } from "@/types";
import { formatDate } from "@/utils/format";

export default function ReservationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const { language, t } = useLanguage();
  const { showToast } = useToast();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => listenToReservation(id, setReservation), [id]);
  if (!reservation) return <div className="rounded-[24px] bg-white p-10 text-center text-[#7c8681]">{t.loading}</div>;
  const save = async (data: ReservationInput) => { setBusy(true); try { const result = await updateReservation(id, data); showToast(t.reservationUpdated); setEditing(false); if (result.data.id !== id) router.replace(`/reservations/${result.data.id}`); } catch { showToast(t.genericError, "error"); } finally { setBusy(false); } };
  const remove = async () => { if (!window.confirm(`${t.deleteTitle}\n\n${t.irreversible}`)) return; setBusy(true); try { await deleteReservation(id); showToast(t.reservationDeleted); router.replace("/reservations"); } catch { showToast(t.genericError, "error"); setBusy(false); } };
  return <div className="mx-auto max-w-4xl"><div className="mb-5"><p className="text-sm font-bold uppercase tracking-[.16em] text-[#b78b47]">{t.reservations}</p><h2 className="mt-2 text-3xl font-extrabold">{formatDate(reservation.reservationDate, language)}</h2></div><div className="overflow-hidden rounded-[28px] border border-[#e5dfd4] bg-white">{editing ? <ReservationForm date={id} reservation={reservation} busy={busy} onCancel={() => setEditing(false)} onSubmit={save} /> : <ReservationDetails reservation={reservation} canDelete={profile?.role === "super_admin"} busy={busy} onEdit={() => setEditing(true)} onDelete={remove} onClose={() => router.back()} />}</div></div>;
}

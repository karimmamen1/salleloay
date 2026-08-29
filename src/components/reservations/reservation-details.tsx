"use client";

import { CalendarDays, Clock3, FileDown, Pencil, Printer, Trash2, UserRound } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import type { Reservation } from "@/types";
import { formatDate, formatMoney, formatTimestamp } from "@/utils/format";

export function ReservationDetails({ reservation, canDelete, busy, onEdit, onDelete, onClose }: { reservation: Reservation; canDelete: boolean; busy: boolean; onEdit: () => void; onDelete: () => void; onClose: () => void }) {
  const { language, t } = useLanguage();
  const rows = [
    [t.customer, reservation.customerName],
    [t.phone, <a className="font-bold text-[#123f33] underline-offset-4 hover:underline" href={`tel:${reservation.phone}`} key="phone">{reservation.phone}</a>],
    [t.guests, reservation.guestCount.toLocaleString(language === "ar" ? "ar-DZ" : "fr-FR")],
    [t.totalCost, formatMoney(reservation.totalCost, language)],
    [t.advance, formatMoney(reservation.advancePayment, language)],
    [t.remaining, formatMoney(reservation.totalCost - reservation.advancePayment, language)],
    [t.cook, reservation.cookName || "—"],
    [t.djName, reservation.djName || "—"],
    [t.djType, reservation.djType === "internal" ? t.djInternal : t.djOutsider],
    [t.servers, reservation.serverCount],
    [t.cleaning, reservation.cleaningCount],
  ];
  return <div className="p-5 sm:p-7">
    <div className="rounded-[24px] bg-[#f4e4e1] p-5 sm:flex sm:items-center sm:justify-between">
      <div><span className="inline-flex rounded-full bg-[#a43b35] px-3 py-1 text-xs font-bold text-white">{t.reserved}</span><h3 className="mt-3 text-3xl font-extrabold text-[#502723]">{reservation.eventType === "other" ? reservation.customEventType : t.weddings[reservation.eventType]}</h3></div>
      <p className="mt-4 flex items-center gap-2 font-bold text-[#79433e] sm:mt-0"><CalendarDays size={19} />{formatDate(reservation.reservationDate, language)}</p>
    </div>
    <div className="mt-5 grid gap-px overflow-hidden rounded-[22px] border border-[#e8e2d8] bg-[#e8e2d8] sm:grid-cols-2">
      {rows.map(([label, value]) => <div key={String(label)} className="bg-white p-4"><p className="text-xs font-bold uppercase tracking-[.09em] text-[#89928d]">{label}</p><div className="mt-2 text-base font-extrabold text-[#26322d]">{value}</div></div>)}
    </div>
    <div className="mt-5 grid gap-3 rounded-[22px] bg-[#f7f4ed] p-5 sm:grid-cols-2">
      <div className="flex gap-3"><UserRound className="text-[#b78b47]" size={19} /><div><p className="text-xs text-[#78827d]">{t.createdBy}</p><p className="font-bold">{reservation.createdByName}</p><p className="mt-1 text-xs text-[#78827d]">{formatTimestamp(reservation.createdAt, language)}</p></div></div>
      <div className="flex gap-3"><Clock3 className="text-[#b78b47]" size={19} /><div><p className="text-xs text-[#78827d]">{t.updatedBy}</p><p className="font-bold">{reservation.updatedByName}</p><p className="mt-1 text-xs text-[#78827d]">{formatTimestamp(reservation.updatedAt, language)}</p></div></div>
    </div>
    <div className="mt-6 flex flex-wrap gap-3">
      <a href={`/api/reservations/${encodeURIComponent(reservation.reservationDate)}/receipt`} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#b78b47] px-5 font-bold text-white"><FileDown size={17} />{t.generateReceiptPdf}</a>
      <a href={`/api/reservations/${encodeURIComponent(reservation.reservationDate)}/receipt?inline=1`} target="_blank" rel="noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-xl border border-[#d8c7a8] bg-[#fffaf0] px-5 font-bold text-[#8f682f]"><Printer size={17} />{t.print}</a>
      <button onClick={onClose} className="h-12 flex-1 rounded-xl border border-[#ded7ca] px-5 font-bold text-[#59645f]">{t.close}</button>
      <button disabled={busy} onClick={onEdit} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#123f33] px-5 font-bold text-white"><Pencil size={17} />{t.edit}</button>
      {canDelete && <button disabled={busy} onClick={onDelete} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#a43b35] px-5 font-bold text-white"><Trash2 size={17} />{t.delete}</button>}
    </div>
  </div>;
}

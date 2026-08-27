"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { ReservationForm } from "@/components/reservations/reservation-form";
import { ReservationDetails } from "@/components/reservations/reservation-details";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/contexts/toast-context";
import { useMonthReservations } from "@/hooks/use-reservations";
import { useOnline } from "@/hooks/use-online";
import { createReservation, deleteReservation, updateReservation } from "@/lib/api/reservations";
import type { ReservationInput } from "@/types";
import { formatDate, todayAlgiers } from "@/utils/format";

const iso = (year: number, month: number, day: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
const monthBounds = (date: Date) => ({ start: iso(date.getFullYear(), date.getMonth(), 1), end: iso(date.getFullYear(), date.getMonth(), new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()) });

export function MonthCalendar({ compact = false }: { compact?: boolean }) {
  const { language, t } = useLanguage();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const online = useOnline();
  const [month, setMonth] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1); });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [mode, setMode] = useState<"status" | "form" | "details">("status");
  const [busy, setBusy] = useState(false);
  const bounds = monthBounds(month);
  const { reservations, loading } = useMonthReservations(bounds.start, bounds.end);
  const byDate = useMemo(() => new Map(reservations.map((item) => [item.reservationDate, item])), [reservations]);
  const selected = selectedDate ? byDate.get(selectedDate) : undefined;
  const today = todayAlgiers();
  const selectedPast = Boolean(selectedDate && selectedDate < today);
  const firstWeekday = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: firstWeekday + days }, (_, index) => index < firstWeekday ? null : index - firstWeekday + 1);
  const weekdays = language === "ar" ? ["الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"] : ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const openDay = (date: string) => { setSelectedDate(date); setMode(byDate.has(date) ? "details" : "status"); };
  const close = () => { setSelectedDate(null); setMode("status"); };
  const save = async (data: ReservationInput) => {
    if (!online) return;
    setBusy(true);
    try {
      if (selected) { await updateReservation(selected.reservationDate, data); showToast(t.reservationUpdated); }
      else { await createReservation(data); showToast(t.reservationCreated); }
      close();
    } catch (error) {
      const message = error instanceof Error && (error.message.includes("already-exists") || error.message.includes("date-reserved")) ? t.duplicateError : t.genericError;
      showToast(message, "error");
    } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!selected || !online || !window.confirm(`${t.deleteTitle}\n\n${t.irreversible}`)) return;
    setBusy(true); try { await deleteReservation(selected.reservationDate); showToast(t.reservationDeleted); close(); } catch { showToast(t.genericError, "error"); } finally { setBusy(false); }
  };

  return <>
    <section className="overflow-hidden rounded-[26px] border border-[#e5dfd4] bg-white shadow-[0_12px_40px_rgba(39,48,44,.06)]">
      <div className="flex flex-col gap-4 border-b border-[#ebe6dd] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div><h2 className="text-2xl font-extrabold capitalize text-[#18221f]">{new Intl.DateTimeFormat(language === "ar" ? "ar-DZ" : "fr-FR", { month: "long", year: "numeric" }).format(month)}</h2>{!compact && <p className="mt-1 text-sm text-[#7c8681]">{t.calendarIntro}</p>}</div>
        <div className="flex items-center gap-2">
          <button aria-label={t.previousMonth} className="grid h-11 w-11 place-items-center rounded-xl border border-[#ded7ca]" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>{language === "ar" ? <ChevronRight /> : <ChevronLeft />}</button>
          <button className="h-11 rounded-xl border border-[#ded7ca] px-4 text-sm font-bold text-[#123f33]" onClick={() => { const now = new Date(); setMonth(new Date(now.getFullYear(), now.getMonth(), 1)); }}>{t.today}</button>
          <button aria-label={t.nextMonth} className="grid h-11 w-11 place-items-center rounded-xl border border-[#ded7ca]" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>{language === "ar" ? <ChevronLeft /> : <ChevronRight />}</button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-[#ebe6dd] bg-[#fbfaf7]">{weekdays.map((day) => <div className="p-2 text-center text-[10px] font-extrabold uppercase tracking-[.08em] text-[#7f8984] sm:p-3 sm:text-xs" key={day}>{day}</div>)}</div>
      <div className={`grid grid-cols-7 ${loading ? "animate-pulse" : ""}`}>
        {cells.map((day, index) => {
          if (!day) return <div key={`blank-${index}`} className="min-h-20 border-b border-e border-[#efebe4] bg-[#fbfaf8] sm:min-h-28" />;
          const date = iso(month.getFullYear(), month.getMonth(), day);
          const reservation = byDate.get(date);
          const past = date < today;
          return <button key={date} onClick={() => openDay(date)} className={`relative min-h-20 border-b border-e border-[#efebe4] p-2 text-start transition hover:z-10 hover:shadow-[inset_0_0_0_2px_#b78b47] sm:min-h-28 sm:p-3 ${reservation ? "bg-[#fbebea]" : past ? "bg-[#f7f6f2]" : "bg-[#edf6f0]"}`}>
            <span className={`inline-grid h-7 min-w-7 place-items-center rounded-full text-sm font-extrabold ${date === today ? "bg-[#b78b47] text-white" : "text-[#26322d]"}`}>{day}</span>
            {date === today && <span className="ms-1 hidden text-[9px] font-bold uppercase text-[#a67d3f] sm:inline">{t.today}</span>}
            <div className="mt-2">
              {reservation ? <><span className="block truncate text-[10px] font-extrabold uppercase text-[#a43b35] sm:text-xs">{reservation.eventType === "other" ? reservation.customEventType : t.weddings[reservation.eventType]}</span><span className="mt-1 hidden truncate text-xs font-semibold text-[#6e423e] sm:block">{reservation.customerName.split(" ")[0]}</span></> : past ? <span className="block text-[9px] font-extrabold uppercase text-[#8a918d] sm:text-[11px]">{t.past}</span> : <><span className="block text-[9px] font-extrabold uppercase text-[#287255] sm:text-[11px]">{t.available}</span><Plus className="mt-1 hidden text-[#4d8c70] sm:block" size={15} /></>}
            </div>
          </button>;
        })}
      </div>
      <div className="flex flex-wrap items-center gap-5 p-4 text-xs font-bold text-[#64706a] sm:px-6"><span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-[#56a87c]" />{t.available}</span><span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-[#bd514a]" />{t.reserved}</span><span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-[#b8bcb9]" />{t.past}</span></div>
    </section>

    <Dialog open={Boolean(selectedDate)} onClose={close} title={selectedDate ? formatDate(selectedDate, language) : ""} wide={mode === "form"}>
      {selectedDate && mode === "status" && <div className="p-7 text-center"><span className={`mx-auto grid h-16 w-16 place-items-center rounded-full text-2xl ${selectedPast ? "bg-[#eceeec] text-[#7d8581]" : "bg-[#e5f2e9] text-[#123f33]"}`}>{selectedPast ? "—" : "✓"}</span><h3 className={`mt-4 text-2xl font-extrabold ${selectedPast ? "text-[#747b77]" : "text-[#123f33]"}`}>{selectedPast ? t.past : t.available}</h3><p className="mt-2 text-[#75807b]">{formatDate(selectedDate, language)}</p>{!selectedPast && <button disabled={!online} onClick={() => setMode("form")} className="mt-7 h-12 rounded-xl bg-[#123f33] px-7 font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">{t.createReservation}</button>}</div>}
      {selectedDate && mode === "form" && <ReservationForm date={selectedDate} reservation={selected} busy={busy} onCancel={() => setMode(selected ? "details" : "status")} onSubmit={save} />}
      {selected && mode === "details" && <ReservationDetails reservation={selected} canDelete={profile?.role === "super_admin"} busy={busy} onEdit={() => setMode("form")} onDelete={remove} onClose={close} />}
    </Dialog>
  </>;
}

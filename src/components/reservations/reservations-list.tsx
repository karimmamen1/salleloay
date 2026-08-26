"use client";

import { CalendarDays, Search, UsersRound } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { useLanguage } from "@/contexts/language-context";
import { useAllReservations } from "@/hooks/use-reservations";
import { formatDate, formatMoney } from "@/utils/format";

export function ReservationsList() {
  const { language, t } = useLanguage();
  const { reservations, loading } = useAllReservations();
  const [search, setSearch] = useState("");
  const [event, setEvent] = useState("");
  const [month, setMonth] = useState("");
  const filtered = useMemo(() => reservations.filter((item) => {
    const needle = search.trim().toLowerCase();
    return (!needle || item.customerName.toLowerCase().includes(needle) || item.phone.includes(needle) || item.reservationDate.includes(needle)) && (!event || item.eventType === event) && (!month || item.reservationDate.startsWith(month));
  }), [reservations, search, event, month]);
  return <div>
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-bold uppercase tracking-[.16em] text-[#b78b47]">{t.hall}</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-.035em]">{t.reservations}</h2></div><Link href="/calendar" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#123f33] px-5 text-sm font-bold text-white"><CalendarDays size={18} />{t.calendar}</Link></div>
    <div className="mt-7 grid gap-3 rounded-[22px] border border-[#e5dfd4] bg-white p-4 md:grid-cols-[1fr_210px_180px]">
      <label className="relative"><Search className="absolute top-1/2 -translate-y-1/2 text-[#87918c]" style={{ insetInlineStart: "1rem" }} size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} className="h-12 w-full rounded-xl border border-[#ded7ca] bg-[#fbfaf7] ps-11 pe-4 outline-none focus:border-[#b78b47]" placeholder={t.searchPlaceholder} /></label>
      <select value={event} onChange={(e) => setEvent(e.target.value)} className="h-12 rounded-xl border border-[#ded7ca] bg-[#fbfaf7] px-3 outline-none"><option value="">{t.allEvents}</option>{Object.entries(t.weddings).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select>
      <input value={month} onChange={(e) => setMonth(e.target.value)} type="month" aria-label={t.allMonths} className="h-12 rounded-xl border border-[#ded7ca] bg-[#fbfaf7] px-3 outline-none" />
    </div>
    {loading ? <div className="mt-6 h-64 animate-pulse rounded-[24px] bg-white" /> : !filtered.length ? <div className="mt-6"><EmptyState message={t.noReservations} /></div> : <>
      <div className="mt-6 hidden overflow-hidden rounded-[24px] border border-[#e5dfd4] bg-white lg:block"><table className="w-full border-collapse text-sm"><thead className="bg-[#f2f0ea] text-start text-xs uppercase tracking-[.08em] text-[#6e7973]"><tr>{[t.date, t.customer, t.phone, t.event, t.guests, t.total, t.advance, t.remaining, t.createdBy].map((head) => <th className="p-4 text-start" key={head}>{head}</th>)}</tr></thead><tbody>{filtered.map((item) => <tr key={item.reservationDate} className="border-t border-[#ece7de] hover:bg-[#fbfaf7]"><td className="p-4 font-bold"><Link className="text-[#123f33] hover:underline" href={`/reservations/${item.reservationDate}`}>{formatDate(item.reservationDate, language, { day: "2-digit", month: "short", year: "numeric" })}</Link></td><td className="p-4 font-bold">{item.customerName}</td><td className="p-4">{item.phone}</td><td className="p-4">{item.eventType === "other" ? item.customEventType : t.weddings[item.eventType]}</td><td className="p-4">{item.guestCount}</td><td className="p-4 font-semibold">{formatMoney(item.totalCost, language)}</td><td className="p-4">{formatMoney(item.advancePayment, language)}</td><td className="p-4">{formatMoney(item.totalCost - item.advancePayment, language)}</td><td className="p-4">{item.createdByName}</td></tr>)}</tbody></table></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:hidden">{filtered.map((item) => <Link key={item.reservationDate} href={`/reservations/${item.reservationDate}`} className="rounded-[22px] border border-[#e5dfd4] bg-white p-5"><div className="flex items-center justify-between"><span className="rounded-full bg-[#f5e4e2] px-3 py-1 text-xs font-bold text-[#9d3c36]">{item.eventType === "other" ? item.customEventType : t.weddings[item.eventType]}</span><span className="text-xs font-bold text-[#68736d]">{formatDate(item.reservationDate, language, { day: "numeric", month: "short" })}</span></div><h3 className="mt-4 text-lg font-extrabold">{item.customerName}</h3><p className="mt-2 text-sm text-[#75807b]">{item.phone}</p><div className="mt-4 flex items-center justify-between border-t border-[#ece7de] pt-4"><span className="flex items-center gap-2 text-xs text-[#75807b]"><UsersRound size={15} />{item.guestCount}</span><strong className="text-[#123f33]">{formatMoney(item.totalCost, language)}</strong></div></Link>)}</div>
    </>}
  </div>;
}

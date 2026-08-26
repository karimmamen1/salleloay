"use client";

import { Banknote, CalendarCheck2, CalendarHeart, Coins, Users } from "lucide-react";
import Link from "next/link";
import { MonthCalendar } from "@/components/calendar/month-calendar";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { useMonthReservations, useUpcomingReservations } from "@/hooks/use-reservations";
import { formatDate, formatMoney, todayAlgiers } from "@/utils/format";

export function DashboardContent() {
  const { profile } = useAuth();
  const { language, t } = useLanguage();
  const today = todayAlgiers();
  const monthKey = today.slice(0, 7);
  const [year, month] = monthKey.split("-").map(Number);
  const monthDays = new Date(year, month, 0).getDate();
  const { reservations: monthReservations } = useMonthReservations(`${monthKey}-01`, `${monthKey}-${String(monthDays).padStart(2, "0")}`);
  const upcoming = useUpcomingReservations(today, 5);
  const stats = [
    { label: t.thisMonth, value: monthReservations.length.toLocaleString(language === "ar" ? "ar-DZ" : "fr-FR"), icon: CalendarCheck2, color: "bg-[#e9f2ed] text-[#24664e]" },
    { label: t.availableDays, value: Math.max(monthDays - monthReservations.length, 0).toLocaleString(language === "ar" ? "ar-DZ" : "fr-FR"), icon: CalendarHeart, color: "bg-[#eef1e5] text-[#65702d]" },
    { label: t.totalAdvances, value: formatMoney(monthReservations.reduce((sum, item) => sum + item.advancePayment, 0), language), icon: Coins, color: "bg-[#f6eddd] text-[#9b7133]" },
    { label: t.remainingCollect, value: formatMoney(monthReservations.reduce((sum, item) => sum + item.totalCost - item.advancePayment, 0), language), icon: Banknote, color: "bg-[#f5e7e5] text-[#99443f]" },
  ];
  return <div className="space-y-7">
    <section><p className="text-sm font-bold uppercase tracking-[.16em] text-[#b78b47]">{t.hall}</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-.035em] text-[#18221f] sm:text-4xl">{t.dashboard}</h2></section>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => <div className="rounded-[22px] border border-[#e5dfd4] bg-white p-5 shadow-[0_8px_25px_rgba(39,48,44,.04)]" key={stat.label}><div className={`grid h-11 w-11 place-items-center rounded-2xl ${stat.color}`}><stat.icon size={21} /></div><p className="mt-5 text-sm font-semibold text-[#7a847f]">{stat.label}</p><p className="mt-1 text-2xl font-extrabold tracking-[-.03em] text-[#1d2924]">{stat.value}</p></div>)}</div>
    {profile?.role === "super_admin" && <Link href="/admins" className="flex flex-col gap-4 rounded-[24px] border border-[#d7c7a9] bg-[#fffaf0] p-5 transition hover:border-[#b78b47] sm:flex-row sm:items-center sm:justify-between"><span className="flex items-center gap-4"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#123f33] text-white"><Users size={21} /></span><span><strong className="block text-lg text-[#18221f]">{t.administrators}</strong><small className="mt-1 block text-sm text-[#747e78]">{t.manageAdmins}</small></span></span><span className="inline-flex h-10 items-center justify-center rounded-xl bg-[#b78b47] px-5 text-sm font-bold text-white">{t.manage}</span></Link>}
    <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_330px]">
      <MonthCalendar compact />
      <aside className="h-fit rounded-[26px] border border-[#e5dfd4] bg-white p-5 shadow-[0_12px_40px_rgba(39,48,44,.06)] sm:p-6"><div className="flex items-center justify-between"><h3 className="text-lg font-extrabold">{t.upcoming}</h3><Link className="text-xs font-bold text-[#b78b47] hover:underline" href="/reservations">{t.reservations}</Link></div>
        <div className="mt-5 space-y-3">{upcoming.length ? upcoming.map((item) => <Link href={`/reservations/${item.reservationDate}`} className="block rounded-2xl border border-[#ebe5db] p-4 transition hover:border-[#b78b47] hover:bg-[#fbfaf7]" key={item.reservationDate}><div className="flex items-center justify-between gap-3"><span className="text-xs font-extrabold uppercase text-[#a43b35]">{item.eventType === "other" ? item.customEventType : t.weddings[item.eventType]}</span><span className="text-xs font-bold text-[#66716c]">{formatDate(item.reservationDate, language, { day: "numeric", month: "short" })}</span></div><p className="mt-2 font-extrabold">{item.customerName}</p><p className="mt-1 text-xs text-[#818b86]">{item.guestCount} {t.guests.toLowerCase()}</p></Link>) : <EmptyState message={t.noUpcoming} />}</div>
      </aside>
    </div>
  </div>;
}

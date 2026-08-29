"use client";

import { BarChart3, FileDown, Printer, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useLanguage } from "@/contexts/language-context";
import { apiRequest } from "@/lib/api/client";
import type { MonthlyReportData } from "@/types";
import { formatDate, formatMoney, todayAlgiers } from "@/utils/format";

export function MonthlyReport() {
  const { language, t } = useLanguage();
  const today = todayAlgiers();
  const initialYear = Number(today.slice(0, 4));
  const [month, setMonth] = useState(Number(today.slice(5, 7)));
  const [year, setYear] = useState(initialYear);
  const [data, setData] = useState<MonthlyReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const monthValue = `${year}-${String(month).padStart(2, "0")}`;
  const monthNames = useMemo(() => Array.from({ length: 12 }, (_, index) => new Intl.DateTimeFormat(language === "ar" ? "ar-DZ" : "fr-FR", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026, index, 1)))), [language]);
  const years = Array.from({ length: 9 }, (_, index) => initialYear - 3 + index);

  const load = async () => {
    setLoading(true); setError("");
    try { setData(await apiRequest<MonthlyReportData>(`/api/reports/monthly?month=${monthValue}`)); }
    catch { setData(null); setError(t.genericError); }
    finally { setLoading(false); }
  };
  const pdfUrl = `/api/reports/monthly?month=${data?.month || monthValue}&format=pdf`;
  const hasRows = Boolean(data?.reservations.length);

  return <div className="space-y-7">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-sm font-bold uppercase tracking-[.16em] text-[#b78b47]">{t.hall}</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-.035em]">{t.monthlyReport}</h2></div>
      <div className="grid grid-cols-2 gap-3 sm:flex">
        <a href={hasRows ? pdfUrl : undefined} aria-disabled={!hasRows} className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#123f33] px-5 text-sm font-bold text-white ${hasRows ? "" : "pointer-events-none opacity-40"}`}><FileDown size={18} />{t.generatePdf}</a>
        <button disabled={!hasRows} onClick={() => window.open(`${pdfUrl}&inline=1`, "_blank", "noopener,noreferrer")} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#d8c7a8] bg-white px-5 text-sm font-bold text-[#8f682f] disabled:opacity-40"><Printer size={18} />{t.print}</button>
      </div>
    </header>

    <section className="grid gap-4 rounded-[24px] border border-[#e5dfd4] bg-white p-5 shadow-[0_8px_25px_rgba(39,48,44,.04)] sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <label className="text-sm font-bold text-[#36413c]">{t.month}<select value={month} onChange={(event) => setMonth(Number(event.target.value))} className="mt-2 h-12 w-full rounded-xl border border-[#ded7ca] bg-[#fbfaf7] px-3 outline-none focus:border-[#b78b47]">{monthNames.map((name, index) => <option value={index + 1} key={name}>{name}</option>)}</select></label>
      <label className="text-sm font-bold text-[#36413c]">{t.year}<select value={year} onChange={(event) => setYear(Number(event.target.value))} className="mt-2 h-12 w-full rounded-xl border border-[#ded7ca] bg-[#fbfaf7] px-3 outline-none focus:border-[#b78b47]">{years.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
      <button disabled={loading} onClick={load} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#b78b47] px-6 font-bold text-white disabled:opacity-50"><Search size={18} />{loading ? t.loading : t.display}</button>
    </section>

    {error && <p className="rounded-2xl bg-[#f8e7e5] p-4 font-semibold text-[#983d37]">{error}</p>}
    {data && !data.reservations.length && <div className="rounded-[24px] border border-[#e5dfd4] bg-white p-10 text-center text-[#77817c]">{t.noReservationsMonth}</div>}
    {data && data.reservations.length > 0 && <>
      <section className="overflow-hidden rounded-[24px] border border-[#e5dfd4] bg-white">
        <div className="overflow-x-auto"><table className="w-full min-w-[850px] border-collapse text-sm"><thead className="bg-[#123f33] text-xs uppercase tracking-[.07em] text-white"><tr>{[t.date, t.customer, t.event, t.totalCost, t.servers, t.internalDj, t.cleaning].map((head) => <th key={head} className="p-4 text-start">{head}</th>)}</tr></thead><tbody>{data.reservations.map((reservation) => <tr key={reservation.reservationDate} className="border-t border-[#ece7de]"><td className="p-4 font-bold">{formatDate(reservation.reservationDate, language, { day: "2-digit", month: "2-digit" })}</td><td className="p-4 font-bold">{reservation.customerName}</td><td className="p-4">{reservation.eventType === "other" ? reservation.customEventType : t.weddings[reservation.eventType]}</td><td className="p-4 font-extrabold text-[#123f33]">{formatMoney(reservation.totalCost, language)}</td><td className="p-4 text-center font-bold">{reservation.serverCount}</td><td className="p-4">{reservation.djType === "internal" ? reservation.djName || t.djInternal : "—"}</td><td className="p-4 text-center font-bold">{reservation.cleaningCount}</td></tr>)}</tbody></table></div>
      </section>
      <section className="rounded-[24px] border border-[#e2d5bf] bg-[#fffaf0] p-5 sm:p-7">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#123f33] text-white"><BarChart3 size={20} /></span><h3 className="text-xl font-extrabold">{t.monthlySummary}</h3></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Summary label={t.totalCosts} value={formatMoney(data.summary.totalCost, language)} /><Summary label={t.totalServers} value={data.summary.serverCount} /><Summary label={t.totalCleaning} value={data.summary.cleaningCount} /><Summary label={t.internalDjCount} value={data.summary.internalDjCount} /></div>
        {data.summary.internalDjNames.length > 0 && <div className="mt-5 border-t border-[#e1d2b8] pt-5"><p className="font-extrabold text-[#123f33]">{t.internalDjBreakdown}</p><div className="mt-3 flex flex-wrap gap-2">{data.summary.internalDjNames.map((item) => <span key={item.name} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-[#59645f]">{item.name}: {item.count} {t.events}</span>)}</div></div>}
        <p className="mt-5 text-xs text-[#7f745f]">{t.generationDate}: {formatDate(data.generatedOn, language)}</p>
      </section>
    </>}
  </div>;
}

function Summary({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl bg-white p-4"><p className="text-xs font-bold uppercase tracking-[.08em] text-[#7d867f]">{label}</p><p className="mt-2 text-xl font-extrabold text-[#123f33]">{value}</p></div>;
}

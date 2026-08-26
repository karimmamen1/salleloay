"use client";

import { History } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/contexts/language-context";
import { pollApi } from "@/lib/api/client";
import type { AuditLog } from "@/types";
import { formatTimestamp } from "@/utils/format";

const labels: Record<string, { fr: string; ar: string }> = {
  reservation_created: { fr: "Création réservation", ar: "إنشاء حجز" }, reservation_updated: { fr: "Modification réservation", ar: "تعديل حجز" }, reservation_deleted: { fr: "Suppression réservation", ar: "حذف حجز" }, admin_created: { fr: "Création administrateur", ar: "إنشاء مشرف" }, admin_updated: { fr: "Modification administrateur", ar: "تعديل مشرف" }, admin_enabled: { fr: "Activation administrateur", ar: "تفعيل مشرف" }, admin_disabled: { fr: "Désactivation administrateur", ar: "تعطيل مشرف" }, admin_password_reset: { fr: "Réinitialisation mot de passe", ar: "تغيير كلمة المرور" }, admin_deleted: { fr: "Suppression administrateur", ar: "حذف مشرف" },
};

export function AuditList() {
  const { language, t } = useLanguage(); const [logs, setLogs] = useState<AuditLog[]>([]); const [action, setAction] = useState(""); const [search, setSearch] = useState(""); const [date, setDate] = useState("");
  useEffect(() => pollApi<AuditLog[]>("/api/audit", setLogs), []);
  const filtered = useMemo(() => logs.filter((log) => {
    const logDate = log.timestamp ? new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Algiers", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(log.timestamp)) : "";
    return (!action || log.action === action) && (!date || logDate === date) && (!search || `${log.performedByName} ${log.reservationId || ""}`.toLowerCase().includes(search.toLowerCase()));
  }), [logs, action, date, search]);
  return <div><div><p className="text-sm font-bold uppercase tracking-[.16em] text-[#b78b47]">{t.superAdmin}</p><h2 className="mt-2 text-3xl font-extrabold">{t.audit}</h2></div><div className="mt-7 grid gap-3 rounded-[22px] border border-[#e5dfd4] bg-white p-4 md:grid-cols-[1fr_230px_180px]"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.searchPlaceholder} className="h-12 rounded-xl border border-[#ded7ca] bg-[#fbfaf7] px-4 outline-none" /><select value={action} onChange={(e) => setAction(e.target.value)} className="h-12 rounded-xl border border-[#ded7ca] bg-[#fbfaf7] px-4"><option value="">{t.action}</option>{Object.entries(labels).map(([value, text]) => <option key={value} value={value}>{text[language]}</option>)}</select><input value={date} onChange={(e) => setDate(e.target.value)} type="date" aria-label={t.date} className="h-12 rounded-xl border border-[#ded7ca] bg-[#fbfaf7] px-4" /></div><div className="mt-6 space-y-3">{filtered.map((log) => <article key={log.id} className="flex items-start gap-4 rounded-[20px] border border-[#e5dfd4] bg-white p-4 sm:items-center"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#f3eadc] text-[#9b7133]"><History size={19} /></span><div className="min-w-0 flex-1"><p className="font-extrabold">{labels[log.action]?.[language] || log.action}</p><p className="mt-1 text-sm text-[#727d77]">{log.performedByName}{log.reservationId ? ` · ${log.reservationId}` : ""}</p></div><time className="text-end text-xs font-semibold text-[#7d8782]">{formatTimestamp(log.timestamp, language)}</time></article>)}</div></div>;
}

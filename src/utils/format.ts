import type { Language, Reservation } from "@/types";

export const formatMoney = (value: number, language: Language = "fr") =>
  `${new Intl.NumberFormat(language === "ar" ? "ar-DZ" : "fr-FR", { maximumFractionDigits: 0 }).format(value || 0)} ${language === "ar" ? "دج" : "DA"}`;

export const formatDate = (date: string, language: Language, options?: Intl.DateTimeFormatOptions) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return "—";
  const [, year, month, day] = match;
  const value = new Date(Number(year), Number(month) - 1, Number(day), 12);
  if (Number.isNaN(value.getTime())) return "—";
  return new Intl.DateTimeFormat(language === "ar" ? "ar-DZ" : "fr-DZ", options || { day: "numeric", month: "long", year: "numeric" }).format(value);
};

export const formatTimestamp = (value: Reservation["createdAt"], language: Language) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(language === "ar" ? "ar-DZ" : "fr-DZ", { dateStyle: "short", timeStyle: "short", timeZone: "Africa/Algiers" }).format(date);
};

export const todayAlgiers = () => {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Africa/Algiers", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};

export const countAvailableDaysInMonth = (monthKey: string, today: string, reservedDates: string[]) => {
  const [year, month] = monthKey.split("-").map(Number);
  if (!/^\d{4}-\d{2}$/.test(monthKey) || !/^\d{4}-\d{2}-\d{2}$/.test(today) || !year || month < 1 || month > 12) return 0;
  const todayMonth = today.slice(0, 7);
  if (monthKey < todayMonth) return 0;
  const monthDays = new Date(year, month, 0).getDate();
  const firstAvailableDay = monthKey === todayMonth ? Number(today.slice(8, 10)) : 1;
  const firstAvailableDate = `${monthKey}-${String(firstAvailableDay).padStart(2, "0")}`;
  const reserved = new Set(reservedDates.filter((date) => date.startsWith(`${monthKey}-`) && date >= firstAvailableDate)).size;
  return Math.max(monthDays - firstAvailableDay + 1 - reserved, 0);
};

export const normalizePhone = (value: string) => value.replace(/[^0-9+]/g, "");

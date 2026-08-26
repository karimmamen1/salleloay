import type { Language, Reservation } from "@/types";

export const formatMoney = (value: number, language: Language = "fr") =>
  `${new Intl.NumberFormat(language === "ar" ? "ar-DZ" : "fr-FR", { maximumFractionDigits: 0 }).format(value || 0)} ${language === "ar" ? "دج" : "DA"}`;

export const formatDate = (date: string, language: Language, options?: Intl.DateTimeFormatOptions) => {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat(language === "ar" ? "ar-DZ" : "fr-DZ", options || { day: "numeric", month: "long", year: "numeric" }).format(new Date(year, month - 1, day, 12));
};

export const formatTimestamp = (value: Reservation["createdAt"], language: Language) => {
  if (!value?.toDate) return "—";
  return new Intl.DateTimeFormat(language === "ar" ? "ar-DZ" : "fr-DZ", { dateStyle: "short", timeStyle: "short", timeZone: "Africa/Algiers" }).format(value.toDate());
};

export const todayAlgiers = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Algiers", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export const normalizePhone = (value: string) => value.replace(/[^0-9+]/g, "");

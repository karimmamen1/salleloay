import type { MonthlyReportSummary, Reservation } from "@/types";

export function monthBounds(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, "0")}` };
}

export function summarizeReservations(reservations: Reservation[]): MonthlyReportSummary {
  const djNames = new Map<string, number>();
  let totalCost = 0;
  let serverCount = 0;
  let cleaningCount = 0;
  let internalDjCount = 0;

  for (const reservation of reservations) {
    totalCost += reservation.totalCost;
    serverCount += reservation.serverCount;
    cleaningCount += reservation.cleaningCount;
    if (reservation.djType === "internal") {
      internalDjCount += 1;
      const name = reservation.djName?.trim() || "DJ interne";
      djNames.set(name, (djNames.get(name) || 0) + 1);
    }
  }

  return {
    totalCost,
    serverCount,
    cleaningCount,
    internalDjCount,
    internalDjNames: [...djNames.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
  };
}

export function sanitizeFilename(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "reservation";
}

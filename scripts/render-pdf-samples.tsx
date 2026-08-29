import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { renderMonthlyReportPdf, renderReceiptPdf } from "../src/lib/pdf/server";
import { summarizeReservations } from "../src/lib/reports";
import type { MonthlyReportData, Reservation } from "../src/types";

const reservation: Reservation = {
  reservationDate: "2026-09-01",
  customerName: "محمد بن علي",
  phone: "0555123456",
  eventType: "wedding",
  customEventType: null,
  guestCount: 300,
  totalCost: 400000,
  advancePayment: 100000,
  cookName: "أحمد",
  djName: "DJ Karim",
  djType: "internal",
  serverCount: 8,
  cleaningCount: 3,
  createdByUserId: "sample-user",
  createdByName: "Hani",
  createdAt: "2026-08-29T19:00:00.000Z",
  updatedByUserId: "sample-user",
  updatedByName: "Hani",
  updatedAt: "2026-08-29T19:00:00.000Z",
};

async function main() {
  const output = resolve("tmp/pdfs");
  const fontBase = resolve("public/fonts");
  await mkdir(output, { recursive: true });
  const receipt = await renderReceiptPdf(reservation, "2026-08-29", fontBase);
  await writeFile(resolve(output, "receipt-sample.pdf"), receipt);

  const reservations = Array.from({ length: 28 }, (_, index): Reservation => ({
    ...reservation,
    reservationDate: `2026-09-${String(index + 1).padStart(2, "0")}`,
    customerName: index % 3 === 0 ? `محمد بن علي ${index + 1}` : `Client ${index + 1}`,
    totalCost: 300000 + index * 10000,
    serverCount: 5 + index % 6,
    cleaningCount: 2 + index % 3,
    djType: index % 3 === 1 ? "outsider" : "internal",
    djName: index % 2 === 0 ? "DJ Karim" : "DJ Samir",
  }));
  const data: MonthlyReportData = { month: "2026-09", reservations, summary: summarizeReservations(reservations), generatedOn: "2026-08-29" };
  const monthly = await renderMonthlyReportPdf(data, fontBase);
  await writeFile(resolve(output, "monthly-report-sample.pdf"), monthly);
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });

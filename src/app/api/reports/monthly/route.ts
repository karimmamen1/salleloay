import { ApiError, jsonError } from "@/lib/api/server";
import { requireUser } from "@/lib/auth/server";
import { database } from "@/lib/db/client";
import { reservationFromRow } from "@/lib/db/rows";
import { renderMonthlyReportPdf } from "@/lib/pdf/server";
import { monthBounds, summarizeReservations } from "@/lib/reports";
import type { MonthlyReportData } from "@/types";
import { todayAlgiers } from "@/utils/format";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireUser("super_admin");
    const url = new URL(request.url);
    const month = url.searchParams.get("month") || "";
    const bounds = monthBounds(month);
    if (!bounds) throw new ApiError(400, "invalid-argument");
    const rows = await database()`
      SELECT * FROM reservations
      WHERE reservation_date BETWEEN ${bounds.from} AND ${bounds.to}
      ORDER BY reservation_date ASC
    `;
    const reservations = rows.map((row) => reservationFromRow(row as Record<string, unknown>));
    const data: MonthlyReportData = { month, reservations, summary: summarizeReservations(reservations), generatedOn: todayAlgiers() };
    if (url.searchParams.get("format") !== "pdf") return Response.json({ data });
    if (!reservations.length) throw new ApiError(404, "no-reservations");
    const pdf = await renderMonthlyReportPdf(data);
    const inline = url.searchParams.get("inline") === "1";
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="Rapport-Loay-${month}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

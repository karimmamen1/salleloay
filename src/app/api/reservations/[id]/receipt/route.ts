import { z } from "zod";
import { join } from "node:path";
import { ApiError, jsonError } from "@/lib/api/server";
import { requireUser } from "@/lib/auth/server";
import { database } from "@/lib/db/client";
import { reservationFromRow } from "@/lib/db/rows";
import { renderReceiptPdf } from "@/lib/pdf/server";
import { sanitizeFilename } from "@/lib/reports";
import { todayAlgiers } from "@/utils/format";

export const runtime = "nodejs";
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await context.params;
    const date = decodeURIComponent(id);
    if (!dateSchema.safeParse(date).success) throw new ApiError(400, "invalid-argument");
    const rows = await database()`SELECT * FROM reservations WHERE reservation_date = ${date} LIMIT 1`;
    if (!rows[0]) throw new ApiError(404, "reservation-not-found");
    const reservation = reservationFromRow(rows[0] as Record<string, unknown>);
    const fontBase = join(process.cwd(), "public", "fonts");
    const pdf = await renderReceiptPdf(reservation, todayAlgiers(), fontBase);
    const filename = `Recu-Loay-${sanitizeFilename(reservation.customerName)}-${reservation.reservationDate}.pdf`;
    const inline = new URL(request.url).searchParams.get("inline") === "1";
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

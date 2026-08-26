import { z } from "zod";
import { ApiError, assertSameOrigin, jsonError } from "@/lib/api/server";
import { requireUser } from "@/lib/auth/server";
import { database, isUniqueViolation } from "@/lib/db/client";
import { reservationFromRow } from "@/lib/db/rows";
import { reservationSchema } from "@/schemas/reservation";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function GET(request: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const upcoming = searchParams.get("upcoming") === "true";
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 5), 1), 300);
    const sql = database();
    let rows;
    if (dateSchema.safeParse(from).success && dateSchema.safeParse(to).success) {
      rows = await sql`SELECT * FROM reservations WHERE reservation_date BETWEEN ${from} AND ${to} ORDER BY reservation_date`;
    } else if (upcoming && dateSchema.safeParse(from).success) {
      rows = await sql`SELECT * FROM reservations WHERE reservation_date >= ${from} ORDER BY reservation_date LIMIT ${limit}`;
    } else {
      rows = await sql`SELECT * FROM reservations ORDER BY reservation_date DESC LIMIT ${limit}`;
    }
    return Response.json({ data: rows.map((row) => reservationFromRow(row as Record<string, unknown>)) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const caller = await requireUser();
    const parsed = reservationSchema.safeParse(await request.json());
    if (!parsed.success) throw new ApiError(400, "invalid-argument");
    const data = parsed.data;
    const sql = database();
    try {
      const rows = await sql`
        WITH inserted AS (
          INSERT INTO reservations (
            reservation_date, customer_name, phone, event_type, custom_event_type, guest_count,
            total_cost, advance_payment, cook_name, cook_cost, server_count, cleaning_cost,
            created_by_user_id, created_by_name, updated_by_user_id, updated_by_name
          ) VALUES (
            ${data.reservationDate}, ${data.customerName}, ${data.phone}, ${data.eventType},
            ${data.eventType === "other" ? data.customEventType || "" : null}, ${data.guestCount},
            ${data.totalCost}, ${data.advancePayment}, ${data.cookName || ""}, ${data.cookCost},
            ${data.serverCount}, ${data.cleaningCost}, ${caller.uid}, ${caller.name}, ${caller.uid}, ${caller.name}
          ) RETURNING *
        ), logged AS (
          INSERT INTO audit_logs (action, performed_by_user_id, performed_by_name, reservation_id)
          SELECT 'reservation_created', ${caller.uid}, ${caller.name}, reservation_date FROM inserted
        )
        SELECT * FROM inserted
      `;
      return Response.json({ data: { id: reservationFromRow(rows[0] as Record<string, unknown>).reservationDate } }, { status: 201 });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ApiError(409, "date-reserved");
      throw error;
    }
  } catch (error) {
    return jsonError(error);
  }
}


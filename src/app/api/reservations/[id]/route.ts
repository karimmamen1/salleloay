import { z } from "zod";
import { ApiError, assertSameOrigin, jsonError } from "@/lib/api/server";
import { requireUser } from "@/lib/auth/server";
import { database, ensureReservationSchema, isUniqueViolation } from "@/lib/db/client";
import { reservationFromRow } from "@/lib/db/rows";
import { reservationSchema } from "@/schemas/reservation";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

async function reservationDate(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const date = decodeURIComponent(id);
  if (!dateSchema.safeParse(date).success) throw new ApiError(400, "invalid-argument");
  return date;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const date = await reservationDate(context);
    const rows = await database()`SELECT * FROM reservations WHERE reservation_date = ${date} LIMIT 1`;
    if (!rows[0]) throw new ApiError(404, "reservation-not-found");
    return Response.json({ data: reservationFromRow(rows[0] as Record<string, unknown>) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const caller = await requireUser();
    const originalDate = await reservationDate(context);
    const parsed = reservationSchema.safeParse(await request.json());
    if (!parsed.success) throw new ApiError(400, "invalid-argument");
    const data = parsed.data;
    if (originalDate !== data.reservationDate && caller.role !== "super_admin") {
      throw new ApiError(403, "date-move-requires-super-admin");
    }

    const sql = database();
    await ensureReservationSchema(sql);
    try {
      const rows = await sql`
        WITH updated AS (
          UPDATE reservations SET
            reservation_date = ${data.reservationDate}, customer_name = ${data.customerName}, phone = ${data.phone},
            event_type = ${data.eventType}, custom_event_type = ${data.eventType === "other" ? data.customEventType || "" : null},
            guest_count = ${data.guestCount}, total_cost = ${data.totalCost}, advance_payment = ${data.advancePayment},
            cook_name = ${data.cookName || ""}, dj_name = ${data.djName || ""}, dj_type = ${data.djType},
            server_count = ${data.serverCount}, cleaning_count = ${data.cleaningCount},
            updated_by_user_id = ${caller.uid}, updated_by_name = ${caller.name},
            updated_at = now()
          WHERE reservation_date = ${originalDate}
          RETURNING *
        ), logged AS (
          INSERT INTO audit_logs (action, performed_by_user_id, performed_by_name, reservation_id, previous_reservation_id)
          SELECT 'reservation_updated', ${caller.uid}, ${caller.name}, reservation_date, ${originalDate} FROM updated
        )
        SELECT * FROM updated
      `;
      if (!rows[0]) throw new ApiError(404, "reservation-not-found");
      return Response.json({ data: { id: reservationFromRow(rows[0] as Record<string, unknown>).reservationDate } });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ApiError(409, "date-reserved");
      throw error;
    }
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const caller = await requireUser("super_admin");
    const date = await reservationDate(context);
    const rows = await database()`
      WITH deleted AS (
        DELETE FROM reservations WHERE reservation_date = ${date} RETURNING *
      ), logged AS (
        INSERT INTO audit_logs (action, performed_by_user_id, performed_by_name, reservation_id, snapshot)
        SELECT 'reservation_deleted', ${caller.uid}, ${caller.name}, reservation_date, to_jsonb(deleted) FROM deleted
      )
      SELECT * FROM deleted
    `;
    if (!rows[0]) throw new ApiError(404, "reservation-not-found");
    return Response.json({ data: { id: date } });
  } catch (error) {
    return jsonError(error);
  }
}

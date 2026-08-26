import { describe, expect, it } from "vitest";
import { auditFromRow, reservationFromRow } from "./rows";

const reservationRow = {
  reservation_date: new Date("2026-08-28T00:00:00.000Z"),
  customer_name: "Test",
  phone: "0555000000",
  event_type: "wedding",
  guest_count: 10,
  total_cost: 1000,
  advance_payment: 100,
  cook_name: "",
  cook_cost: 0,
  server_count: 0,
  cleaning_cost: 0,
  created_by_user_id: "user-1",
  created_by_name: "Hani",
  created_at: new Date("2026-08-27T20:00:00.000Z"),
  updated_by_user_id: "user-1",
  updated_by_name: "Hani",
  updated_at: new Date("2026-08-27T20:00:00.000Z"),
};

describe("database row mapping", () => {
  it("serializes PostgreSQL dates as YYYY-MM-DD", () => {
    expect(reservationFromRow(reservationRow).reservationDate).toBe("2026-08-28");
  });

  it("serializes audit reservation dates consistently", () => {
    expect(auditFromRow({
      id: "log-1",
      action: "reservation_created",
      performed_by_user_id: "user-1",
      performed_by_name: "Hani",
      reservation_id: new Date("2026-08-28T00:00:00.000Z"),
      created_at: new Date("2026-08-27T20:00:00.000Z"),
    }).reservationId).toBe("2026-08-28");
  });
});

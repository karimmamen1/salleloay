import { describe, expect, it } from "vitest";
import { reservationSchema } from "./reservation";

const valid = { reservationDate: "2026-08-27", customerName: "Mohamed Benali", phone: "0555123456", eventType: "wedding", customEventType: null, guestCount: 300, totalCost: 400000, advancePayment: 100000, cookName: "Ahmed", djName: "DJ Karim", djType: "internal", serverCount: 8, cleaningCount: 3 };

describe("reservation validation", () => {
  it("accepts a complete reservation with DJ and cleaning staff", () => expect(reservationSchema.safeParse(valid).success).toBe(true));
  it("rejects an advance above total cost", () => expect(reservationSchema.safeParse({ ...valid, advancePayment: 500000 }).success).toBe(false));
  it("requires a label for other event types", () => expect(reservationSchema.safeParse({ ...valid, eventType: "other", customEventType: "" }).success).toBe(false));
  it("rejects fractional cleaning staff", () => expect(reservationSchema.safeParse({ ...valid, cleaningCount: 1.5 }).success).toBe(false));
  it("rejects unsupported DJ types", () => expect(reservationSchema.safeParse({ ...valid, djType: "guest" }).success).toBe(false));
});

import { describe, expect, it } from "vitest";
import { reservationSchema } from "./reservation";

const valid = { reservationDate: "2026-08-27", customerName: "Mohamed Benali", phone: "0555123456", eventType: "wedding", customEventType: null, guestCount: 300, totalCost: 400000, advancePayment: 100000, cookName: "Ahmed", cookCost: 50000, serverCount: 8, cleaningCost: 15000 };

describe("reservation validation", () => {
  it("accepts a complete reservation with cleaning as money", () => expect(reservationSchema.safeParse(valid).success).toBe(true));
  it("rejects an advance above total cost", () => expect(reservationSchema.safeParse({ ...valid, advancePayment: 500000 }).success).toBe(false));
  it("requires a label for other event types", () => expect(reservationSchema.safeParse({ ...valid, eventType: "other", customEventType: "" }).success).toBe(false));
  it("rejects negative service prices", () => expect(reservationSchema.safeParse({ ...valid, cleaningCost: -1 }).success).toBe(false));
});

import { describe, expect, it } from "vitest";
import { monthBounds, sanitizeFilename, summarizeReservations } from "./reports";
import type { Reservation } from "@/types";

const base: Reservation = {
  reservationDate: "2026-09-01", customerName: "Mohamed", phone: "0555123456", eventType: "wedding",
  guestCount: 300, totalCost: 400000, advancePayment: 100000, cookName: "Ahmed", djName: "DJ Karim",
  djType: "internal", serverCount: 8, cleaningCount: 3, createdByUserId: "1", createdByName: "Hani",
  updatedByUserId: "1", updatedByName: "Hani",
};

describe("monthly report calculations", () => {
  it("calculates the requested totals and excludes outsider DJs", () => {
    const report = summarizeReservations([
      base,
      { ...base, reservationDate: "2026-09-03", totalCost: 350000, serverCount: 6, cleaningCount: 2, djType: "outsider", djName: "DJ Mourad" },
      { ...base, reservationDate: "2026-09-05", totalCost: 500000, serverCount: 10, cleaningCount: 4, djName: "DJ Samir" },
    ]);
    expect(report).toEqual({
      totalCost: 1250000, serverCount: 24, cleaningCount: 9, internalDjCount: 2,
      internalDjNames: [{ name: "DJ Karim", count: 1 }, { name: "DJ Samir", count: 1 }],
    });
  });

  it("calculates month boundaries including leap years", () => {
    expect(monthBounds("2028-02")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
  });

  it("sanitizes receipt filenames", () => expect(sanitizeFilename("Mohamed Benali / Test")).toBe("Mohamed-Benali-Test"));
});

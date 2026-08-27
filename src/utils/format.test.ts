import { describe, expect, it } from "vitest";
import { countAvailableDaysInMonth, formatDate, formatMoney, normalizePhone, todayAlgiers } from "./format";

describe("formatters", () => {
  it("formats DZD without decimals", () => expect(formatMoney(400000, "fr")).toBe("400 000 DA"));
  it("keeps calendar dates stable", () => expect(formatDate("2026-08-27", "fr", { year: "numeric", month: "2-digit", day: "2-digit" })).toContain("27"));
  it("does not crash on malformed calendar dates", () => expect(formatDate("Fri Aug 28", "fr")).toBe("—"));
  it("returns today's Algiers date in ISO format", () => expect(todayAlgiers()).toMatch(/^\d{4}-\d{2}-\d{2}$/));
  it("counts only today and future unreserved dates as available", () => {
    expect(countAvailableDaysInMonth("2026-08", "2026-08-27", ["2026-08-10", "2026-08-28"])).toBe(4);
  });
  it("returns no available dates for a past month", () => {
    expect(countAvailableDaysInMonth("2026-07", "2026-08-27", [])).toBe(0);
  });
  it("normalizes Algerian phone input", () => expect(normalizePhone("0555 12 34 56")).toBe("0555123456"));
});

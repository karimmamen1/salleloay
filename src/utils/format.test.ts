import { describe, expect, it } from "vitest";
import { formatDate, formatMoney, normalizePhone } from "./format";

describe("formatters", () => {
  it("formats DZD without decimals", () => expect(formatMoney(400000, "fr")).toBe("400 000 DA"));
  it("keeps calendar dates stable", () => expect(formatDate("2026-08-27", "fr", { year: "numeric", month: "2-digit", day: "2-digit" })).toContain("27"));
  it("normalizes Algerian phone input", () => expect(normalizePhone("0555 12 34 56")).toBe("0555123456"));
});

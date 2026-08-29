import { describe, expect, it } from "vitest";
import { pdfRtl } from "./rtl";

describe("pdfRtl", () => {
  it("leaves non-Arabic values untouched", () => {
    expect(pdfRtl("29/08/2026")).toBe("29/08/2026");
  });

  it("preserves every Arabic letter as a shaped glyph", () => {
    const output = pdfRtl("قاعة الأفراح لؤي");
    expect(output).not.toMatch(/[\u0621-\u064a]/u);
    expect([...output].filter((character) => /[\ufb50-\ufdff\ufe70-\ufeff]/u.test(character))).toHaveLength(13);
  });

  it("keeps Latin dates together in mixed bilingual text", () => {
    const output = pdfRtl("تاريخ إنشاء التقرير / Date de génération: 29/08/2026");
    expect(output).toContain("Date de génération: 29/08/2026");
  });
});

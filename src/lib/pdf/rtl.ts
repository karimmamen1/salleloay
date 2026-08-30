import reshaper from "arabic-persian-reshaper";
import bidiFactory from "bidi-js";

export const arabicPattern = /[\u0600-\u06ff]/;

const bidi = bidiFactory();
const { ArabicShaper } = reshaper;

/**
 * Shape Arabic before react-pdf's bidi pass so every connected glyph is kept.
 */
export function pdfRtl(value: string | number) {
  const text = String(value);
  if (!arabicPattern.test(text)) return text;
  const shaped = ArabicShaper.convertArabic(text);
  const levels = bidi.getEmbeddingLevels(shaped, "rtl");
  const visuallyOrdered = bidi.getReorderedString(shaped, levels);
  return visuallyOrdered.replace(/[\ufb50-\ufdff\ufe70-\ufeff]/gu, "\u200e$&\u200e");
}

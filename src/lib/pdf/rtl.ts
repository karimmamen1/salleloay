import reshaper from "arabic-persian-reshaper";
import bidiFactory from "bidi-js";

export const arabicPattern = /[\u0600-\u06ff]/;

const bidi = bidiFactory();
const { ArabicShaper } = reshaper;

/**
 * react-pdf currently loses Arabic glyphs while applying its own bidi pass.
 * Shape and visually order the line first, then force that stable glyph order
 * through the renderer. Presentation-form glyphs remain embedded as text.
 */
export function pdfRtl(value: string | number) {
  const text = String(value);
  if (!arabicPattern.test(text)) return text;
  const shaped = ArabicShaper.convertArabic(text);
  const levels = bidi.getEmbeddingLevels(shaped, "rtl");
  const visuallyOrdered = bidi.getReorderedString(shaped, levels);
  // An invisible LTR mark after each already-shaped glyph prevents react-pdf
  // from reordering the visual sequence a second time.
  return visuallyOrdered.replace(/[\ufb50-\ufdff\ufe70-\ufeff]/gu, "\u200e$&\u200e");
}

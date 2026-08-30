declare module "arabic-persian-reshaper" {
  const reshaper: {
    ArabicShaper: { convertArabic(value: string): string };
  };
  export default reshaper;
}

declare module "bidi-js" {
  interface EmbeddingLevels {
    levels: Uint8Array;
    paragraphs: Array<{ start: number; end: number; level: number }>;
  }

  interface Bidi {
    getEmbeddingLevels(value: string, direction?: "ltr" | "rtl"): EmbeddingLevels;
    getReorderedString(value: string, levels: EmbeddingLevels): string;
  }

  export default function bidiFactory(): Bidi;
}

import "server-only";

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let cachedUrl = "";
let cachedClient: NeonQueryFunction<false, false> | undefined;

export function database() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL is not configured. Connect a Neon Postgres database in Vercel.");
  if (!cachedClient || cachedUrl !== url) {
    cachedUrl = url;
    cachedClient = neon(url);
  }
  return cachedClient;
}

export function isUniqueViolation(error: unknown) {
  const value = error as { code?: string; message?: string };
  return value.code === "23505" || value.message?.includes("duplicate key value") === true;
}

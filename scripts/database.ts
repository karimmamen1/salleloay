import { neon } from "@neondatabase/serverless";
import { loadEnvConfig } from "@next/env";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { migrateReservationFields } from "./reservation-migration";

export function connectDatabase() {
  loadEnvConfig(process.cwd());
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) throw new Error("DATABASE_URL is missing. Connect a Neon database to Vercel or add it to .env.local.");
  return neon(connectionString);
}

export async function migrateDatabase() {
  const sql = connectDatabase();
  const schema = await readFile(resolve(process.cwd(), "database/schema.sql"), "utf8");
  const statements = schema.split(/;\s*(?:\r?\n|$)/).map((statement) => statement.trim()).filter(Boolean);
  for (const statement of statements) await sql.query(statement);
  await migrateReservationFields(sql);
}

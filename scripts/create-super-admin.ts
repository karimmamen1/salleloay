import { hash } from "bcryptjs";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { connectDatabase, migrateDatabase } from "./database";

async function main() {
  await migrateDatabase();
  const sql = connectDatabase();
  const rl = createInterface({ input: stdin, output: stdout });
  const name = (process.env.SUPER_ADMIN_NAME || await rl.question("Name [Hani]: ")).trim() || "Hani";
  const username = (process.env.SUPER_ADMIN_USERNAME || await rl.question("Username [hani]: ")).trim().toLowerCase() || "hani";
  const password = process.env.SUPER_ADMIN_PASSWORD || await rl.question("Password (input is visible; prefer SUPER_ADMIN_PASSWORD): ");
  rl.close();
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) throw new Error("Username must contain 3-32 letters, numbers, dots, underscores or hyphens.");
  if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) throw new Error("Password must contain at least 12 characters, including uppercase, lowercase, a number and a symbol.");

  const passwordHash = await hash(password, 12);
  const rows = await sql`
    INSERT INTO users (name, username, username_lower, password_hash, role, active, created_by)
    VALUES (${name}, ${username}, ${username}, ${passwordHash}, 'super_admin', true, NULL)
    ON CONFLICT (username_lower) DO UPDATE SET
      name = EXCLUDED.name, username = EXCLUDED.username, password_hash = EXCLUDED.password_hash,
      role = 'super_admin', active = true, updated_at = now()
    RETURNING id
  `;
  await sql`DELETE FROM sessions WHERE user_id = ${String(rows[0].id)}`;
  console.log(`Super Admin ${name} (@${username}) is ready. UID: ${String(rows[0].id)}`);
}

void main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });

import type { NeonQueryFunction } from "@neondatabase/serverless";

export async function migrateReservationFields(sql: NeonQueryFunction<false, false>) {
  const rows = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reservations'
  `;
  const columns = new Set(rows.map((row) => String(row.column_name)));

  if (!columns.has("dj_name")) {
    await sql`ALTER TABLE reservations ADD COLUMN dj_name varchar(120) NOT NULL DEFAULT ''`;
  }
  if (!columns.has("dj_type")) {
    await sql`ALTER TABLE reservations ADD COLUMN dj_type varchar(16) NOT NULL DEFAULT 'outsider' CHECK (dj_type IN ('internal', 'outsider'))`;
  }
  if (!columns.has("cleaning_count")) {
    await sql`ALTER TABLE reservations ADD COLUMN cleaning_count integer NOT NULL DEFAULT 0 CHECK (cleaning_count >= 0)`;
  }

  await sql`
    CREATE TABLE IF NOT EXISTS reservation_legacy_service_costs (
      reservation_date date PRIMARY KEY,
      cook_cost numeric(14,2),
      cleaning_cost numeric(14,2),
      archived_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  const hasCookCost = columns.has("cook_cost");
  const hasCleaningCost = columns.has("cleaning_cost");
  if (hasCookCost && hasCleaningCost) {
    await sql`
      INSERT INTO reservation_legacy_service_costs (reservation_date, cook_cost, cleaning_cost)
      SELECT reservation_date, cook_cost, cleaning_cost FROM reservations
      ON CONFLICT (reservation_date) DO NOTHING
    `;
  } else if (hasCookCost) {
    await sql`
      INSERT INTO reservation_legacy_service_costs (reservation_date, cook_cost)
      SELECT reservation_date, cook_cost FROM reservations
      ON CONFLICT (reservation_date) DO NOTHING
    `;
  } else if (hasCleaningCost) {
    await sql`
      INSERT INTO reservation_legacy_service_costs (reservation_date, cleaning_cost)
      SELECT reservation_date, cleaning_cost FROM reservations
      ON CONFLICT (reservation_date) DO NOTHING
    `;
  }

  if (hasCookCost) await sql`ALTER TABLE reservations DROP COLUMN cook_cost`;
  if (hasCleaningCost) await sql`ALTER TABLE reservations DROP COLUMN cleaning_cost`;
}

import type { NeonQueryFunction } from "@neondatabase/serverless";

const REQUIRED_COLUMNS = ["dj_name", "dj_type", "cleaning_count"] as const;

export async function migrateReservationFields(sql: NeonQueryFunction<false, false>) {
  const rows = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reservations'
      AND column_name IN ('dj_name', 'dj_type', 'cleaning_count', 'cook_cost', 'cleaning_cost')
  `;
  const columns = new Set(rows.map((row) => String(row.column_name)));
  const current = REQUIRED_COLUMNS.every((column) => columns.has(column))
    && !columns.has("cook_cost")
    && !columns.has("cleaning_cost");
  if (current) return;

  // One atomic, lock-protected migration makes concurrent serverless requests safe.
  // Dynamic SQL is required because legacy columns may already be absent when the
  // block is parsed by PostgreSQL.
  await sql.query(`
    DO $migration$
    BEGIN
      PERFORM pg_advisory_xact_lock(hashtext('salle-loay-reservation-fields-v2'));

      ALTER TABLE reservations ADD COLUMN IF NOT EXISTS dj_name varchar(120) NOT NULL DEFAULT '';
      ALTER TABLE reservations ADD COLUMN IF NOT EXISTS dj_type varchar(16) NOT NULL DEFAULT 'outsider';
      ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cleaning_count integer NOT NULL DEFAULT 0;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'reservations'::regclass AND conname = 'reservations_dj_type_check'
      ) THEN
        ALTER TABLE reservations ADD CONSTRAINT reservations_dj_type_check
          CHECK (dj_type IN ('internal', 'outsider'));
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'reservations'::regclass AND conname = 'reservations_cleaning_count_check'
      ) THEN
        ALTER TABLE reservations ADD CONSTRAINT reservations_cleaning_count_check
          CHECK (cleaning_count >= 0);
      END IF;

      CREATE TABLE IF NOT EXISTS reservation_legacy_service_costs (
        reservation_date date PRIMARY KEY,
        cook_cost numeric(14,2),
        cleaning_cost numeric(14,2),
        archived_at timestamptz NOT NULL DEFAULT now()
      );

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'reservations' AND column_name = 'cook_cost'
      ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'reservations' AND column_name = 'cleaning_cost'
      ) THEN
        EXECUTE 'INSERT INTO reservation_legacy_service_costs (reservation_date, cook_cost, cleaning_cost)
          SELECT reservation_date, cook_cost, cleaning_cost FROM reservations
          ON CONFLICT (reservation_date) DO NOTHING';
      ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'reservations' AND column_name = 'cook_cost'
      ) THEN
        EXECUTE 'INSERT INTO reservation_legacy_service_costs (reservation_date, cook_cost)
          SELECT reservation_date, cook_cost FROM reservations
          ON CONFLICT (reservation_date) DO NOTHING';
      ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'reservations' AND column_name = 'cleaning_cost'
      ) THEN
        EXECUTE 'INSERT INTO reservation_legacy_service_costs (reservation_date, cleaning_cost)
          SELECT reservation_date, cleaning_cost FROM reservations
          ON CONFLICT (reservation_date) DO NOTHING';
      END IF;

      ALTER TABLE reservations DROP COLUMN IF EXISTS cook_cost;
      ALTER TABLE reservations DROP COLUMN IF EXISTS cleaning_cost;
    END
    $migration$;
  `);
}

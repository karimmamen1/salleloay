import { connectDatabase } from "./database";
import { migrateReservationFields } from "./reservation-migration";

async function main() {
  const sql = connectDatabase();
  await migrateReservationFields(sql);
  console.log("Reservation fields migrated. Legacy service costs were archived before removal.");
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

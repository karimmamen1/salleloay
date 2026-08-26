import { migrateDatabase } from "./database";

void migrateDatabase()
  .then(() => console.log("PostgreSQL schema is up to date."))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });

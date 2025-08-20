// postgres.config.js
import postgres from "postgres";

import { drizzle } from "drizzle-orm/postgres-js";

export function getDb(env) {
  // Wrangler injects env.DB as a Hyperdrive binding
  const connectionString = env.DB?.connectionString;

  if (!connectionString) {
    throw new Error("❌ No DB connection string found. Check wrangler.toml or env vars.");
  }

  const client = postgres(connectionString, { ssl: false }); // disable SSL for local
  return drizzle(client);
}

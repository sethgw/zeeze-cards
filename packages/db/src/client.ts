import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { drizzle } from "drizzle-orm/postgres-js";

import * as schema from "./schema";

if (!process.env.POSTGRES_URL) {
  throw new Error("Missing POSTGRES_URL");
}

export const db: PostgresJsDatabase<typeof schema> = drizzle({
  connection: process.env.POSTGRES_URL,
  schema,
  casing: "snake_case",
});

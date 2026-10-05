import { createClient } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { TURSO_AUTH_TOKEN, TURSO_DATABASE_URL } from "$app/env/private";
import * as schema from "./schema";

// lazy init to avoid build-time crash when env vars are absent
let _db: LibSQLDatabase<typeof schema>;

export function get_db() {
  if (!_db) {
    const client = createClient({
      url: TURSO_DATABASE_URL || "file:sqlite.db",
      authToken: TURSO_AUTH_TOKEN,
    });
    _db = drizzle(client, { schema });
  }
  return _db;
}

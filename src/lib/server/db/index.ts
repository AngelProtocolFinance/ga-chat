import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { env } from "$env/dynamic/private";
import * as schema from "./schema";

// lazy init to avoid build-time crash when POSTGRES_URL is absent
let _db: NeonHttpDatabase<typeof schema>;

export function get_db() {
  if (!_db) {
    const sql = neon(env.POSTGRES_URL!);
    _db = drizzle({ client: sql, schema });
  }
  return _db;
}

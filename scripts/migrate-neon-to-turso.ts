/**
 * one-off migration: neon postgres → turso/libsql
 *
 * usage:
 *   POSTGRES_URL=postgresql://... TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... \
 *     pnpm exec tsx scripts/migrate-neon-to-turso.ts
 *
 * prerequisites:
 *   - push schema to turso first: TURSO_URL=... TURSO_AUTH_TOKEN=... pnpm db:push
 *   - install tsx if not present: pnpm add -D tsx
 */

import { neon } from "@neondatabase/serverless";
import { createClient } from "@libsql/client";

const pg_url = process.env.POSTGRES_URL;
const turso_url = process.env.TURSO_DATABASE_URL;
const turso_token = process.env.TURSO_AUTH_TOKEN;

if (!pg_url || !turso_url || !turso_token) {
  console.error("required: POSTGRES_URL, TURSO_DATABASE_URL, TURSO_AUTH_TOKEN");
  process.exit(1);
}

const sql = neon(pg_url);
const turso = createClient({ url: turso_url, authToken: turso_token });

async function migrate() {
  // read from neon
  const conversations = await sql`SELECT * FROM conversations ORDER BY created_at`;
  const messages = await sql`SELECT * FROM messages ORDER BY created_at`;

  console.log(`found ${conversations.length} conversations, ${messages.length} messages`);

  // insert conversations
  for (const c of conversations) {
    await turso.execute({
      sql: "INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
      args: [c.id, c.title, c.created_at, c.updated_at],
    });
  }
  console.log(`inserted ${conversations.length} conversations`);

  // insert messages
  for (const m of messages) {
    await turso.execute({
      sql: "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
      args: [m.id, m.conversation_id, m.role, m.content, m.created_at],
    });
  }
  console.log(`inserted ${messages.length} messages`);

  console.log("done");
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});

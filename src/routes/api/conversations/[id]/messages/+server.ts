import { eq, sql } from "drizzle-orm";
import { get_db } from "#lib/server/db/index.js";
import { conversations, messages } from "#lib/server/db/schema.js";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ params, request }) => {
  const { messages: msgs } = await request.json();

  await get_db()
    .insert(messages)
    .values(
      msgs.map((m: { role: string; content: string }) => ({
        conversation_id: params.id,
        role: m.role,
        content: m.content,
      })),
    );

  // bump updated_at
  await get_db()
    .update(conversations)
    .set({ updated_at: sql`datetime('now')` })
    .where(eq(conversations.id, params.id));

  return Response.json({ ok: true });
};

import { asc, eq } from "drizzle-orm";
import { get_db } from "#lib/server/db/index.js";
import { conversations, messages } from "#lib/server/db/schema.js";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params }) => {
  const rows = await get_db()
    .select({ id: messages.id, role: messages.role, content: messages.content })
    .from(messages)
    .where(eq(messages.conversation_id, params.id))
    .orderBy(asc(messages.created_at));

  return Response.json(rows);
};

export const DELETE: RequestHandler = async ({ params }) => {
  await get_db().delete(conversations).where(eq(conversations.id, params.id));
  return new Response(null, { status: 204 });
};

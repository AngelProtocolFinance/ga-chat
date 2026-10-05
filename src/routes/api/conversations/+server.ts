import { desc } from "drizzle-orm";
import { get_db } from "#lib/server/db/index.js";
import { conversations } from "#lib/server/db/schema.js";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
  const rows = await get_db()
    .select({
      id: conversations.id,
      title: conversations.title,
      updated_at: conversations.updated_at,
    })
    .from(conversations)
    .orderBy(desc(conversations.updated_at));

  return Response.json(rows);
};

export const POST: RequestHandler = async ({ request }) => {
  const { title } = await request.json();

  const [row] = await get_db()
    .insert(conversations)
    .values({ title })
    .returning({ id: conversations.id, title: conversations.title });

  return Response.json(row, { status: 201 });
};

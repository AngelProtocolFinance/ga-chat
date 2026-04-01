import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const conversations = sqliteTable("conversations", {
  id: text("id")
    .$defaultFn(() => crypto.randomUUID())
    .primaryKey(),
  title: text("title").notNull(),
  created_at: text("created_at")
    .$defaultFn(() => new Date().toISOString())
    .notNull(),
  updated_at: text("updated_at")
    .$defaultFn(() => new Date().toISOString())
    .notNull(),
});

export const messages = sqliteTable("messages", {
  id: text("id")
    .$defaultFn(() => crypto.randomUUID())
    .primaryKey(),
  conversation_id: text("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  created_at: text("created_at")
    .$defaultFn(() => new Date().toISOString())
    .notNull(),
});

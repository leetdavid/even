// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { sql } from "drizzle-orm";
import { index, pgTableCreator } from "drizzle-orm/pg-core";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `even_${name}`);

export const posts = createTable(
  "post",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    name: d.varchar({ length: 256 }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [index("name_idx").on(t.name)],
);

export const expenses = createTable(
  "expense",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    title: d.varchar({ length: 256 }).notNull(),
    amount: d.numeric({ precision: 10, scale: 2 }).notNull(),
    currency: d.varchar({ length: 3 }).default("USD").notNull(),
    category: d.varchar({ length: 100 }),
    description: d.text(),
    date: d.date().notNull(),
    userId: d.varchar({ length: 256 }).notNull(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("user_idx").on(t.userId),
    index("date_idx").on(t.date),
    index("category_idx").on(t.category),
  ],
);

export const friendships = createTable(
  "friendship",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: d.varchar({ length: 256 }).notNull(),
    friendUserId: d.varchar({ length: 256 }).notNull(),
    status: d.varchar({ length: 20 }).default("pending").notNull(), // pending, accepted, declined
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("user_friend_idx").on(t.userId, t.friendUserId),
    index("friend_user_idx").on(t.friendUserId, t.userId),
    index("status_idx").on(t.status),
  ],
);

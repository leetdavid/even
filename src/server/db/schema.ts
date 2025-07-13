// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import { index, pgTableCreator } from "drizzle-orm/pg-core";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `even_${name}`);

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
    userId: d.varchar({ length: 256 }).notNull(), // creator of the expense
    groupId: d.integer(), // optional - expense can belong to a group
    splitMode: d.varchar({ length: 20 }).default("equal").notNull(), // equal, percentage, custom
    paymentMode: d.varchar({ length: 20 }).default("single").notNull(), // single, percentage, custom
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
    index("group_idx").on(t.groupId),
  ],
);

export const friendships = createTable(
  "friendship",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: d.varchar({ length: 256 }).notNull(), // owner of this friendship record
    friendId: d.varchar({ length: 256 }).notNull(), // the friend
    status: d.varchar({ length: 20 }).default("pending").notNull(), // pending, accepted, declined
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("user_friend_idx").on(t.userId, t.friendId),
    index("friend_idx").on(t.friendId),
    index("user_status_idx").on(t.userId, t.status),
    index("status_idx").on(t.status),
  ],
);

export const groups = createTable(
  "group",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    name: d.varchar({ length: 256 }).notNull(),
    description: d.text(),
    createdBy: d.varchar({ length: 256 }).notNull(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("created_by_idx").on(t.createdBy),
    index("name_idx").on(t.name),
  ],
);

export const groupMemberships = createTable(
  "group_membership",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    groupId: d.integer().notNull(),
    userId: d.varchar({ length: 256 }).notNull(),
    role: d.varchar({ length: 20 }).default("member").notNull(), // admin, member
    joinedAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [
    index("group_user_idx").on(t.groupId, t.userId),
    index("user_groups_idx").on(t.userId),
    index("group_members_idx").on(t.groupId),
  ],
);

export const groupInvitations = createTable(
  "group_invitation",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    groupId: d.integer().notNull(),
    invitedUserId: d.varchar({ length: 256 }).notNull(),
    invitedByUserId: d.varchar({ length: 256 }).notNull(),
    status: d.varchar({ length: 20 }).default("pending").notNull(), // pending, accepted, declined, expired
    message: d.text(),
    expiresAt: d.timestamp({ withTimezone: true }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    respondedAt: d.timestamp({ withTimezone: true }),
  }),
  (t) => [
    index("group_invite_idx").on(t.groupId, t.invitedUserId),
    index("invited_user_idx").on(t.invitedUserId),
    index("inviter_idx").on(t.invitedByUserId),
    index("invite_status_idx").on(t.status),
  ],
);

export const expenseSplits = createTable(
  "expense_split",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    expenseId: d.integer().notNull(),
    userId: d.varchar({ length: 256 }).notNull(),
    amount: d.numeric({ precision: 10, scale: 2 }).notNull(), // amount this user owes/paid
    percentage: d.numeric({ precision: 5, scale: 2 }), // percentage split (0-100)
    isPaid: d.boolean().default(false).notNull(),
    paidAt: d.timestamp({ withTimezone: true }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("expense_user_idx").on(t.expenseId, t.userId),
    index("expense_idx").on(t.expenseId),
    index("user_splits_idx").on(t.userId),
    index("paid_status_idx").on(t.isPaid),
  ],
);

export const expensePayments = createTable(
  "expense_payment",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    expenseId: d.integer().notNull(),
    userId: d.varchar({ length: 256 }).notNull(), // who paid
    amount: d.numeric({ precision: 10, scale: 2 }).notNull(), // amount they paid
    percentage: d.numeric({ precision: 5, scale: 2 }), // percentage of total they paid (0-100)
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("expense_payment_idx").on(t.expenseId, t.userId),
    index("payment_expense_idx").on(t.expenseId),
    index("payment_user_idx").on(t.userId),
  ],
);

export const expenseHistory = createTable(
  "expense_history",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    expenseId: d.integer().notNull(),
    editedBy: d.varchar({ length: 256 }).notNull(), // user who made the edit
    changeType: d.varchar({ length: 50 }).notNull(), // created, updated, deleted
    changes: d.json(), // JSON object with before/after values
    editReason: d.text(), // optional reason for the edit
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [
    index("expense_history_idx").on(t.expenseId),
    index("edited_by_idx").on(t.editedBy),
    index("change_type_idx").on(t.changeType),
  ],
);

export const expenseComments = createTable(
  "expense_comment",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    expenseId: d.integer().notNull(),
    userId: d.varchar({ length: 256 }).notNull(), // user who made the comment
    comment: d.text().notNull(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("expense_comment_idx").on(t.expenseId),
    index("comment_user_idx").on(t.userId),
  ],
);

// Relations
export const expensesRelations = relations(expenses, ({ one, many }) => ({
  group: one(groups, {
    fields: [expenses.groupId],
    references: [groups.id],
  }),
  splits: many(expenseSplits),
  payments: many(expensePayments),
  history: many(expenseHistory),
  comments: many(expenseComments),
}));

export const expenseSplitsRelations = relations(expenseSplits, ({ one }) => ({
  expense: one(expenses, {
    fields: [expenseSplits.expenseId],
    references: [expenses.id],
  }),
}));

export const expensePaymentsRelations = relations(expensePayments, ({ one }) => ({
  expense: one(expenses, {
    fields: [expensePayments.expenseId],
    references: [expenses.id],
  }),
}));

export const expenseHistoryRelations = relations(expenseHistory, ({ one }) => ({
  expense: one(expenses, {
    fields: [expenseHistory.expenseId],
    references: [expenses.id],
  }),
}));

export const expenseCommentsRelations = relations(expenseComments, ({ one }) => ({
  expense: one(expenses, {
    fields: [expenseComments.expenseId],
    references: [expenses.id],
  }),
}));

export const groupsRelations = relations(groups, ({ many }) => ({
  memberships: many(groupMemberships),
  expenses: many(expenses),
}));

export const groupMembershipsRelations = relations(
  groupMemberships,
  ({ one }) => ({
    group: one(groups, {
      fields: [groupMemberships.groupId],
      references: [groups.id],
    }),
  }),
);

export const groupInvitationsRelations = relations(
  groupInvitations,
  ({ one }) => ({
    group: one(groups, {
      fields: [groupInvitations.groupId],
      references: [groups.id],
    }),
  }),
);

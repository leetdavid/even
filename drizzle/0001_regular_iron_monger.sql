CREATE TABLE "even_expense_split" (
	"id" integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY (sequence name "even_expense_split_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"expenseId" integer NOT NULL,
	"userId" varchar(256) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"percentage" numeric(5, 2),
	"isPaid" boolean DEFAULT false NOT NULL,
	"paidAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "even_group_membership" (
	"id" integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY (sequence name "even_group_membership_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"groupId" integer NOT NULL,
	"userId" varchar(256) NOT NULL,
	"role" varchar(20) DEFAULT 'member' NOT NULL,
	"joinedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "even_group" (
	"id" integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY (sequence name "even_group_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(256) NOT NULL,
	"description" text,
	"createdBy" varchar(256) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "even_post" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "even_post" CASCADE;--> statement-breakpoint
ALTER TABLE "even_expense" ADD COLUMN "groupId" integer;--> statement-breakpoint
ALTER TABLE "even_expense" ADD COLUMN "splitMode" varchar(20) DEFAULT 'personal' NOT NULL;--> statement-breakpoint
ALTER TABLE "even_expense" ADD COLUMN "isShared" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "expense_user_idx" ON "even_expense_split" USING btree ("expenseId","userId");--> statement-breakpoint
CREATE INDEX "expense_idx" ON "even_expense_split" USING btree ("expenseId");--> statement-breakpoint
CREATE INDEX "user_splits_idx" ON "even_expense_split" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "paid_status_idx" ON "even_expense_split" USING btree ("isPaid");--> statement-breakpoint
CREATE INDEX "group_user_idx" ON "even_group_membership" USING btree ("groupId","userId");--> statement-breakpoint
CREATE INDEX "user_groups_idx" ON "even_group_membership" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "group_members_idx" ON "even_group_membership" USING btree ("groupId");--> statement-breakpoint
CREATE INDEX "created_by_idx" ON "even_group" USING btree ("createdBy");--> statement-breakpoint
CREATE INDEX "name_idx" ON "even_group" USING btree ("name");--> statement-breakpoint
CREATE INDEX "group_idx" ON "even_expense" USING btree ("groupId");--> statement-breakpoint
CREATE INDEX "shared_idx" ON "even_expense" USING btree ("isShared");
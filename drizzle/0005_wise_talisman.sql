ALTER TABLE "even_expense" ADD COLUMN "paidBy" varchar(256) NOT NULL;--> statement-breakpoint
CREATE INDEX "paid_by_idx" ON "even_expense" USING btree ("paidBy");
DROP INDEX "shared_idx";--> statement-breakpoint
ALTER TABLE "even_expense" ALTER COLUMN "splitMode" SET DEFAULT 'equal';--> statement-breakpoint
ALTER TABLE "even_expense" DROP COLUMN "isShared";
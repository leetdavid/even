ALTER TABLE "even_group" ADD COLUMN "uuid" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
CREATE INDEX "uuid_idx" ON "even_group" USING btree ("uuid");--> statement-breakpoint
ALTER TABLE "even_group" ADD CONSTRAINT "even_group_uuid_unique" UNIQUE("uuid");
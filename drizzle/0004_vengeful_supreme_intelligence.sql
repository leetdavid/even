ALTER TABLE "even_friendship" RENAME COLUMN "friendUserId" TO "friendId";--> statement-breakpoint
DROP INDEX "friend_user_idx";--> statement-breakpoint
DROP INDEX "user_friend_idx";--> statement-breakpoint
CREATE INDEX "friend_idx" ON "even_friendship" USING btree ("friendId");--> statement-breakpoint
CREATE INDEX "user_status_idx" ON "even_friendship" USING btree ("userId","status");--> statement-breakpoint
CREATE INDEX "user_friend_idx" ON "even_friendship" USING btree ("userId","friendId");
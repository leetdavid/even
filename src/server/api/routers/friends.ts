import { z } from "zod";
import { and, eq, or } from "drizzle-orm";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { friendships } from "@/server/db/schema";

export const friendsRouter = createTRPCRouter({
  sendFriendRequest: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        friendEmail: z.string().email(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Prevent users from adding themselves
      if (input.friendEmail === input.userId) {
        throw new Error("You cannot add yourself as a friend");
      }

      // Check if friendship already exists (checking both email patterns for now)
      const existingFriendship = await ctx.db.query.friendships.findFirst({
        where: or(
          and(
            eq(friendships.userId, input.userId),
            eq(friendships.friendUserId, input.friendEmail)
          ),
          and(
            eq(friendships.userId, input.friendEmail),
            eq(friendships.friendUserId, input.userId)
          )
        ),
      });

      if (existingFriendship) {
        if (existingFriendship.status === "pending") {
          throw new Error("Friend request already sent");
        } else if (existingFriendship.status === "accepted") {
          throw new Error("You are already friends");
        } else {
          throw new Error("Friend request was previously declined");
        }
      }

      // For now, store email as friendUserId
      // In production, this would be replaced with actual Clerk user lookup
      await ctx.db.insert(friendships).values({
        userId: input.userId,
        friendUserId: input.friendEmail,
        status: "pending",
      });

      return { success: true, message: "Friend request sent successfully!" };
    }),

  getFriendRequests: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const requests = await ctx.db.query.friendships.findMany({
        where: and(
          eq(friendships.friendUserId, input.userId),
          eq(friendships.status, "pending")
        ),
      });

      return requests;
    }),

  getFriends: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const friends = await ctx.db.query.friendships.findMany({
        where: and(
          or(
            eq(friendships.userId, input.userId),
            eq(friendships.friendUserId, input.userId)
          ),
          eq(friendships.status, "accepted")
        ),
      });

      return friends;
    }),

  respondToFriendRequest: publicProcedure
    .input(
      z.object({
        friendshipId: z.number(),
        response: z.enum(["accepted", "declined"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(friendships)
        .set({ status: input.response })
        .where(eq(friendships.id, input.friendshipId));

      const message = input.response === "accepted" 
        ? "Friend request accepted!" 
        : "Friend request declined";
      
      return { success: true, message };
    }),

  removeFriend: publicProcedure
    .input(z.object({ friendshipId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(friendships)
        .where(eq(friendships.id, input.friendshipId));

      return { success: true, message: "Friend removed successfully" };
    }),
});
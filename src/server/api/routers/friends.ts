import { z } from "zod";
import { and, eq, or } from "drizzle-orm";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { friendships } from "@/server/db/schema";
import {
  getUserDisplayName,
  getUserDisplayInfo,
} from "@/server/utils/userUtils";

export const friendsRouter = createTRPCRouter({
  // Debug endpoint to see friendship data
  debugRequests: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        userEmail: z.string().email().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const allRequests = await ctx.db.query.friendships.findMany({
        where: eq(friendships.status, "pending"),
      });

      return {
        inputUserId: input.userId,
        inputUserEmail: input.userEmail,
        allPendingRequests: allRequests,
        requestsForUser: allRequests.filter(
          (r) =>
            r.friendId === input.userId ||
            (input.userEmail && r.friendId === input.userEmail),
        ),
      };
    }),
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

      // Check if friendship already exists (only need to check one direction for pending)
      const existingRequest = await ctx.db.query.friendships.findFirst({
        where: and(
          eq(friendships.userId, input.userId),
          eq(friendships.friendId, input.friendEmail),
          eq(friendships.status, "pending"),
        ),
      });

      if (existingRequest) {
        throw new Error("Friend request already sent");
      }

      // Check if they're already friends (either direction)
      const existingFriendship = await ctx.db.query.friendships.findFirst({
        where: and(
          eq(friendships.userId, input.userId),
          eq(friendships.friendId, input.friendEmail),
          eq(friendships.status, "accepted"),
        ),
      });

      if (existingFriendship) {
        throw new Error("You are already friends");
      }

      // Create the friend request (single directional record)
      await ctx.db.insert(friendships).values({
        userId: input.userId,
        friendId: input.friendEmail,
        status: "pending",
      });

      return { success: true, message: "Friend request sent successfully!" };
    }),

  getFriendRequests: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        userEmail: z.string().email().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get friend requests where someone invited the current user
      // Check both userId and userEmail since we might store emails in friendId
      const whereConditions = [
        and(
          eq(friendships.friendId, input.userId),
          eq(friendships.status, "pending"),
        ),
      ];

      // If userEmail is provided, also check for requests sent to that email
      if (input.userEmail) {
        whereConditions.push(
          and(
            eq(friendships.friendId, input.userEmail),
            eq(friendships.status, "pending"),
          ),
        );
      }

      const requests = await ctx.db.query.friendships.findMany({
        where: or(...whereConditions),
      });

      // Fetch user display names and emails for the requesters
      const requestsWithNames = await Promise.all(
        requests.map(async (request) => {
          try {
            const senderInfo = await getUserDisplayInfo(request.userId);
            return {
              ...request,
              senderName: senderInfo.name,
              senderEmail: senderInfo.email,
            };
          } catch (error) {
            console.error("Failed to fetch sender info:", error);
            return {
              ...request,
              senderName: request.userId,
              senderEmail: "Unknown email",
            };
          }
        }),
      );

      return requestsWithNames;
    }),

  getSentFriendRequests: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const sentRequests = await ctx.db.query.friendships.findMany({
        where: and(
          eq(friendships.userId, input.userId),
          eq(friendships.status, "pending"),
        ),
      });

      // Fetch user display names and emails for the people we sent requests to
      const sentRequestsWithNames = await Promise.all(
        sentRequests.map(async (request) => {
          try {
            // If friendId looks like an email, use email as both name and email
            if (request.friendId.includes("@")) {
              return {
                ...request,
                recipientName: request.friendId,
                recipientEmail: request.friendId,
              };
            }

            // Otherwise, fetch from Clerk
            const recipientInfo = await getUserDisplayInfo(request.friendId);
            return {
              ...request,
              recipientName: recipientInfo.name,
              recipientEmail: recipientInfo.email,
            };
          } catch (error) {
            console.error("Failed to fetch recipient info:", error);
            return {
              ...request,
              recipientName: request.friendId,
              recipientEmail: "Unknown email",
            };
          }
        }),
      );

      return sentRequestsWithNames;
    }),

  getFriends: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Simple query - just get all accepted friendships for this user
      const friends = await ctx.db.query.friendships.findMany({
        where: and(
          eq(friendships.userId, input.userId),
          eq(friendships.status, "accepted"),
        ),
      });

      // Fetch user display names for the friends
      const friendsWithNames = await Promise.all(
        friends.map(async (friendship) => {
          // If friendId looks like an email, use email as display name
          const friendName = friendship.friendId.includes("@")
            ? friendship.friendId
            : await getUserDisplayName(friendship.friendId);

          return {
            ...friendship,
            friendName,
          };
        }),
      );

      return friendsWithNames;
    }),

  respondToFriendRequest: publicProcedure
    .input(
      z.object({
        friendshipId: z.number(),
        response: z.enum(["accepted", "declined"]),
        userId: z.string(), // Add userId to know who is accepting
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const friendship = await ctx.db.query.friendships.findFirst({
        where: eq(friendships.id, input.friendshipId),
      });

      if (!friendship) {
        throw new Error("Friendship not found");
      }

      if (input.response === "accepted") {
        // Update the original request to accepted
        await ctx.db
          .update(friendships)
          .set({ status: "accepted" })
          .where(eq(friendships.id, input.friendshipId));

        // Create the bidirectional friendship record
        // Convert email to actual user ID if necessary
        // friendId variable removed as it's not needed
        const requesterId = friendship.userId;

        // Create the reverse friendship record
        await ctx.db.insert(friendships).values({
          userId: input.userId, // The person accepting becomes the owner
          friendId: requesterId, // The original requester becomes the friend
          status: "accepted",
        });

        // If the original request used an email, update it to use the actual user ID
        if (friendship.friendId.includes("@")) {
          await ctx.db
            .update(friendships)
            .set({ friendId: input.userId })
            .where(eq(friendships.id, input.friendshipId));
        }
      } else {
        // For declined requests, just update status
        await ctx.db
          .update(friendships)
          .set({ status: input.response })
          .where(eq(friendships.id, input.friendshipId));
      }

      const message =
        input.response === "accepted"
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

  cancelFriendRequest: publicProcedure
    .input(
      z.object({
        friendshipId: z.number(),
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const request = await ctx.db.query.friendships.findFirst({
        where: and(
          eq(friendships.id, input.friendshipId),
          eq(friendships.userId, input.userId),
          eq(friendships.status, "pending"),
        ),
      });

      if (!request) {
        throw new Error(
          "Friend request not found or you are not authorized to cancel it.",
        );
      }

      await ctx.db
        .delete(friendships)
        .where(eq(friendships.id, input.friendshipId));

      return { success: true, message: "Friend request cancelled" };
    }),
});

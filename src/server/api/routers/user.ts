import { z } from "zod";
import { clerkClient } from "@clerk/nextjs/server";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const userRouter = createTRPCRouter({
  updateDisplayName: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        displayName: z.string().min(1).max(50), // Reasonable limits for display names
      }),
    )
    .mutation(async ({ input }) => {
      try {
        // Update the user's public metadata with the custom display name
        await (
          await clerkClient()
        ).users.updateUserMetadata(input.userId, {
          publicMetadata: {
            displayName: input.displayName.trim(),
          },
        });

        return {
          success: true,
          message: "Display name updated successfully!",
        };
      } catch (error) {
        console.error("Failed to update display name:", error);
        throw new Error("Failed to update display name");
      }
    }),

  getCurrentUser: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      try {
        const user = await (await clerkClient()).users.getUser(input.userId);

        // Get display name from public metadata first, then fall back to Clerk profile
        const customDisplayName = user.publicMetadata?.displayName as
          | string
          | undefined;
        const profileDisplayName =
          user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : (user.firstName ??
              user.lastName ??
              user.emailAddresses[0]?.emailAddress ??
              input.userId);

        return {
          id: user.id,
          displayName: customDisplayName ?? profileDisplayName,
          hasCustomDisplayName: !!customDisplayName,
          email: user.emailAddresses[0]?.emailAddress,
          firstName: user.firstName,
          lastName: user.lastName,
        };
      } catch (error) {
        console.error("Failed to fetch user:", error);
        throw new Error("Failed to fetch user information");
      }
    }),

  // Helper function to get display name for any user ID
  getDisplayName: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      try {
        const user = await (await clerkClient()).users.getUser(input.userId);

        // Check public metadata first for custom display name
        const customDisplayName = user.publicMetadata?.displayName as
          | string
          | undefined;
        if (customDisplayName) {
          return customDisplayName;
        }

        // Fall back to profile name or email
        const displayName =
          user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : (user.firstName ??
              user.lastName ??
              user.emailAddresses[0]?.emailAddress ??
              input.userId);

        return displayName;
      } catch (error) {
        console.error(
          "Failed to fetch display name for user:",
          input.userId,
          error,
        );
        return input.userId; // Fallback to user ID if everything fails
      }
    }),
});

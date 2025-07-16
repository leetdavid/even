import { clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import {
  groups,
  groupMemberships,
  groupInvitations,
  friendships,
} from "@/server/db/schema";
import { getUserDisplayInfo } from "@/server/utils/userUtils";

export const groupsRouter = createTRPCRouter({
  // Debug endpoint to troubleshoot friends data
  debugFriendsData: publicProcedure
    .input(
      z.object({
        groupId: z.number(),
        userId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get user's friends (both directions)
      const userFriends = await ctx.db.query.friendships.findMany({
        where: and(
          eq(friendships.status, "accepted"),
          eq(friendships.userId, input.userId),
        ),
      });

      const reverseFriends = await ctx.db.query.friendships.findMany({
        where: and(
          eq(friendships.status, "accepted"),
          eq(friendships.friendId, input.userId),
        ),
      });

      // Get all friendships (for debugging)
      const allFriendships = await ctx.db.query.friendships.findMany();

      // Get group members
      const groupMembers = await ctx.db
        .select({ userId: groupMemberships.userId })
        .from(groupMemberships)
        .where(eq(groupMemberships.groupId, input.groupId));

      return {
        inputUserId: input.userId,
        inputGroupId: input.groupId,
        userFriends,
        reverseFriends,
        allFriendships,
        groupMembers,
        totalFriendships: allFriendships.length,
      };
    }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(256),
        description: z.string().optional(),
        createdBy: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [group]: { id: number }[] = await ctx.db
        .insert(groups)
        .values({
          name: input.name,
          description: input.description,
          createdBy: input.createdBy,
        })
        .returning({ id: groups.id });

      // Add creator as admin member
      await ctx.db.insert(groupMemberships).values({
        groupId: group!.id,
        userId: input.createdBy,
        role: "admin",
      });

      return {
        success: true,
        groupId: group!.id,
        message: "Group created successfully!",
      };
    }),

  getUserGroups: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userGroups = await ctx.db
        .select({
          id: groups.id,
          uuid: groups.uuid,
          name: groups.name,
          description: groups.description,
          createdBy: groups.createdBy,
          createdAt: groups.createdAt,
          role: groupMemberships.role,
          joinedAt: groupMemberships.joinedAt,
        })
        .from(groups)
        .innerJoin(groupMemberships, eq(groups.id, groupMemberships.groupId))
        .where(eq(groupMemberships.userId, input.userId));

      return userGroups;
    }),

  getGroupByUuid: publicProcedure
    .input(z.object({ uuid: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const group = await ctx.db.query.groups.findFirst({
        where: eq(groups.uuid, input.uuid),
      });

      if (!group) {
        throw new Error("Group not found");
      }

      return group;
    }),

  getGroupDetails: publicProcedure
    .input(z.object({ groupId: z.number() }))
    .query(async ({ ctx, input }) => {
      const group = await ctx.db.query.groups.findFirst({
        where: eq(groups.id, input.groupId),
      });

      if (!group) {
        throw new Error("Group not found");
      }

      const members = await ctx.db
        .select({
          id: groupMemberships.id,
          userId: groupMemberships.userId,
          role: groupMemberships.role,
          joinedAt: groupMemberships.joinedAt,
        })
        .from(groupMemberships)
        .where(eq(groupMemberships.groupId, input.groupId));

      return { group, members };
    }),

  updateGroup: publicProcedure
    .input(
      z.object({
        groupId: z.number(),
        userId: z.string(),
        name: z.string().min(1).max(256).optional(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin of the group
      const membership = await ctx.db.query.groupMemberships.findFirst({
        where: and(
          eq(groupMemberships.groupId, input.groupId),
          eq(groupMemberships.userId, input.userId),
          eq(groupMemberships.role, "admin"),
        ),
      });

      if (!membership) {
        throw new Error("Only group admins can update group details");
      }

      const updateData: {
        name?: string;
        description?: string;
      } = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined)
        updateData.description = input.description;

      await ctx.db
        .update(groups)
        .set(updateData)
        .where(eq(groups.id, input.groupId));

      return { success: true, message: "Group updated successfully!" };
    }),

  deleteGroup: publicProcedure
    .input(
      z.object({
        groupId: z.number(),
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is the creator or admin
      const group = await ctx.db.query.groups.findFirst({
        where: eq(groups.id, input.groupId),
      });

      if (!group) {
        throw new Error("Group not found");
      }

      const membership = await ctx.db.query.groupMemberships.findFirst({
        where: and(
          eq(groupMemberships.groupId, input.groupId),
          eq(groupMemberships.userId, input.userId),
          eq(groupMemberships.role, "admin"),
        ),
      });

      if (!membership && group.createdBy !== input.userId) {
        throw new Error("Only group creator or admins can delete the group");
      }

      // Delete all memberships first
      await ctx.db
        .delete(groupMemberships)
        .where(eq(groupMemberships.groupId, input.groupId));

      // Delete the group
      await ctx.db.delete(groups).where(eq(groups.id, input.groupId));

      return { success: true, message: "Group deleted successfully!" };
    }),

  addMember: publicProcedure
    .input(
      z.object({
        groupId: z.number(),
        userId: z.string(),
        memberUserId: z.string(),
        role: z.enum(["admin", "member"]).default("member"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin of the group
      const adminMembership = await ctx.db.query.groupMemberships.findFirst({
        where: and(
          eq(groupMemberships.groupId, input.groupId),
          eq(groupMemberships.userId, input.userId),
          eq(groupMemberships.role, "admin"),
        ),
      });

      if (!adminMembership) {
        throw new Error("Only group admins can add members");
      }

      // Check if member is already in the group
      const existingMembership = await ctx.db.query.groupMemberships.findFirst({
        where: and(
          eq(groupMemberships.groupId, input.groupId),
          eq(groupMemberships.userId, input.memberUserId),
        ),
      });

      if (existingMembership) {
        throw new Error("User is already a member of this group");
      }

      await ctx.db.insert(groupMemberships).values({
        groupId: input.groupId,
        userId: input.memberUserId,
        role: input.role,
      });

      return { success: true, message: "Member added successfully!" };
    }),

  removeMember: publicProcedure
    .input(
      z.object({
        groupId: z.number(),
        userId: z.string(),
        memberUserId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin or removing themselves
      const adminMembership = await ctx.db.query.groupMemberships.findFirst({
        where: and(
          eq(groupMemberships.groupId, input.groupId),
          eq(groupMemberships.userId, input.userId),
          eq(groupMemberships.role, "admin"),
        ),
      });

      const isSelfRemoval = input.userId === input.memberUserId;

      if (!adminMembership && !isSelfRemoval) {
        throw new Error(
          "Only admins can remove members, or members can remove themselves",
        );
      }

      await ctx.db
        .delete(groupMemberships)
        .where(
          and(
            eq(groupMemberships.groupId, input.groupId),
            eq(groupMemberships.userId, input.memberUserId),
          ),
        );

      return {
        success: true,
        message: isSelfRemoval
          ? "Left group successfully!"
          : "Member removed successfully!",
      };
    }),

  getFriendsNotInGroup: publicProcedure
    .input(
      z.object({
        groupId: z.number(),
        userId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get user's friends
      const userFriends = await ctx.db.query.friendships.findMany({
        where: and(
          eq(friendships.status, "accepted"),
          eq(friendships.userId, input.userId),
        ),
      });

      const reverseFriends = await ctx.db.query.friendships.findMany({
        where: and(
          eq(friendships.status, "accepted"),
          eq(friendships.friendId, input.userId),
        ),
      });

      // Combine all friend user IDs and deduplicate
      const friendIds = Array.from(
        new Set([
          ...userFriends.map((f) => f.friendId),
          ...reverseFriends.map((f) => f.userId),
        ]),
      );

      if (friendIds.length === 0) {
        return [];
      }

      // Get existing group members
      const groupMembers = await ctx.db
        .select({ userId: groupMemberships.userId })
        .from(groupMemberships)
        .where(eq(groupMemberships.groupId, input.groupId));

      const memberIds = groupMembers.map((m) => m.userId);

      // Filter friends not in group
      const friendsNotInGroup = friendIds.filter(
        (friendId) => !memberIds.includes(friendId),
      );

      // Fetch display information for each friend
      const friendsWithDisplayInfo = await Promise.all(
        friendsNotInGroup.map(async (friendId) => {
          try {
            const displayInfo = await getUserDisplayInfo(friendId);
            return {
              userId: friendId,
              name: displayInfo.name,
              email: displayInfo.email,
            };
          } catch (err) {
            console.error("Failed to fetch friend display info:", err);
            return {
              userId: friendId,
              name: friendId,
              email: friendId.includes("@") ? friendId : "Unknown",
            };
          }
        }),
      );

      return friendsWithDisplayInfo;
    }),

  inviteToGroup: publicProcedure
    .input(
      z.object({
        groupId: z.number(),
        invitedUserId: z.string(),
        invitedByUserId: z.string(),
        message: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin of the group
      const adminMembership = await ctx.db.query.groupMemberships.findFirst({
        where: and(
          eq(groupMemberships.groupId, input.groupId),
          eq(groupMemberships.userId, input.invitedByUserId),
          eq(groupMemberships.role, "admin"),
        ),
      });

      if (!adminMembership) {
        throw new Error("Only group admins can send invitations");
      }

      // Check if user is already a member
      const existingMembership = await ctx.db.query.groupMemberships.findFirst({
        where: and(
          eq(groupMemberships.groupId, input.groupId),
          eq(groupMemberships.userId, input.invitedUserId),
        ),
      });

      if (existingMembership) {
        throw new Error("User is already a member of this group");
      }

      // Check if there's already a pending invitation
      const existingInvitation = await ctx.db.query.groupInvitations.findFirst({
        where: and(
          eq(groupInvitations.groupId, input.groupId),
          eq(groupInvitations.invitedUserId, input.invitedUserId),
          eq(groupInvitations.status, "pending"),
        ),
      });

      if (existingInvitation) {
        throw new Error("User already has a pending invitation to this group");
      }

      // Create invitation with 7-day expiry
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);

      await ctx.db.insert(groupInvitations).values({
        groupId: input.groupId,
        invitedUserId: input.invitedUserId,
        invitedByUserId: input.invitedByUserId,
        message: input.message,
        expiresAt: expiryDate,
        status: "pending",
      });

      return { success: true, message: "Invitation sent successfully!" };
    }),

  inviteByEmailToGroup: publicProcedure
    .input(
      z.object({
        groupId: z.number(),
        email: z.string().email(),
        invitedByUserId: z.string(),
        message: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const usersResponse = await (
        await clerkClient()
      ).users.getUserList({
        emailAddress: [input.email],
      });
      const users = usersResponse.data;

      if (users.length === 0) {
        throw new Error("User with that email address not found.");
      }

      const invitedUserId = users[0]!.id;

      // Check if user is admin of the group
      const adminMembership = await ctx.db.query.groupMemberships.findFirst({
        where: and(
          eq(groupMemberships.groupId, input.groupId),
          eq(groupMemberships.userId, input.invitedByUserId),
          eq(groupMemberships.role, "admin"),
        ),
      });

      if (!adminMembership) {
        throw new Error("Only group admins can send invitations");
      }

      // Check if user is already a member
      const existingMembership = await ctx.db.query.groupMemberships.findFirst({
        where: and(
          eq(groupMemberships.groupId, input.groupId),
          eq(groupMemberships.userId, invitedUserId),
        ),
      });

      if (existingMembership) {
        throw new Error("User is already a member of this group");
      }

      // Check if there's already a pending invitation
      const existingInvitation = await ctx.db.query.groupInvitations.findFirst({
        where: and(
          eq(groupInvitations.groupId, input.groupId),
          eq(groupInvitations.invitedUserId, invitedUserId),
          eq(groupInvitations.status, "pending"),
        ),
      });

      if (existingInvitation) {
        throw new Error("User already has a pending invitation to this group");
      }

      // Create invitation with 7-day expiry
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);

      await ctx.db.insert(groupInvitations).values({
        groupId: input.groupId,
        invitedUserId: invitedUserId,
        invitedByUserId: input.invitedByUserId,
        message: input.message,
        expiresAt: expiryDate,
        status: "pending",
      });

      return { success: true, message: "Invitation sent successfully!" };
    }),

  getUserInvitations: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const invitations = await ctx.db
        .select({
          id: groupInvitations.id,
          groupId: groupInvitations.groupId,
          groupName: groups.name,
          invitedByUserId: groupInvitations.invitedByUserId,
          message: groupInvitations.message,
          status: groupInvitations.status,
          createdAt: groupInvitations.createdAt,
          expiresAt: groupInvitations.expiresAt,
        })
        .from(groupInvitations)
        .innerJoin(groups, eq(groupInvitations.groupId, groups.id))
        .where(
          and(
            eq(groupInvitations.invitedUserId, input.userId),
            eq(groupInvitations.status, "pending"),
          ),
        );

      return invitations;
    }),

  respondToInvitation: publicProcedure
    .input(
      z.object({
        invitationId: z.number(),
        userId: z.string(),
        response: z.enum(["accepted", "declined"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get the invitation
      const invitation = await ctx.db.query.groupInvitations.findFirst({
        where: and(
          eq(groupInvitations.id, input.invitationId),
          eq(groupInvitations.invitedUserId, input.userId),
          eq(groupInvitations.status, "pending"),
        ),
      });

      if (!invitation) {
        throw new Error("Invitation not found or already responded to");
      }

      // Check if invitation has expired
      if (invitation.expiresAt && new Date() > invitation.expiresAt) {
        await ctx.db
          .update(groupInvitations)
          .set({ status: "expired", respondedAt: new Date() })
          .where(eq(groupInvitations.id, input.invitationId));

        throw new Error("This invitation has expired");
      }

      // Update invitation status
      await ctx.db
        .update(groupInvitations)
        .set({
          status: input.response,
          respondedAt: new Date(),
        })
        .where(eq(groupInvitations.id, input.invitationId));

      // If accepted, add user to group
      if (input.response === "accepted") {
        await ctx.db.insert(groupMemberships).values({
          groupId: invitation.groupId,
          userId: input.userId,
          role: "member",
        });
      }

      const message =
        input.response === "accepted"
          ? "Invitation accepted! You've joined the group."
          : "Invitation declined.";

      return { success: true, message };
    }),

  getGroupInvitations: publicProcedure
    .input(z.object({ groupId: z.number() }))
    .query(async ({ ctx, input }) => {
      const invitations = await ctx.db
        .select({
          id: groupInvitations.id,
          invitedUserId: groupInvitations.invitedUserId,
          invitedByUserId: groupInvitations.invitedByUserId,
          message: groupInvitations.message,
          status: groupInvitations.status,
          createdAt: groupInvitations.createdAt,
          expiresAt: groupInvitations.expiresAt,
        })
        .from(groupInvitations)
        .where(eq(groupInvitations.groupId, input.groupId));

      return invitations;
    }),

  cancelInvitation: publicProcedure
    .input(
      z.object({
        invitationId: z.number(),
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get the invitation to check permissions
      const invitation = await ctx.db.query.groupInvitations.findFirst({
        where: eq(groupInvitations.id, input.invitationId),
      });

      if (!invitation) {
        throw new Error("Invitation not found");
      }

      // Check if user is admin of the group or the one who sent the invitation
      const adminMembership = await ctx.db.query.groupMemberships.findFirst({
        where: and(
          eq(groupMemberships.groupId, invitation.groupId),
          eq(groupMemberships.userId, input.userId),
          eq(groupMemberships.role, "admin"),
        ),
      });

      if (!adminMembership && invitation.invitedByUserId !== input.userId) {
        throw new Error(
          "Only group admins or the invitation sender can cancel invitations",
        );
      }

      await ctx.db
        .delete(groupInvitations)
        .where(eq(groupInvitations.id, input.invitationId));

      return { success: true, message: "Invitation cancelled successfully" };
    }),

  promoteToAdmin: publicProcedure
    .input(
      z.object({
        groupId: z.number(),
        userId: z.string(), // user making the request (must be admin)
        memberUserId: z.string(), // user to promote
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin of the group
      const adminMembership = await ctx.db.query.groupMemberships.findFirst({
        where: and(
          eq(groupMemberships.groupId, input.groupId),
          eq(groupMemberships.userId, input.userId),
          eq(groupMemberships.role, "admin"),
        ),
      });

      if (!adminMembership) {
        throw new Error("Only group admins can promote members");
      }

      // Check if the member to promote exists in the group
      const memberToPromote = await ctx.db.query.groupMemberships.findFirst({
        where: and(
          eq(groupMemberships.groupId, input.groupId),
          eq(groupMemberships.userId, input.memberUserId),
        ),
      });

      if (!memberToPromote) {
        throw new Error("Member not found in this group");
      }

      if (memberToPromote.role === "admin") {
        throw new Error("Member is already an admin");
      }

      // Promote the member to admin
      await ctx.db
        .update(groupMemberships)
        .set({ role: "admin" })
        .where(
          and(
            eq(groupMemberships.groupId, input.groupId),
            eq(groupMemberships.userId, input.memberUserId),
          ),
        );

      return {
        success: true,
        message: "Member promoted to admin successfully!",
      };
    }),

  demoteFromAdmin: publicProcedure
    .input(
      z.object({
        groupId: z.number(),
        userId: z.string(), // user making the request (must be admin)
        memberUserId: z.string(), // user to demote
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin of the group
      const adminMembership = await ctx.db.query.groupMemberships.findFirst({
        where: and(
          eq(groupMemberships.groupId, input.groupId),
          eq(groupMemberships.userId, input.userId),
          eq(groupMemberships.role, "admin"),
        ),
      });

      if (!adminMembership) {
        throw new Error("Only group admins can demote members");
      }

      // Check if the member to demote exists in the group
      const memberToDemote = await ctx.db.query.groupMemberships.findFirst({
        where: and(
          eq(groupMemberships.groupId, input.groupId),
          eq(groupMemberships.userId, input.memberUserId),
        ),
      });

      if (!memberToDemote) {
        throw new Error("Member not found in this group");
      }

      if (memberToDemote.role !== "admin") {
        throw new Error("Member is not an admin");
      }

      // Prevent demoting self if they're the only admin
      const allAdmins = await ctx.db.query.groupMemberships.findMany({
        where: and(
          eq(groupMemberships.groupId, input.groupId),
          eq(groupMemberships.role, "admin"),
        ),
      });

      if (allAdmins.length === 1 && input.memberUserId === input.userId) {
        throw new Error("Cannot demote yourself as the only admin");
      }

      // Demote the member
      await ctx.db
        .update(groupMemberships)
        .set({ role: "member" })
        .where(
          and(
            eq(groupMemberships.groupId, input.groupId),
            eq(groupMemberships.userId, input.memberUserId),
          ),
        );

      return {
        success: true,
        message: "Admin demoted to member successfully!",
      };
    }),
});

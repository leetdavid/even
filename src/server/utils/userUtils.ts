import { clerkClient } from "@clerk/nextjs/server";

export async function getUserDisplayName(userId: string): Promise<string> {
  try {
    const user = await (await clerkClient()).users.getUser(userId);

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
          userId);

    return displayName;
  } catch (error) {
    console.error("Failed to fetch display name for user:", userId, error);
    return userId; // Fallback to user ID if everything fails
  }
}

export async function getUserDisplayInfo(
  userId: string,
): Promise<{ name: string; email: string }> {
  try {
    const user = await (await clerkClient()).users.getUser(userId);

    // Check public metadata first for custom display name
    const customDisplayName = user.publicMetadata?.displayName as
      | string
      | undefined;
    const profileDisplayName =
      user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : (user.firstName ?? user.lastName);

    const displayName =
      customDisplayName ??
      profileDisplayName ??
      user.emailAddresses[0]?.emailAddress ??
      userId;
    const email = user.emailAddresses[0]?.emailAddress ?? "No email";

    return {
      name: displayName,
      email: email,
    };
  } catch (error) {
    console.error("Failed to fetch display info for user:", userId, error);
    return {
      name: userId,
      email: "Unknown",
    };
  }
}

export async function getUsersDisplayNames(
  userIds: string[],
): Promise<Record<string, string>> {
  const results: Record<string, string> = {};

  await Promise.all(
    userIds.map(async (userId) => {
      results[userId] = await getUserDisplayName(userId);
    }),
  );

  return results;
}

"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Trash2,
  Check,
  ChevronsUpDown,
  Mail,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { type RouterOutputs } from "@/trpc/shared";

type Group = NonNullable<RouterOutputs["groups"]["getUserGroups"]>[number];

interface GroupSettingsModalProps {
  children: React.ReactNode;
  group: Group;
}

export function GroupSettingsModal({
  children,
  group,
}: GroupSettingsModalProps) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [groupName, setGroupName] = useState<string>(group.name);
  const [groupDescription, setGroupDescription] = useState<string>(
    group.description ?? "",
  );
  const [memberDisplayInfo, setMemberDisplayInfo] = useState<
    Record<string, { name: string; email: string }>
  >({});
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedInvites, setSelectedInvites] = useState<
    Array<{ type: "friend" | "email"; value: string; label: string }>
  >([]);
  const [emailInput, setEmailInput] = useState("");

  const utils = api.useUtils();

  const { data: friendsNotInGroup = [] } =
    api.groups.getFriendsNotInGroup.useQuery(
      { groupId: group.id, userId: user?.id ?? "" },
      { enabled: !!user?.id && open },
    );

  const { data: groupDetails } = api.groups.getGroupDetails.useQuery(
    { groupId: group.id },
    { enabled: open },
  );

  const updateGroup = api.groups.updateGroup.useMutation({
    onSuccess: async (data) => {
      await utils.groups.invalidate();
      toast.success(data.message);
      setOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const inviteToGroup = api.groups.inviteToGroup.useMutation({
    onSuccess: async (data) => {
      await utils.groups.invalidate();
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const inviteByEmail = api.groups.inviteByEmailToGroup.useMutation({
    onSuccess: async (data) => {
      await utils.groups.invalidate();
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removeMember = api.groups.removeMember.useMutation({
    onSuccess: async (data) => {
      await utils.groups.invalidate();
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const promoteToAdmin = api.groups.promoteToAdmin.useMutation({
    onSuccess: async (data) => {
      await utils.groups.invalidate();
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const demoteFromAdmin = api.groups.demoteFromAdmin.useMutation({
    onSuccess: async (data) => {
      await utils.groups.invalidate();
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleUpdateGroup = () => {
    if (!user?.id) return;
    updateGroup.mutate({
      groupId: group.id,
      userId: user.id,
      name: groupName,
      description: groupDescription,
    });
  };

  const handleSendInvites = () => {
    if (!user?.id || selectedInvites.length === 0) return;

    selectedInvites.forEach((invite) => {
      if (invite.type === "friend") {
        inviteToGroup.mutate({
          groupId: group.id,
          invitedUserId: invite.value,
          invitedByUserId: user.id,
        });
      } else {
        inviteByEmail.mutate({
          groupId: group.id,
          email: invite.value,
          invitedByUserId: user.id,
        });
      }
    });

    setSelectedInvites([]);
    setInviteOpen(false);
  };

  const addEmailInvite = (email: string) => {
    if (email && !selectedInvites.some((invite) => invite.value === email)) {
      setSelectedInvites((prev) => [
        ...prev,
        {
          type: "email",
          value: email,
          label: email,
        },
      ]);
      setEmailInput("");
    }
  };

  const toggleFriendInvite = (friendId: string, friendName: string) => {
    setSelectedInvites((prev) => {
      const exists = prev.find((invite) => invite.value === friendId);
      if (exists) {
        return prev.filter((invite) => invite.value !== friendId);
      } else {
        return [
          ...prev,
          {
            type: "friend",
            value: friendId,
            label: friendName,
          },
        ];
      }
    });
  };

  const removeInvite = (value: string) => {
    setSelectedInvites((prev) =>
      prev.filter((invite) => invite.value !== value),
    );
  };

  const handleRemoveMember = (memberUserId: string) => {
    if (!user?.id) return;
    removeMember.mutate({
      groupId: group.id,
      userId: user.id,
      memberUserId,
    });
  };

  const handlePromoteToAdmin = (memberUserId: string) => {
    if (!user?.id) return;
    promoteToAdmin.mutate({
      groupId: group.id,
      userId: user.id,
      memberUserId,
    });
  };

  const handleDemoteFromAdmin = (memberUserId: string) => {
    if (!user?.id) return;
    demoteFromAdmin.mutate({
      groupId: group.id,
      userId: user.id,
      memberUserId,
    });
  };

  // Fetch display names for all members
  useEffect(() => {
    if (groupDetails?.members && open) {
      const fetchMemberInfo = async () => {
        const memberInfo: Record<string, { name: string; email: string }> = {};

        for (const member of groupDetails.members) {
          try {
            // For now, use a simple fallback approach
            if (member.userId.includes("@")) {
              // If it's an email, use it as both name and email
              memberInfo[member.userId] = {
                name: member.userId.split("@")[0] ?? member.userId,
                email: member.userId,
              };
            } else {
              // For user IDs, show truncated version
              memberInfo[member.userId] = {
                name: `User ${member.userId.slice(-8)}`,
                email: member.userId.includes("@") ? member.userId : "Unknown",
              };
            }
          } catch {
            // Fallback
            memberInfo[member.userId] = {
              name: member.userId,
              email: member.userId.includes("@") ? member.userId : "Unknown",
            };
          }
        }

        setMemberDisplayInfo(memberInfo);
      };

      void fetchMemberInfo();
    }
  }, [groupDetails?.members, open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">
            Group Settings: {group.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* General Settings */}
          <div>
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="group-description">Group Description</Label>
            <Textarea
              id="group-description"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
            />
          </div>

          <Separator />

          {/* Invite Members */}
          <div>
            <Label>Invite Members</Label>
            <div className="mt-2">
              <Popover open={inviteOpen} onOpenChange={setInviteOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={inviteOpen}
                    className="w-full justify-between"
                  >
                    {selectedInvites.length > 0
                      ? `${selectedInvites.length} selected`
                      : "Select friends or enter email..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput
                      placeholder="Search friends or enter email..."
                      value={emailInput}
                      onValueChange={setEmailInput}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && emailInput.includes("@")) {
                          e.preventDefault();
                          addEmailInvite(emailInput);
                        }
                      }}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {emailInput.includes("@") ? (
                          <div className="p-2">
                            <Button
                              size="sm"
                              onClick={() => addEmailInvite(emailInput)}
                              className="w-full"
                            >
                              <Mail className="mr-2 h-4 w-4" />
                              Invite {emailInput}
                            </Button>
                          </div>
                        ) : (
                          <div className="text-muted-foreground p-2 text-center text-sm">
                            {friendsNotInGroup.length === 0
                              ? "No friends available to invite"
                              : "No friends found"}
                            {process.env.NODE_ENV === "development" && (
                              <div className="mt-2 text-xs">
                                Debug: {friendsNotInGroup.length} friends not in
                                group
                              </div>
                            )}
                          </div>
                        )}
                      </CommandEmpty>
                      {friendsNotInGroup.length > 0 && (
                        <CommandGroup heading="Friends">
                          {friendsNotInGroup.map(
                            (friend: {
                              userId: string;
                              name: string;
                              email: string;
                            }) => {
                              const isSelected = selectedInvites.some(
                                (invite) => invite.value === friend.userId,
                              );
                              return (
                                <CommandItem
                                  key={friend.userId}
                                  onSelect={() =>
                                    toggleFriendInvite(
                                      friend.userId,
                                      friend.name,
                                    )
                                  }
                                  className="flex items-center gap-2"
                                >
                                  <Checkbox checked={isSelected} />
                                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-xs font-medium text-white">
                                    {friend.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium">
                                      {friend.name}
                                    </span>
                                    <span className="text-muted-foreground text-xs">
                                      {friend.email}
                                    </span>
                                  </div>
                                  {isSelected && (
                                    <Check className="ml-auto h-4 w-4" />
                                  )}
                                </CommandItem>
                              );
                            },
                          )}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Selected invites */}
              {selectedInvites.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedInvites.map((invite) => (
                    <Badge
                      key={invite.value}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {invite.type === "email" && <Mail size={12} />}
                      {invite.label}
                      <button
                        onClick={() => removeInvite(invite.value)}
                        className="ml-1 rounded-full hover:bg-gray-200"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {selectedInvites.length > 0 && (
                <Button
                  onClick={handleSendInvites}
                  disabled={inviteToGroup.isPending || inviteByEmail.isPending}
                  className="mt-2 w-full"
                >
                  {inviteToGroup.isPending || inviteByEmail.isPending
                    ? "Sending..."
                    : `Send ${selectedInvites.length} Invitation${selectedInvites.length !== 1 ? "s" : ""}`}
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Current Members */}
          <div>
            <Label>Group Members</Label>
            <ScrollArea className="mt-2 max-h-60 w-full rounded-md border p-3">
              <div className="space-y-2">
                {groupDetails?.members?.map((member) => {
                  const isCurrentUser = member.userId === user?.id;
                  const isAdmin = member.role === "admin";
                  const canManage = group.role === "admin" && !isCurrentUser;

                  // Check if current user can leave (if there's another admin)
                  const otherAdmins =
                    groupDetails.members?.filter(
                      (m) => m.role === "admin" && m.userId !== user?.id,
                    ) || [];
                  const canLeave = isCurrentUser && otherAdmins.length > 0;

                  // Get display info
                  const displayInfo = memberDisplayInfo[member.userId];
                  const displayName = isCurrentUser
                    ? "You"
                    : (displayInfo?.name ?? member.userId);
                  const displayEmail = displayInfo?.email ?? member.userId;

                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-lg border p-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-sm font-medium text-white">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{displayName}</p>
                          <p className="text-muted-foreground text-xs">
                            {isCurrentUser ? "Your account" : displayEmail}
                          </p>
                          <Badge
                            variant={isAdmin ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {member.role}
                          </Badge>
                        </div>
                      </div>
                      {(canManage || canLeave) && (
                        <div className="flex items-center gap-1">
                          {canManage && !isCurrentUser && (
                            <>
                              {!isAdmin ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2 text-xs"
                                  onClick={() =>
                                    handlePromoteToAdmin(member.userId)
                                  }
                                  disabled={promoteToAdmin.isPending}
                                >
                                  <ChevronUp size={12} className="mr-1" />
                                  Promote
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2 text-xs"
                                  onClick={() =>
                                    handleDemoteFromAdmin(member.userId)
                                  }
                                  disabled={demoteFromAdmin.isPending}
                                >
                                  <ChevronDown size={12} className="mr-1" />
                                  Demote
                                </Button>
                              )}
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 px-2 text-xs"
                            onClick={() => handleRemoveMember(member.userId)}
                            disabled={removeMember.isPending}
                          >
                            <Trash2 size={12} className="mr-1" />
                            {canLeave ? "Leave Group" : "Remove"}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            {(!groupDetails?.members || groupDetails.members.length === 0) && (
              <p className="text-muted-foreground mt-2 text-center text-xs">
                No members found.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button onClick={handleUpdateGroup} disabled={updateGroup.isPending}>
            {updateGroup.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { GroupInvitationsModal } from "@/components/group-invitations-modal";
import { GroupSettingsModal } from "@/components/group-settings-modal";
import { Plus, Users, Mail, Settings } from "lucide-react";
import { toast } from "sonner";

interface GroupsSidebarProps {
  selectedGroupId: number | null;
  onGroupSelect: (groupId: number | null) => void;
}

export function GroupsSidebar({ selectedGroupId, onGroupSelect }: GroupsSidebarProps) {
  const { user } = useUser();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [groupForm, setGroupForm] = useState({
    name: "",
    description: "",
  });

  const utils = api.useUtils();

  const { data: userGroups = [] } = api.groups.getUserGroups.useQuery(
    { userId: user!.id },
    { enabled: !!user?.id },
  );

  const { data: friends = [] } = api.friends.getFriends.useQuery(
    { userId: user?.id ?? "" },
    { enabled: !!user?.id },
  );

  const { data: userInvitations = [] } = api.groups.getUserInvitations.useQuery(
    { userId: user?.id ?? "" },
    { enabled: !!user?.id },
  );

  const createGroup = api.groups.create.useMutation({
    onSuccess: async (data) => {
      await utils.groups.invalidate();

      // Add selected friends to the group
      if (selectedFriends.length > 0) {
        for (const friendId of selectedFriends) {
          try {
            await addMember.mutateAsync({
              groupId: data.groupId,
              userId: user?.id ?? "",
              memberUserId: friendId,
              role: "member",
            });
          } catch (error) {
            console.error("Failed to add friend to group:", error);
          }
        }
      }

      toast.success(data.message);
      setIsCreateDialogOpen(false);
      setGroupForm({ name: "", description: "" });
      setSelectedFriends([]);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const addMember = api.groups.addMember.useMutation();

  const handleCreateGroup = () => {
    if (!groupForm.name.trim()) {
      toast.error("Please enter a group name");
      return;
    }

    createGroup.mutate({
      name: groupForm.name,
      description: groupForm.description,
      createdBy: user?.id ?? "",
    });
  };

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId],
    );
  };

  return (
    <div className="bg-background border-border h-full w-80 border-r">
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">My Groups</h2>
          <div className="flex items-center gap-2">
            <GroupInvitationsModal>
              <Button size="sm" variant="outline" className="relative">
                <Mail size={16} />
                {userInvitations.length > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full p-0"
                  >
                    {userInvitations.length}
                  </Badge>
                )}
              </Button>
            </GroupInvitationsModal>
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus size={16} />
                  New Group
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Group</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="group-name">Group Name *</Label>
                    <Input
                      id="group-name"
                      placeholder="e.g., Tokyo Trip 2024"
                      value={groupForm.name}
                      onChange={(e) =>
                        setGroupForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="group-description">Description</Label>
                    <Textarea
                      id="group-description"
                      placeholder="Optional description..."
                      value={groupForm.description}
                      onChange={(e) =>
                        setGroupForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      rows={3}
                    />
                  </div>

                  {friends.length > 0 && (
                    <div>
                      <Label>Invite Friends</Label>
                      <ScrollArea className="mt-2 h-40 w-full rounded-md border p-3">
                        <div className="space-y-2">
                          {friends.map((friendship) => {
                            const friendName = friendship.friendName;
                            const friendId = friendship.friendId;

                            return (
                              <div
                                key={friendship.id}
                                className="flex items-center space-x-2"
                              >
                                <Checkbox
                                  id={`friend-${friendship.id}`}
                                  checked={selectedFriends.includes(friendId)}
                                  onCheckedChange={() =>
                                    toggleFriendSelection(friendId)
                                  }
                                />
                                <Label
                                  htmlFor={`friend-${friendship.id}`}
                                  className="cursor-pointer text-sm font-normal"
                                >
                                  {friendName}
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                      {selectedFriends.length > 0 && (
                        <p className="text-muted-foreground mt-2 text-xs">
                          {selectedFriends.length} friend
                          {selectedFriends.length === 1 ? "" : "s"} selected
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateGroup}
                      disabled={createGroup.isPending}
                    >
                      {createGroup.isPending ? "Creating..." : "Create Group"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Separator />

        <ScrollArea className="flex-1">
          <div className="space-y-3">
            {/* All Expenses Option */}
            <Card
              className={`cursor-pointer transition-colors ${
                selectedGroupId === null
                  ? "bg-accent border-primary"
                  : "hover:bg-accent/50"
              }`}
              onClick={() => onGroupSelect(null)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Plus size={16} />
                  <span className="text-sm font-medium">All Expenses</span>
                </div>
              </CardContent>
            </Card>
            {userGroups.length === 0 ? (
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
                  <p className="text-muted-foreground text-sm">
                    No groups yet. Create your first group to get started!
                  </p>
                </CardContent>
              </Card>
            ) : (
              userGroups.map((group) => {
                return (
                  <Card
                    key={group.id}
                    className={`group cursor-pointer transition-colors ${
                      selectedGroupId === group.id
                        ? "bg-accent border-primary"
                        : "hover:bg-accent/50"
                    }`}
                    onClick={() => onGroupSelect(group.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <Users size={16} />
                          {group.name}
                        </CardTitle>
                        <div className="flex items-center gap-1">
                          <Badge
                            variant={
                              group.role === "admin" ? "default" : "secondary"
                            }
                            className="text-xs"
                          >
                            {group.role}
                          </Badge>
                          {group.role === "admin" && (
                            <GroupSettingsModal group={group}>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                              >
                                <Settings size={12} />
                              </Button>
                            </GroupSettingsModal>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        <div className="text-muted-foreground flex items-center justify-between text-xs">
                          <span>
                            {new Date(group.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {group.description && (
                          <p className="text-muted-foreground line-clamp-2 text-xs">
                            {group.description}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Friends Section */}
        <div className="mt-4 space-y-3">
          <Separator />
          <div className="px-2">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <Users size={16} />
              Your Friends ({friends.length})
            </h3>
          </div>
          <ScrollArea className="max-h-48">
            <div className="space-y-2 px-2">
              {friends.length === 0 ? (
                <div className="text-muted-foreground py-4 text-center">
                  <p className="text-xs">No friends yet.</p>
                </div>
              ) : (
                friends.map((friendship) => {
                  const friendName = friendship.friendName;
                  return (
                    <div
                      key={friendship.id}
                      className="flex items-center gap-2 rounded-lg p-2 transition-colors hover:bg-accent/50"
                    >
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                      <span className="text-sm">{friendName}</span>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

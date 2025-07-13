"use client";

import { useState, useEffect, useRef } from "react";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FriendsModalProps {
  children: React.ReactNode;
  initialTab?: "all" | "invitations" | "sent";
}

export function FriendsModal({ children, initialTab = "all" }: FriendsModalProps) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const firstInvitationRef = useRef<HTMLButtonElement>(null);

  const utils = api.useUtils();

  const sendFriendRequest = api.friends.sendFriendRequest.useMutation({
    onSuccess: async (data) => {
      await utils.friends.invalidate();
      setEmail("");
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const respondToRequest = api.friends.respondToFriendRequest.useMutation({
    onSuccess: async (data) => {
      await utils.friends.invalidate();
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removeFriend = api.friends.removeFriend.useMutation({
    onSuccess: async (data) => {
      await utils.friends.invalidate();
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const cancelFriendRequest = api.friends.cancelFriendRequest.useMutation({
    onSuccess: async (data) => {
      await utils.friends.invalidate();
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const friendRequests = api.friends.getFriendRequests.useQuery(
    {
      userId: user?.id ?? "",
      userEmail: user?.primaryEmailAddress?.emailAddress,
    },
    { enabled: !!user?.id },
  );

  const sentRequests = api.friends.getSentFriendRequests.useQuery(
    { userId: user?.id ?? "" },
    { enabled: !!user?.id },
  );

  const friends = api.friends.getFriends.useQuery(
    { userId: user?.id ?? "" },
    { enabled: !!user?.id },
  );

  const handleSendRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !email) return;

    sendFriendRequest.mutate({
      userId: user.id,
      friendEmail: email,
    });
  };

  const handleResponse = (
    friendshipId: number,
    response: "accepted" | "declined",
  ) => {
    if (!user?.id) return;
    respondToRequest.mutate({
      friendshipId,
      response,
      userId: user.id,
    });
  };

  const handleRemoveFriend = (friendshipId: number) => {
    removeFriend.mutate({
      friendshipId,
    });
  };

  const handleCancelRequest = (friendshipId: number) => {
    if (!user?.id) return;
    cancelFriendRequest.mutate({
      friendshipId,
      userId: user.id,
    });
  };

  // Focus management for invitations tab
  useEffect(() => {
    if (open && initialTab === "invitations" && firstInvitationRef.current) {
      // Small delay to ensure the modal is fully rendered
      const timer = setTimeout(() => {
        firstInvitationRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, initialTab]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Friends</DialogTitle>
        </DialogHeader>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add New Friend</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendRequest} className="space-y-4">
              <div>
                <Label htmlFor="email">Friend&apos;s Email *</Label>
                <input
                  id="email"
                  type="email"
                  placeholder="friend@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-input bg-background mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={sendFriendRequest.isPending}
              >
                {sendFriendRequest.isPending
                  ? "Sending..."
                  : "Send Friend Request"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Tabs defaultValue={initialTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">
              All Friends
              {friends.data && friends.data.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-2 px-1.5 py-0.5 text-xs"
                >
                  {friends.data.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="invitations">
              Friend Invitations
              {(friendRequests.data?.length ?? 0) > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-2 px-1.5 py-0.5 text-xs"
                >
                  {friendRequests.data?.length ?? 0}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent">
              Sent Requests
              {(sentRequests.data?.length ?? 0) > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-2 px-1.5 py-0.5 text-xs"
                >
                  {sentRequests.data?.length ?? 0}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Friends</CardTitle>
              </CardHeader>
              <CardContent>
                {friends.data && friends.data.length > 0 ? (
                  <div className="space-y-3">
                    {friends.data.map((friendship) => {
                      // Use the friendId and friendName from the API response
                      const friendName = friendship.friendName;

                      return (
                        <div
                          key={friendship.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-sm font-medium text-white">
                              {friendName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium">{friendName}</p>
                              <Badge variant="secondary" className="text-xs">
                                Friends
                              </Badge>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRemoveFriend(friendship.id)}
                            disabled={removeFriend.isPending}
                          >
                            Remove
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-muted-foreground py-8 text-center">
                    <p>No friends yet.</p>
                    <p className="text-sm">
                      Start by adding friends in the &quot;Manage Friends&quot;
                      tab!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invitations" className="space-y-4">
            {friendRequests.data && friendRequests.data.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Received Friend Requests ({friendRequests.data.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {friendRequests.data.map((request, index) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-sm font-medium text-white">
                            {String(request.senderName ?? request.userId)
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">
                              {request.senderName ?? request.userId}
                            </p>
                            <p className="text-muted-foreground text-sm">
                              {request.senderEmail ?? "Unknown email"}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            ref={index === 0 ? firstInvitationRef : undefined}
                            size="sm"
                            onClick={() =>
                              handleResponse(request.id, "accepted")
                            }
                            disabled={respondToRequest.isPending}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleResponse(request.id, "declined")
                            }
                            disabled={respondToRequest.isPending}
                          >
                            Decline
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {(!friendRequests.data || friendRequests.data.length === 0) && (
              <div className="text-muted-foreground py-4 text-center">
                <p className="text-sm">No pending friend requests.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="sent" className="space-y-4">
            {sentRequests.data && sentRequests.data.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Sent Friend Requests ({sentRequests.data.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sentRequests.data.map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-sm font-medium text-white">
                            {String(request.recipientName ?? request.friendId)
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">
                              {request.recipientName ?? request.friendId}
                            </p>
                            <p className="text-muted-foreground text-sm">
                              {request.recipientEmail ?? "Unknown email"}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancelRequest(request.id)}
                          disabled={cancelFriendRequest.isPending}
                        >
                          Cancel
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {(!sentRequests.data || sentRequests.data.length === 0) && (
              <div className="text-muted-foreground py-4 text-center">
                <p className="text-sm">No sent friend requests.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

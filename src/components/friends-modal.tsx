"use client";

import { useState } from "react";
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

interface FriendsModalProps {
  children: React.ReactNode;
}

export function FriendsModal({ children }: FriendsModalProps) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");

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

  const friendRequests = api.friends.getFriendRequests.useQuery(
    { userId: user?.id ?? "" },
    { enabled: !!user?.id }
  );

  const friends = api.friends.getFriends.useQuery(
    { userId: user?.id ?? "" },
    { enabled: !!user?.id }
  );

  const handleSendRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !email) return;

    sendFriendRequest.mutate({
      userId: user.id,
      friendEmail: email,
    });
  };

  const handleResponse = (friendshipId: number, response: "accepted" | "declined") => {
    respondToRequest.mutate({
      friendshipId,
      response,
    });
  };

  const handleRemoveFriend = (friendshipId: number) => {
    removeFriend.mutate({
      friendshipId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Friends</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Add Friend Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Friend</CardTitle>
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
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={sendFriendRequest.isPending}
                >
                  {sendFriendRequest.isPending ? "Sending..." : "Send Friend Request"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Friend Requests Section */}
          {friendRequests.data && friendRequests.data.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Friend Requests</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {friendRequests.data.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{request.userId}</p>
                      <p className="text-sm text-muted-foreground">Wants to be friends</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleResponse(request.id, "accepted")}
                        disabled={respondToRequest.isPending}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResponse(request.id, "declined")}
                        disabled={respondToRequest.isPending}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Friends List Section */}
          {friends.data && friends.data.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Friends</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {friends.data.map((friendship) => {
                  const friendId = friendship.userId === user?.id 
                    ? friendship.friendUserId 
                    : friendship.userId;
                  
                  return (
                    <div key={friendship.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <p className="font-medium">{friendId}</p>
                        <Badge variant="secondary">Friends</Badge>
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
              </CardContent>
            </Card>
          )}

          {/* Empty States */}
          {friendRequests.data && friendRequests.data.length === 0 && 
           friends.data && friends.data.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No friends or friend requests yet.</p>
              <p className="text-sm">Start by adding a friend using their email above!</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
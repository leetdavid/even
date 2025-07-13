"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";

export default function TestFriendsPage() {
  const { user } = useUser();
  const [email, setEmail] = useState("");

  const sendRequest = api.friends.sendFriendRequest.useMutation({
    onSuccess: (data) => {
      console.log("Success:", data);
    },
    onError: (error) => {
      console.error("Error:", error.message);
    },
  });

  const { data: friends } = api.friends.getFriends.useQuery(
    { userId: user?.id ?? "" },
    { enabled: !!user?.id }
  );

  const { data: requests } = api.friends.getFriendRequests.useQuery(
    { userId: user?.id ?? "" },
    { enabled: !!user?.id }
  );

  if (!user) {
    return <div>Please sign in to test friends functionality</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Friends API Test</h1>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="email">Test Friend Email:</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
            placeholder="test@example.com"
          />
          <Button
            onClick={() => sendRequest.mutate({ userId: user.id, friendEmail: email })}
            disabled={sendRequest.isPending || !email}
            className="mt-2"
          >
            {sendRequest.isPending ? "Sending..." : "Send Friend Request"}
          </Button>
        </div>

        <div>
          <h3 className="font-semibold">Friends ({friends?.length ?? 0}):</h3>
          <pre className="bg-gray-100 p-4 rounded text-sm">
            {JSON.stringify(friends, null, 2)}
          </pre>
        </div>

        <div>
          <h3 className="font-semibold">Friend Requests ({requests?.length ?? 0}):</h3>
          <pre className="bg-gray-100 p-4 rounded text-sm">
            {JSON.stringify(requests, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
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
import { Label } from "@/components/ui/label";

interface UserSettingsModalProps {
  children: React.ReactNode;
}

export function UserSettingsModal({ children }: UserSettingsModalProps) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const utils = api.useUtils();

  const currentUser = api.user.getCurrentUser.useQuery(
    { userId: user?.id ?? "" },
    {
      enabled: !!user?.id && open,
    },
  );

  // Update display name when data changes
  useEffect(() => {
    if (currentUser.data) {
      setDisplayName(currentUser.data.displayName);
    }
  }, [currentUser.data]);

  const updateDisplayName = api.user.updateDisplayName.useMutation({
    onSuccess: async (data) => {
      await utils.user.invalidate();
      await utils.friends.invalidate(); // Refresh friends list to show updated names
      toast.success(data.message);
      setOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !displayName.trim()) return;

    setIsLoading(true);
    updateDisplayName.mutate({
      userId: user.id,
      displayName: displayName.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>User Settings</DialogTitle>
        </DialogHeader>

        {currentUser.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground text-sm">Loading...</div>
          </div>
        ) : currentUser.error ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-destructive text-sm">
              Failed to load user settings
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="current-info">Current Information</Label>
              <div className="bg-muted mt-2 rounded-md p-3">
                <p className="text-sm">
                  <span className="font-medium">Display Name:</span>{" "}
                  {currentUser.data?.displayName}
                </p>
                <p className="text-muted-foreground text-sm">
                  <span className="font-medium">Email:</span>{" "}
                  {currentUser.data?.email}
                </p>
                {currentUser.data?.hasCustomDisplayName && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    You have set a custom display name
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="displayName">New Display Name *</Label>
              <input
                id="displayName"
                type="text"
                placeholder="Enter your display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="border-input bg-background mt-1 w-full rounded-md border px-3 py-2 text-sm"
                required
                maxLength={50}
                disabled={isLoading}
              />
              <p className="text-muted-foreground mt-1 text-xs">
                This is how your name will appear to other users
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !displayName.trim()}
                className="flex-1"
              >
                {isLoading ? "Updating..." : "Update Name"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

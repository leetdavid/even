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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, Clock, Check, X, Users } from "lucide-react";
import { toast } from "sonner";

interface GroupInvitationsModalProps {
  children: React.ReactNode;
}

export function GroupInvitationsModal({
  children,
}: GroupInvitationsModalProps) {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);

  const utils = api.useUtils();

  const { data: userInvitations = [] } = api.groups.getUserInvitations.useQuery(
    { userId: user?.id ?? "" },
    { enabled: !!user?.id },
  );

  const respondToInvitation = api.groups.respondToInvitation.useMutation({
    onSuccess: async (data) => {
      await utils.groups.invalidate();
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleAcceptInvitation = (invitationId: number) => {
    respondToInvitation.mutate({
      invitationId,
      userId: user?.id ?? "",
      response: "accepted",
    });
  };

  const handleDeclineInvitation = (invitationId: number) => {
    respondToInvitation.mutate({
      invitationId,
      userId: user?.id ?? "",
      response: "declined",
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isExpiringSoon = (expiresAt: Date | null) => {
    if (!expiresAt) return false;
    const now = new Date();
    const expiry = new Date(expiresAt);
    const daysUntilExpiry = Math.ceil(
      (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    return daysUntilExpiry <= 2;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail size={20} />
            Group Invitations
            {userInvitations.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {userInvitations.length}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4">
            {userInvitations.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Mail className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                  <p className="text-muted-foreground">
                    No pending group invitations
                  </p>
                </CardContent>
              </Card>
            ) : (
              userInvitations.map((invitation) => (
                <Card key={invitation.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Users size={16} />
                        {invitation.groupName}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {invitation.expiresAt &&
                          isExpiringSoon(invitation.expiresAt) && (
                            <Badge variant="destructive" className="text-xs">
                              <Clock size={12} className="mr-1" />
                              Expires Soon
                            </Badge>
                          )}
                        <Badge variant="outline" className="text-xs">
                          {invitation.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="text-muted-foreground text-sm">
                        <div className="flex items-center justify-between">
                          <span>From: {invitation.invitedByUserId}</span>
                          <span>Sent: {formatDate(invitation.createdAt)}</span>
                        </div>
                        {invitation.expiresAt && (
                          <div className="mt-1">
                            Expires: {formatDate(invitation.expiresAt)}
                          </div>
                        )}
                      </div>

                      {invitation.message && (
                        <div className="bg-muted rounded-md p-3">
                          <p className="text-sm">{invitation.message}</p>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={() => handleAcceptInvitation(invitation.id)}
                          disabled={respondToInvitation.isPending}
                          className="flex-1"
                        >
                          <Check size={16} className="mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeclineInvitation(invitation.id)}
                          disabled={respondToInvitation.isPending}
                          className="flex-1"
                        >
                          <X size={16} className="mr-1" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

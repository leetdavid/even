"use client";

import {
  useUser,
  SignedIn,
  SignedOut,
  RedirectToSignIn,
  UserButton,
} from "@clerk/nextjs";
import { useState } from "react";

import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExpenseModal } from "@/components/expense-modal";
import { FriendsModal } from "@/components/friends-modal";
import { UserSettingsModal } from "@/components/user-settings-modal";
import { GroupsSidebar } from "@/components/groups-sidebar";
import { GroupSettingsModal } from "@/components/group-settings-modal";
import { ModeToggle } from "@/components/theme-toggle";
import { Plus, Users, UserPlus, Settings } from "lucide-react";

export default function AppPage() {
  const { user } = useUser();
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  const utils = api.useUtils();

  const { data: expenses = [] } = api.expense.getAll.useQuery(
    { userId: user?.id ?? "" },
    { enabled: !!user?.id && !selectedGroupId },
  );

  const { data: groupExpenses = [] } = api.expense.getGroupExpenses.useQuery(
    { groupId: selectedGroupId! },
    { enabled: !!selectedGroupId },
  );

  const { data: userGroups = [] } = api.groups.getUserGroups.useQuery(
    { userId: user?.id ?? "" },
    { enabled: !!user?.id },
  );

  const selectedGroup = selectedGroupId 
    ? userGroups.find(group => group.id === selectedGroupId)
    : null;

  const { data: friendRequests = [] } = api.friends.getFriendRequests.useQuery(
    {
      userId: user?.id ?? "",
      userEmail: user?.primaryEmailAddress?.emailAddress,
    },
    { enabled: !!user?.id },
  );


  const deleteExpense = api.expense.delete.useMutation({
    onSuccess: async () => {
      await utils.expense.invalidate();
    },
  });

  const displayedExpenses = selectedGroupId ? groupExpenses : expenses;
  const totalExpenses = displayedExpenses.reduce(
    (sum, expense) => sum + parseFloat(expense.amount),
    0,
  );

  return (
    <>
      <SignedIn>
        <div className="flex h-screen">
          <GroupsSidebar 
            selectedGroupId={selectedGroupId} 
            onGroupSelect={setSelectedGroupId} 
          />
          <div className="flex-1 overflow-auto">
            <div className="container mx-auto space-y-6 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">
                    {selectedGroup ? selectedGroup.name : "Even"}
                  </h1>
                  {selectedGroup && (
                    <p className="text-muted-foreground text-sm">
                      Group Expenses
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <ModeToggle />
                  <FriendsModal>
                    <Button variant="outline" className="gap-2">
                      <Users size={16} />
                      Friends
                      {friendRequests.length > 0 && (
                        <Badge
                          variant="destructive"
                          className="ml-1 px-1.5 py-0.5 text-xs"
                        >
                          {friendRequests.length}
                        </Badge>
                      )}
                    </Button>
                  </FriendsModal>
                  <ExpenseModal groupId={selectedGroupId}>
                    <Button className="gap-2">
                      <Plus size={16} />
                      Add Expense
                    </Button>
                  </ExpenseModal>
                  <div className="text-right">
                    <p className="text-muted-foreground text-sm">
                      Total Expenses
                    </p>
                    <p className="text-2xl font-bold">
                      ${totalExpenses.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserSettingsModal>
                      <Button variant="outline" size="icon">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </UserSettingsModal>
                    <UserButton />
                  </div>
                </div>
              </div>

              {/* Pending Requests */}
              {friendRequests.length > 0 && (
                <div className="grid grid-cols-1 gap-4">
                  {friendRequests.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <UserPlus size={20} />
                          Pending Requests ({friendRequests.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {friendRequests.slice(0, 3).map((request) => (
                            <FriendsModal key={request.id} initialTab="invitations">
                              <div className="flex cursor-pointer items-center gap-2 rounded-md p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800">
                                <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                                <div className="flex-1">
                                  <span className="text-sm font-medium">
                                    {request.senderName ?? request.userId}
                                  </span>
                                  <p className="text-muted-foreground text-xs">
                                    {request.senderEmail ?? "Unknown email"}
                                  </p>
                                </div>
                              </div>
                            </FriendsModal>
                          ))}
                          {friendRequests.length > 3 && (
                            <p className="text-muted-foreground mt-2 text-xs">
                              +{friendRequests.length - 3} more requests
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      {selectedGroupId ? "Group Expenses" : "Recent Expenses"}
                    </CardTitle>
                    {selectedGroupId && selectedGroup && (
                      <div className="flex items-center gap-2">
                        <ExpenseModal groupId={selectedGroupId}>
                          <Button size="sm" variant="outline" className="gap-1">
                            <Plus size={16} />
                            Add Expense
                          </Button>
                        </ExpenseModal>
                        <GroupSettingsModal group={selectedGroup}>
                          <Button size="sm" variant="outline" className="gap-1">
                            <Settings size={16} />
                            Settings
                          </Button>
                        </GroupSettingsModal>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {displayedExpenses.length === 0 ? (
                      <p className="text-muted-foreground py-8 text-center">
                        {selectedGroupId 
                          ? "No expenses in this group yet." 
                          : "No expenses yet. Add your first expense!"
                        }
                      </p>
                    ) : (
                      displayedExpenses.slice(0, 10).map((expense) => (
                        <div
                          key={expense.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{expense.title}</h3>
                              {expense.category && (
                                <Badge variant="secondary" className="text-xs">
                                  {expense.category}
                                </Badge>
                              )}
                            </div>
                            <p className="text-muted-foreground text-sm">
                              {expense.date}
                            </p>
                            {expense.description && (
                              <p className="text-muted-foreground mt-1 text-sm">
                                {expense.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <span className="font-semibold">
                                {expense.currency}{" "}
                                {parseFloat(expense.amount).toFixed(2)}
                              </span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                deleteExpense.mutate({
                                  id: expense.id,
                                  userId: user?.id ?? "",
                                })
                              }
                              disabled={deleteExpense.isPending}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

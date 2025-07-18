"use client";

import {
  useUser,
  SignedIn,
  SignedOut,
  RedirectToSignIn,
  UserButton,
} from "@clerk/nextjs";

import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExpenseModal } from "@/components/expense-modal";
import { ExpenseEditModal } from "@/components/expense-edit-modal";
import { FriendsModal } from "@/components/friends-modal";
import { UserSettingsModal } from "@/components/user-settings-modal";
import { GroupsSidebar } from "@/components/groups-sidebar";
import { ModeToggle } from "@/components/theme-toggle";
import { Plus, Users, UserPlus, Settings } from "lucide-react";

interface ExpenseItemProps {
  expense: {
    id: number;
    title: string;
    amount: string;
    currency: string;
    category: string | null;
    description: string | null;
    date: string;
  };
}

function ExpenseItem({ expense }: ExpenseItemProps) {
  const { user } = useUser();
  const utils = api.useUtils();

  const deleteExpense = api.expense.delete.useMutation({
    onSuccess: async () => {
      await utils.expense.invalidate();
    },
  });

  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <ExpenseEditModal expenseId={expense.id}>
        <div className="hover:bg-muted/50 -m-3 flex-1 cursor-pointer rounded-lg p-3 transition-colors">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{expense.title}</h3>
            {expense.category && (
              <Badge variant="secondary" className="text-xs">
                {expense.category}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm">{expense.date}</p>
          {expense.description && (
            <p className="text-muted-foreground mt-1 text-sm">
              {expense.description}
            </p>
          )}
        </div>
      </ExpenseEditModal>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <span className="font-semibold">
            {expense.currency} {parseFloat(expense.amount).toFixed(2)}
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
  );
}

export default function AppPage() {
  const { user } = useUser();

  const { data: expenses = [] } = api.expense.getAll.useQuery(
    { userId: user?.id ?? "" },
    { enabled: !!user?.id },
  );

  const { data: userGroups = [] } = api.groups.getUserGroups.useQuery(
    { userId: user?.id ?? "" },
    { enabled: !!user?.id },
  );

  const { data: friendRequests = [] } = api.friends.getFriendRequests.useQuery(
    {
      userId: user?.id ?? "",
      userEmail: user?.primaryEmailAddress?.emailAddress,
    },
    { enabled: !!user?.id },
  );

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + parseFloat(expense.amount),
    0,
  );

  return (
    <>
      <SignedIn>
        <div className="flex h-screen">
          <GroupsSidebar
            selectedGroupId={null}
            onGroupSelect={(groupId) => {
              if (groupId) {
                const group = userGroups.find((g) => g.id === groupId);
                if (group) {
                  window.location.href = `/app/${group.uuid}`;
                }
              }
            }}
          />
          <div className="flex-1 overflow-auto">
            <div className="container mx-auto space-y-6 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">Even</h1>
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
                  <ExpenseModal>
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
                            <FriendsModal
                              key={request.id}
                              initialTab="invitations"
                            >
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
                  <div className="flex items-center justify-between gap-4">
                    <CardTitle>Recent Expenses</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {expenses.length === 0 ? (
                      <p className="text-muted-foreground py-8 text-center">
                        No expenses yet. Add your first expense!
                      </p>
                    ) : (
                      expenses
                        .slice(0, 10)
                        .map((expense) => (
                          <ExpenseItem key={expense.id} expense={expense} />
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

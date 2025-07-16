"use client";

import {
  useUser,
  SignedIn,
  SignedOut,
  RedirectToSignIn,
  UserButton,
} from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";

import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExpenseModal } from "@/components/expense-modal";
import { ExpenseEditModal } from "@/components/expense-edit-modal";
import { FriendsModal } from "@/components/friends-modal";
import { UserSettingsModal } from "@/components/user-settings-modal";
import { GroupsSidebar } from "@/components/groups-sidebar";
import { GroupSettingsModal } from "@/components/group-settings-modal";
import { ModeToggle } from "@/components/theme-toggle";
import { Plus, Users, Settings, ArrowLeft } from "lucide-react";

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

export default function GroupPage() {
  const { user } = useUser();
  const params = useParams();
  const router = useRouter();
  const groupUuid = params.uuid as string;

  const { data: userGroups = [], isLoading: isLoadingGroups } = api.groups.getUserGroups.useQuery(
    { userId: user?.id ?? "" },
    { enabled: !!user?.id },
  );

  const selectedGroup = userGroups.find((group) => group.uuid === groupUuid);

  const { data: groupExpenses = [] } =
    api.expense.getGroupExpensesByUuid.useQuery(
      { groupUuid: groupUuid },
      { enabled: !!selectedGroup },
    );

  const { data: friendRequests = [] } = api.friends.getFriendRequests.useQuery(
    {
      userId: user?.id ?? "",
      userEmail: user?.primaryEmailAddress?.emailAddress,
    },
    { enabled: !!user?.id },
  );

  const totalExpenses = groupExpenses.reduce(
    (sum, expense) => sum + parseFloat(expense.amount),
    0,
  );

  const handleGroupSelect = (groupId: number | null) => {
    if (groupId === null) {
      router.push("/app");
    } else {
      const group = userGroups.find((g) => g.id === groupId);
      if (group) {
        router.push(`/app/${group.uuid}`);
      }
    }
  };

  // Show loading state while fetching groups
  if (isLoadingGroups) {
    return (
      <SignedIn>
        <div className="flex h-screen">
          <GroupsSidebar
            selectedGroupId={null}
            onGroupSelect={handleGroupSelect}
          />
          <div className="flex-1 overflow-auto">
            <div className="container mx-auto space-y-6 p-6">
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading group...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SignedIn>
    );
  }

  // Only show "not found" after loading is complete
  if (!isLoadingGroups && !selectedGroup) {
    return (
      <SignedIn>
        <div className="flex h-screen items-center justify-center">
          <Card className="w-96">
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">
                Group not found
              </p>
              <Button
                className="mt-4 w-full"
                onClick={() => router.push("/app")}
              >
                <ArrowLeft size={16} className="mr-2" />
                Back to All Expenses
              </Button>
            </CardContent>
          </Card>
        </div>
      </SignedIn>
    );
  }

  // At this point, selectedGroup is guaranteed to exist
  const group = selectedGroup!;

  return (
    <>
      <SignedIn>
        <div className="flex h-screen">
          <GroupsSidebar
            selectedGroupId={group.id}
            onGroupSelect={handleGroupSelect}
          />
          <div className="flex-1 overflow-auto">
            <div className="container mx-auto space-y-6 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">{group.name}</h1>
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
                  <ExpenseModal groupId={group.id}>
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

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <CardTitle className="flex-1 text-ellipsis">
                      <span className="block truncate">Group Expenses</span>
                    </CardTitle>
                    <div className="flex flex-0 items-center gap-2">
                      <ExpenseModal groupId={group.id}>
                        <Button size="sm" variant="outline" className="gap-1">
                          <Plus size={16} />
                          Add Expense
                        </Button>
                      </ExpenseModal>
                      <GroupSettingsModal group={group}>
                        <Button size="sm" variant="outline" className="gap-1">
                          <Settings size={16} />
                          Settings
                        </Button>
                      </GroupSettingsModal>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {groupExpenses.length === 0 ? (
                      <p className="text-muted-foreground py-8 text-center">
                        No expenses in this group yet.
                      </p>
                    ) : (
                      groupExpenses
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

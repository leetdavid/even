"use client";

import { useUser, SignedIn, SignedOut, RedirectToSignIn, UserButton } from "@clerk/nextjs";

import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExpenseModal } from "@/components/expense-modal";
import { FriendsModal } from "@/components/friends-modal";
import { ModeToggle } from "@/components/theme-toggle";
import { Plus, Users, UserPlus } from "lucide-react";

export default function AppPage() {
  const { user } = useUser();

  const utils = api.useUtils();
  
  const { data: expenses = [] } = api.expense.getAll.useQuery(
    { userId: user?.id ?? "" },
    { enabled: !!user?.id }
  );

  const { data: friendRequests = [] } = api.friends.getFriendRequests.useQuery(
    { userId: user?.id ?? "" },
    { enabled: !!user?.id }
  );

  const { data: friends = [] } = api.friends.getFriends.useQuery(
    { userId: user?.id ?? "" },
    { enabled: !!user?.id }
  );

  const deleteExpense = api.expense.delete.useMutation({
    onSuccess: async () => {
      await utils.expense.invalidate();
    },
  });

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + parseFloat(expense.amount),
    0
  );

  return (
    <>
      <SignedIn>
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Expense Dashboard</h1>
        <div className="flex items-center gap-4">
          <ModeToggle />
          <FriendsModal>
            <Button variant="outline" className="gap-2">
              <Users size={16} />
              Friends
              {friendRequests.length > 0 && (
                <Badge variant="destructive" className="ml-1 px-1.5 py-0.5 text-xs">
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
            <p className="text-sm text-muted-foreground">Total Expenses</p>
            <p className="text-2xl font-bold">${totalExpenses.toFixed(2)}</p>
          </div>
          <UserButton />
        </div>
      </div>

      {/* Friends Summary */}
      {(friends.length > 0 || friendRequests.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {friends.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users size={20} />
                  Your Friends ({friends.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {friends.slice(0, 3).map((friendship) => {
                    const friendId = friendship.userId === user?.id 
                      ? friendship.friendUserId 
                      : friendship.userId;
                    
                    return (
                      <div key={friendship.id} className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm">{friendId}</span>
                      </div>
                    );
                  })}
                  {friends.length > 3 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      +{friends.length - 3} more friends
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          
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
                    <div key={request.id} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="text-sm">{request.userId}</span>
                    </div>
                  ))}
                  {friendRequests.length > 3 && (
                    <p className="text-xs text-muted-foreground mt-2">
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
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {expenses.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No expenses yet. Add your first expense!
              </p>
            ) : (
              expenses.slice(0, 10).map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
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
                    <p className="text-sm text-muted-foreground">
                      {expense.date}
                    </p>
                    {expense.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {expense.description}
                      </p>
                    )}
                  </div>
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
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
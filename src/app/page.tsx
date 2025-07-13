"use client";

import { useUser } from "@clerk/nextjs";

import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExpenseModal } from "@/components/expense-modal";
import { Plus } from "lucide-react";

export default function Home() {
  const { user } = useUser();

  const utils = api.useUtils();
  
  const { data: expenses = [] } = api.expense.getAll.useQuery(
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

  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
            <span className="text-[hsl(280,100%,70%)]">Even</span>
          </h1>
          <p className="text-xl">Please sign in to track your expenses.</p>
        </div>
      </main>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Expense Dashboard</h1>
        <div className="flex items-center gap-4">
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
        </div>
      </div>

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
                          userId: user.id,
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
  );
}

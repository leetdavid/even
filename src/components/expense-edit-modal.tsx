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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { type RouterOutputs } from "@/trpc/shared";

type Expense = NonNullable<RouterOutputs["expense"]["getById"]>;

interface ExpenseEditModalProps {
  children: React.ReactNode;
  expense: Expense;
}

type SplitUser = {
  userId: string;
  amount?: string;
  percentage?: number;
};

type PaymentUser = {
  userId: string;
  amount?: string;
  percentage?: number;
};

export function ExpenseEditModal({ children, expense }: ExpenseEditModalProps) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(expense.title);
  const [amount, setAmount] = useState(expense.amount);
  const [currency, setCurrency] = useState(expense.currency);
  const [category, setCategory] = useState(expense.category ?? "");
  const [description, setDescription] = useState(expense.description ?? "");
  const [date, setDate] = useState(expense.date);
  const [editReason, setEditReason] = useState("");
  const [newComment, setNewComment] = useState("");

  const [splitMode] = useState<"equal" | "percentage" | "custom">(
    expense.splitMode as "equal" | "percentage" | "custom",
  );
  const [paymentMode] = useState<"single" | "percentage" | "custom">(
    expense.paymentMode as "single" | "percentage" | "custom",
  );
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [splits, setSplits] = useState<SplitUser[]>([]);
  const [payments, setPayments] = useState<PaymentUser[]>([]);

  const utils = api.useUtils();

  const updateExpense = api.expense.update.useMutation({
    onSuccess: async () => {
      await utils.expense.invalidate();
      toast.success("Expense updated successfully!");
      setEditReason("");
      setOpen(false);
    },
    onError: (error) => {
      console.error("Error updating expense:", error);
      
      // Extract the actual error message from tRPC error structure
      let errorMessage = "Failed to update expense. Please check your input and try again.";
      
      try {
        // Parse the error message if it's JSON
        if (error.message.startsWith('[')) {
          const parsed = JSON.parse(error.message) as unknown[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            const firstError = parsed[0] as { message?: string };
            if (firstError?.message) {
              errorMessage = firstError.message;
            }
          }
        } else {
          errorMessage = error.message;
        }
      } catch {
        // If parsing fails, use the original message or default
        errorMessage = error.message || errorMessage;
      }
      
      toast.error(errorMessage);
    },
  });

  const addComment = api.expense.addComment.useMutation({
    onSuccess: async () => {
      await utils.expense.invalidate();
      setNewComment("");
      toast.success("Comment added!");
    },
    onError: (error) => {
      toast.error("Failed to add comment: " + error.message);
    },
  });

  // Initialize splits and payments from expense data
  useEffect(() => {
    if (open && expense) {
      const memberIds = expense.splits?.map(split => split.userId).filter(id => id !== user?.id) ?? [];
      setSelectedMembers(memberIds);
      
      // Convert database splits to component format
      const convertedSplits: SplitUser[] = expense.splits?.map(split => ({
        userId: split.userId,
        amount: split.amount,
        percentage: split.percentage ? parseFloat(split.percentage) : undefined,
      })) ?? [];
      setSplits(convertedSplits);
      
      // Convert database payments to component format
      const convertedPayments: PaymentUser[] = expense.payments?.map(payment => ({
        userId: payment.userId,
        amount: payment.amount,
        percentage: payment.percentage ? parseFloat(payment.percentage) : undefined,
      })) ?? [];
      setPayments(convertedPayments);
    }
  }, [open, expense, user?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    // Prepare splits data
    const splitsData: SplitUser[] = selectedMembers.map((memberId) => {
      const split = splits.find((s) => s.userId === memberId);
      return {
        userId: memberId,
        amount: split?.amount,
        percentage: split?.percentage,
      };
    });

    // Add current user to splits
    const userSplit = splits.find((s) => s.userId === user.id);
    splitsData.push({
      userId: user.id,
      amount: userSplit?.amount,
      percentage: userSplit?.percentage,
    });

    // Prepare payments data
    const paymentsData: PaymentUser[] = payments.map((payment) => ({
      userId: payment.userId,
      amount: payment.amount,
      percentage: payment.percentage,
    }));

    updateExpense.mutate({
      id: expense.id,
      title,
      amount,
      currency,
      category,
      description,
      date,
      editReason,
      editedBy: user.id,
      splitMode,
      paymentMode,
      splits: splitsData,
      payments: paymentsData,
    });
  };

  const handleAddComment = () => {
    if (!user?.id || !newComment.trim()) return;

    addComment.mutate({
      expenseId: expense.id,
      userId: user.id,
      comment: newComment.trim(),
    });
  };

  const formatChangeValue = (value: unknown): string => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value.toString();
    if (Array.isArray(value)) return `${value.length} items`;
    if (typeof value === 'object' && value !== null) return JSON.stringify(value);
    if (value === null || value === undefined) return '';
    return value as string;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-[95vw] md:max-w-[1200px]">
        <DialogHeader>
          <DialogTitle>Edit Expense: {expense.title}</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[70vh]">
          {/* Main Edit Form */}
          <div className="lg:col-span-2 overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="edit-reason">Reason for Edit</Label>
                <Textarea
                  id="edit-reason"
                  placeholder="Optional: Explain why you're making this change..."
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={updateExpense.isPending}
                  className="flex-1"
                >
                  {updateExpense.isPending ? "Updating..." : "Update Expense"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>

          {/* History & Comments Sidebar */}
          <div className="border-l pl-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Edit History */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Edit History</h3>
                <ScrollArea className="h-64 w-full border rounded-md p-3">
                  <div className="space-y-3">
                    {expense.history?.map((historyItem) => (
                      <div key={historyItem.id} className="text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={
                            historyItem.changeType === 'created' ? 'default' :
                            historyItem.changeType === 'updated' ? 'secondary' :
                            'destructive'
                          }>
                            {historyItem.changeType}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(historyItem.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">
                          By: {historyItem.editedBy}
                        </p>
                        {historyItem.editReason && (
                          <p className="text-xs italic mb-2">
                            &quot;{historyItem.editReason}&quot;
                          </p>
                        )}
                        {historyItem.changes && typeof historyItem.changes === 'object' && historyItem.changes !== null ? (
                          <div className="text-xs space-y-1">
                            {Object.entries(historyItem.changes as Record<string, { before: unknown; after: unknown }>).map(([field, change]) => (
                              <div key={field} className="bg-muted p-2 rounded">
                                <span className="font-medium">{field}:</span>
                                <div className="ml-2">
                                  <span className="text-red-600">- {formatChangeValue(change.before)}</span>
                                  <br />
                                  <span className="text-green-600">+ {formatChangeValue(change.after)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <Separator />

              {/* Comments */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Comments</h3>
                
                {/* Add Comment */}
                <div className="space-y-2 mb-4">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <Button
                    onClick={handleAddComment}
                    disabled={addComment.isPending || !newComment.trim()}
                    size="sm"
                  >
                    {addComment.isPending ? "Adding..." : "Add Comment"}
                  </Button>
                </div>

                {/* Comments List */}
                <ScrollArea className="h-64 w-full border rounded-md p-3">
                  <div className="space-y-3">
                    {expense.comments?.map((comment) => (
                      <div key={comment.id} className="text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {comment.userId === user?.id ? "You" : comment.userId}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="bg-muted p-2 rounded text-sm">
                          {comment.comment}
                        </p>
                      </div>
                    ))}
                    {(!expense.comments || expense.comments.length === 0) && (
                      <p className="text-muted-foreground text-sm text-center">
                        No comments yet.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
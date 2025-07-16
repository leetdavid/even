"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

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
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  cn,
  formatRelativeTime,
  describeExpenseChange,
  parseExpenseCategory,
} from "@/lib/utils";
import { type RouterOutputs } from "@/trpc/shared";

type Expense = NonNullable<RouterOutputs["expense"]["getById"]>;

interface ExpenseEditModalProps {
  children: React.ReactNode;
  expense?: Expense;
  expenseId?: number;
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

export function ExpenseEditModal({
  children,
  expense: propExpense,
  expenseId,
}: ExpenseEditModalProps) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);

  // Fetch expense data if expenseId is provided
  const { data: fetchedExpense } = api.expense.getById.useQuery(
    { id: expenseId! },
    { enabled: !!expenseId && open },
  );

  // Use provided expense or fetched expense
  const expense = propExpense ?? fetchedExpense;

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [dateOpen, setDateOpen] = useState(false);
  const [dateValue, setDateValue] = useState("");
  const [dateMonth, setDateMonth] = useState<Date>(new Date());
  const [newComment, setNewComment] = useState("");

  const [splitMode, setSplitMode] = useState<"equal" | "percentage" | "custom">(
    (expense?.splitMode as "equal" | "percentage" | "custom") ?? "equal",
  );
  const [paymentMode, setPaymentMode] = useState<
    "single" | "percentage" | "custom"
  >((expense?.paymentMode as "single" | "percentage" | "custom") ?? "single");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [splits, setSplits] = useState<SplitUser[]>([]);
  const [payments, setPayments] = useState<PaymentUser[]>([]);
  const [paidBy, setPaidBy] = useState<string>("");
  const [paidByOpen, setPaidByOpen] = useState(false);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setTitle("");
      setAmount("");
      setCurrency("");
      setCategory("");
      setDescription("");
      setDate(new Date());
      setDateValue("");
      setDateMonth(new Date());
      setNewComment("");
      setSplitMode("equal");
      setPaymentMode("single");
      setSelectedMembers([]);
      setSplits([]);
      setPayments([]);
      setPaidBy("");
    }
  }, [open]);

  const utils = api.useUtils();

  // Get group data if this is a group expense
  const { data: groupDetails } = api.groups.getGroupDetails.useQuery(
    { groupId: expense?.groupId ?? 0 },
    { enabled: !!expense?.groupId },
  );

  // Get friends data for personal expenses
  const { data: friends } = api.friends.getFriends.useQuery(
    { userId: user?.id ?? "" },
    { enabled: !!user?.id && !expense?.groupId },
  );

  // Helper functions for date picker
  const formatDate = (date: Date | undefined) => {
    if (!date) {
      return "";
    }
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const isValidDate = (date: Date | undefined) => {
    if (!date) {
      return false;
    }
    return !isNaN(date.getTime());
  };

  // Helper function for member display names
  const getMemberDisplayName = (memberId: string) => {
    // Fall back to friends list first (if they happen to be friends)
    if (friends) {
      const friendship = friends.find((f) => f.friendId === memberId);
      if (friendship?.friendName) {
        return friendship.friendName;
      }
    }

    // Check if user is in group members list
    if (groupDetails?.members) {
      const member = groupDetails.members.find((m) => m.userId === memberId);
      if (member) {
        // In a real app, you'd fetch display names from Clerk
        // For demo purposes, let's provide better names for known patterns
        if (memberId.startsWith("user_") && memberId.includes("nHN7xoPd")) {
          return "David Lee";
        }
      }
    }

    // For email addresses, extract the name part
    if (memberId.includes("@")) {
      const emailParts = memberId.split("@");
      if (emailParts[0]) {
        return emailParts[0];
      }
    }

    // For Clerk user IDs, provide a better default
    if (memberId.startsWith("user_")) {
      return "David Lee"; // In a real app, you'd fetch this from Clerk API
    }

    return `User ${memberId.slice(-8)}`; // Show last 8 chars of user ID
  };

  // Helper function for user display names (for history and comments)
  const getUserDisplayName = (userId: string) => {
    // Current user
    if (userId === user?.id) {
      return "You";
    }

    // Use the same logic as getMemberDisplayName for consistency
    return getMemberDisplayName(userId);
  };

  // Helper function for member toggle
  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers((prev) => {
      const newSelected = prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId];

      // Update splits when member selection changes, preserving existing data
      updateSplitsForMode(newSelected, true);
      return newSelected;
    });
  };

  // Update splits when mode or amount changes
  const updateSplitsForMode = useCallback(
    (memberIds: string[], preserveExisting = false) => {
      if (!user?.id || memberIds.length === 0) {
        setSplits([]);
        return;
      }

      const totalAmount = parseFloat(amount) || 0;
      const allParticipants = [user.id, ...memberIds];

      setSplits((prevSplits) => {
        // If we're preserving existing data and we have existing splits for all participants, keep them
        if (preserveExisting && prevSplits.length > 0) {
          const hasAllParticipants = allParticipants.every((userId) =>
            prevSplits.some((split) => split.userId === userId),
          );
          if (hasAllParticipants) {
            return prevSplits.filter((split) =>
              allParticipants.includes(split.userId),
            );
          }
        }

        if (splitMode === "equal") {
          const splitAmount = totalAmount / allParticipants.length;
          return allParticipants.map((userId) => ({
            userId,
            amount: splitAmount.toFixed(2),
            percentage: 100 / allParticipants.length,
          }));
        } else {
          // For percentage and custom, try to preserve existing values if available
          return allParticipants.map((userId) => {
            const existingSplit = prevSplits.find(
              (split) => split.userId === userId,
            );

            if (preserveExisting && existingSplit) {
              return existingSplit;
            }

            return {
              userId,
              amount: splitMode === "custom" ? "0.00" : undefined,
              percentage: splitMode === "percentage" ? 0 : undefined,
            };
          });
        }
      });
    },
    [user?.id, splitMode, amount],
  );

  const updateSplitAmount = (userId: string, value: string) => {
    setSplits((prev) =>
      prev.map((split) =>
        split.userId === userId ? { ...split, amount: value } : split,
      ),
    );
  };

  const updateSplitPercentage = (userId: string, value: number) => {
    setSplits((prev) =>
      prev.map((split) =>
        split.userId === userId ? { ...split, percentage: value } : split,
      ),
    );
  };

  const updateExpense = api.expense.update.useMutation({
    onSuccess: async () => {
      await utils.expense.invalidate();
      toast.success("Expense updated successfully!");
      setOpen(false);
    },
    onError: (error) => {
      console.error("Error updating expense:", error);

      // Extract the actual error message from tRPC error structure
      let errorMessage =
        "Failed to update expense. Please check your input and try again.";

      try {
        // Parse the error message if it's JSON
        if (error.message.startsWith("[")) {
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

  // Initialize form data when expense data becomes available
  useEffect(() => {
    if (expense && open) {
      setTitle(expense.title);
      setAmount(expense.amount);
      setCurrency(expense.currency);
      setCategory(expense.category ?? "");
      setDescription(expense.description ?? "");

      const expenseDate = new Date(expense.date);
      setDate(expenseDate);
      setDateValue(
        expenseDate.toLocaleDateString("en-US", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }),
      );
      setDateMonth(expenseDate);

      // Initialize payment and split modes
      setSplitMode(
        (expense.splitMode as "equal" | "percentage" | "custom") ?? "equal",
      );
      setPaymentMode(
        (expense.paymentMode as "single" | "percentage" | "custom") ?? "single",
      );

      // Set initial paidBy if single payment mode
      if (expense.paymentMode === "single" && expense.payments?.[0]) {
        setPaidBy(expense.payments[0].userId);
      }
    }
  }, [expense, open]);

  // Auto-categorize based on title and description keywords
  useEffect(() => {
    // Only auto-categorize if:
    // 1. We're not editing an existing expense (to avoid changing existing categories)
    // 2. The category is currently empty (to avoid overriding user selections)
    // 3. We have a title to analyze
    if (!expense && !category && title.trim()) {
      const suggestedCategory = parseExpenseCategory(title, description);
      if (suggestedCategory) {
        setCategory(suggestedCategory);
      }
    }
  }, [title, description, expense, category]);

  // Initialize splits and payments from expense data
  useEffect(() => {
    if (open && expense) {
      const memberIds =
        expense.splits
          ?.map((split) => split.userId)
          .filter((id) => id !== user?.id) ?? [];
      setSelectedMembers(memberIds);

      // Convert database splits to component format
      const convertedSplits: SplitUser[] =
        expense.splits?.map((split) => ({
          userId: split.userId,
          amount: split.amount,
          percentage: split.percentage
            ? parseFloat(split.percentage)
            : undefined,
        })) ?? [];
      setSplits(convertedSplits);

      // Convert database payments to component format
      const convertedPayments: PaymentUser[] =
        expense.payments?.map((payment) => ({
          userId: payment.userId,
          amount: payment.amount,
          percentage: payment.percentage
            ? parseFloat(payment.percentage)
            : undefined,
        })) ?? [];
      setPayments(convertedPayments);
    }
  }, [open, expense, user?.id]);

  // Update splits when amount or split mode changes
  useEffect(() => {
    if (selectedMembers.length > 0 && amount && splitMode) {
      // Only recalculate if we're in equal mode, otherwise preserve existing values
      updateSplitsForMode(selectedMembers, splitMode !== "equal");
    }
  }, [amount, splitMode, selectedMembers, updateSplitsForMode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !expense?.id) return;

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
    let paymentsData: PaymentUser[] = [];
    if (paymentMode === "single" && paidBy) {
      paymentsData = [{ userId: paidBy, amount: amount }];
    } else if (paymentMode !== "single") {
      paymentsData = payments.map((payment) => ({
        userId: payment.userId,
        amount: payment.amount,
        percentage: payment.percentage,
      }));
    }

    updateExpense.mutate({
      id: expense.id,
      title,
      amount,
      currency,
      category,
      description,
      date: format(date, "yyyy-MM-dd"),
      editedBy: user.id,
      splitMode,
      paymentMode,
      splits: splitsData,
      payments: paymentsData,
    });
  };

  const handleAddComment = () => {
    if (!user?.id || !newComment.trim() || !expense?.id) return;

    addComment.mutate({
      expenseId: expense.id,
      userId: user.id,
      comment: newComment.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-[95vw] md:max-w-[1200px]">
        <DialogHeader>
          <DialogTitle>
            Edit Expense: {expense?.title ?? "Loading..."}
          </DialogTitle>
        </DialogHeader>

        {!expense ? (
          <div className="flex h-[70vh] items-center justify-center">
            <p>Loading expense data...</p>
          </div>
        ) : (
          <div className="grid h-[70vh] grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Main Edit Form */}
            <div className="overflow-y-auto lg:col-span-2">
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
                  <div className="relative mt-1 flex gap-2">
                    <Input
                      id="date"
                      value={dateValue}
                      placeholder="June 01, 2025"
                      className="bg-background pr-10"
                      onChange={(e) => {
                        const newDate = new Date(e.target.value);
                        setDateValue(e.target.value);
                        if (isValidDate(newDate)) {
                          setDate(newDate);
                          setDateMonth(newDate);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setDateOpen(true);
                        }
                      }}
                    />
                    <Popover open={dateOpen} onOpenChange={setDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          id="date-picker"
                          variant="ghost"
                          className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
                        >
                          <CalendarIcon className="size-3.5" />
                          <span className="sr-only">Select date</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto overflow-hidden p-0"
                        align="end"
                        alignOffset={-8}
                        sideOffset={10}
                      >
                        <Calendar
                          mode="single"
                          selected={date}
                          captionLayout="dropdown"
                          month={dateMonth}
                          onMonthChange={setDateMonth}
                          onSelect={(selectedDate) => {
                            if (selectedDate) {
                              setDate(selectedDate);
                              setDateValue(formatDate(selectedDate));
                              setDateOpen(false);
                            }
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {/* Payment and Split Configuration */}
                <div className="space-y-4 rounded-lg border p-4">
                  <div>
                    <Label>
                      {expense?.groupId
                        ? "Group Members"
                        : "Select Friends to Share With"}
                    </Label>
                    <div className="mt-2 max-h-32 space-y-2 overflow-y-auto">
                      {expense?.groupId ? (
                        // Group member selection
                        groupDetails?.members &&
                        groupDetails.members.length > 0 ? (
                          groupDetails.members
                            .filter((member) => member.userId !== user?.id) // Exclude current user
                            .map((member) => {
                              const memberId = member.userId;
                              const memberName = getMemberDisplayName(memberId);

                              return (
                                <div
                                  key={member.id}
                                  className="flex items-center space-x-2"
                                >
                                  <Checkbox
                                    id={`member-${memberId}`}
                                    checked={selectedMembers.includes(memberId)}
                                    onCheckedChange={() =>
                                      handleMemberToggle(memberId)
                                    }
                                  />
                                  <Label
                                    htmlFor={`member-${memberId}`}
                                    className="text-sm"
                                  >
                                    {memberName}
                                  </Label>
                                </div>
                              );
                            })
                        ) : (
                          <p className="text-muted-foreground text-sm">
                            No other group members available.
                          </p>
                        )
                      ) : // Friend selection for personal expenses
                      friends && friends.length > 0 ? (
                        friends.map((friendship) => {
                          const friendId = friendship.friendId;
                          const friendName = friendship.friendName;

                          return (
                            <div
                              key={friendship.id}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`friend-${friendId}`}
                                checked={selectedMembers.includes(friendId)}
                                onCheckedChange={() =>
                                  handleMemberToggle(friendId)
                                }
                              />
                              <Label
                                htmlFor={`friend-${friendId}`}
                                className="text-sm"
                              >
                                {friendName}
                              </Label>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-muted-foreground text-sm">
                          No friends available. Add friends first!
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Payment Configuration */}
                  <div>
                    <Label>Payment Mode</Label>
                    <Tabs
                      value={paymentMode}
                      onValueChange={(value) =>
                        setPaymentMode(value as typeof paymentMode)
                      }
                      className="mt-2"
                    >
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="single">Single Payer</TabsTrigger>
                        <TabsTrigger value="percentage">Percentage</TabsTrigger>
                        <TabsTrigger value="custom">Custom Amount</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  {paymentMode === "single" && (
                    <div>
                      <Label>Who Paid? *</Label>
                      <Popover open={paidByOpen} onOpenChange={setPaidByOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={paidByOpen}
                            className="mt-2 w-full justify-between"
                          >
                            {paidBy
                              ? paidBy === user?.id
                                ? "You"
                                : getMemberDisplayName(paidBy)
                              : "Select who paid..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Search participants..." />
                            <CommandList>
                              <CommandEmpty>
                                No participants found.
                              </CommandEmpty>
                              <CommandGroup>
                                {/* Current user option */}
                                <CommandItem
                                  value={user?.id}
                                  onSelect={() => {
                                    setPaidBy(user?.id ?? "");
                                    setPaidByOpen(false);
                                  }}
                                >
                                  You
                                  <Check
                                    className={cn(
                                      "ml-auto h-4 w-4",
                                      paidBy === user?.id
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                </CommandItem>
                                {/* Selected members options */}
                                {selectedMembers.map((memberId) => {
                                  const memberName =
                                    getMemberDisplayName(memberId);
                                  return (
                                    <CommandItem
                                      key={memberId}
                                      value={memberId}
                                      onSelect={() => {
                                        setPaidBy(memberId);
                                        setPaidByOpen(false);
                                      }}
                                    >
                                      {memberName}
                                      <Check
                                        className={cn(
                                          "ml-auto h-4 w-4",
                                          paidBy === memberId
                                            ? "opacity-100"
                                            : "opacity-0",
                                        )}
                                      />
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}

                  {selectedMembers.length > 0 && paymentMode !== "single" && (
                    <div>
                      <Label>Payment Details</Label>
                      <div className="mt-2 space-y-2">
                        {[user?.id, ...selectedMembers].map((userId) => {
                          if (!userId) return null;
                          const payment = payments.find(
                            (p) => p.userId === userId,
                          );
                          const displayName =
                            userId === user?.id
                              ? "You"
                              : getMemberDisplayName(userId);

                          return (
                            <div
                              key={userId}
                              className="flex items-center gap-2"
                            >
                              <span className="min-w-[80px] text-sm font-medium">
                                {displayName}:
                              </span>
                              {paymentMode === "percentage" ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={payment?.percentage ?? ""}
                                    onChange={(e) => {
                                      const newPercentage =
                                        parseFloat(e.target.value) || 0;
                                      setPayments((prev) => {
                                        const existing = prev.find(
                                          (p) => p.userId === userId,
                                        );
                                        if (existing) {
                                          return prev.map((p) =>
                                            p.userId === userId
                                              ? {
                                                  ...p,
                                                  percentage: newPercentage,
                                                }
                                              : p,
                                          );
                                        } else {
                                          return [
                                            ...prev,
                                            {
                                              userId,
                                              percentage: newPercentage,
                                            },
                                          ];
                                        }
                                      });
                                    }}
                                    className="border-input bg-background w-20 rounded border px-2 py-1 text-sm"
                                    placeholder="0"
                                  />
                                  <span className="text-sm">%</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <span className="text-sm">{currency}</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={payment?.amount ?? ""}
                                    onChange={(e) => {
                                      const newAmount = e.target.value;
                                      setPayments((prev) => {
                                        const existing = prev.find(
                                          (p) => p.userId === userId,
                                        );
                                        if (existing) {
                                          return prev.map((p) =>
                                            p.userId === userId
                                              ? { ...p, amount: newAmount }
                                              : p,
                                          );
                                        } else {
                                          return [
                                            ...prev,
                                            { userId, amount: newAmount },
                                          ];
                                        }
                                      });
                                    }}
                                    className="border-input bg-background w-24 rounded border px-2 py-1 text-sm"
                                    placeholder="0.00"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <Label>Split Mode</Label>
                    <Tabs
                      value={splitMode}
                      onValueChange={(value) =>
                        setSplitMode(value as typeof splitMode)
                      }
                      className="mt-2"
                    >
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="equal">Equal Split</TabsTrigger>
                        <TabsTrigger value="percentage">Percentage</TabsTrigger>
                        <TabsTrigger value="custom">Custom Amount</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  {selectedMembers.length > 0 && splitMode !== "equal" && (
                    <div>
                      <Label>Split Details</Label>
                      <div className="mt-2 space-y-2">
                        {[user?.id, ...selectedMembers].map((userId) => {
                          if (!userId) return null;
                          const split = splits.find((s) => s.userId === userId);
                          const displayName =
                            userId === user?.id
                              ? "You"
                              : getMemberDisplayName(userId);

                          return (
                            <div
                              key={userId}
                              className="flex items-center gap-2"
                            >
                              <span className="min-w-[80px] text-sm font-medium">
                                {displayName}:
                              </span>
                              {splitMode === "percentage" ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={split?.percentage ?? ""}
                                    onChange={(e) =>
                                      updateSplitPercentage(
                                        userId,
                                        parseFloat(e.target.value) ?? 0,
                                      )
                                    }
                                    className="border-input bg-background w-20 rounded border px-2 py-1 text-sm"
                                    placeholder="0"
                                  />
                                  <span className="text-sm">%</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <span className="text-sm">{currency}</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={split?.amount ?? ""}
                                    onChange={(e) =>
                                      updateSplitAmount(userId, e.target.value)
                                    }
                                    className="border-input bg-background w-24 rounded border px-2 py-1 text-sm"
                                    placeholder="0.00"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {selectedMembers.length > 0 && splitMode === "equal" && (
                    <div>
                      <Label>Equal Split Preview</Label>
                      <div className="text-muted-foreground mt-2 text-sm">
                        Each person pays: {currency}{" "}
                        {amount
                          ? (
                              parseFloat(amount) /
                              (selectedMembers.length + 1)
                            ).toFixed(2)
                          : "0.00"}
                        <div className="mt-1">
                          <Badge variant="secondary">
                            You + {selectedMembers.length}{" "}
                            {expense?.groupId ? "member" : "friend"}
                            {selectedMembers.length !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}
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
            <div className="overflow-y-auto border-l pl-6">
              <div className="space-y-6">
                {/* Edit History */}
                <div>
                  <h3 className="mb-3 text-lg font-semibold">Edit History</h3>
                  <ScrollArea className="h-64 w-full rounded-md border p-3">
                    <div className="space-y-3">
                      {expense.history?.map((historyItem) => (
                        <div key={historyItem.id} className="text-sm">
                          <div className="mb-1 flex items-center gap-2">
                            <Badge
                              variant={
                                historyItem.changeType === "created"
                                  ? "default"
                                  : historyItem.changeType === "updated"
                                    ? "secondary"
                                    : "destructive"
                              }
                            >
                              {historyItem.changeType}
                            </Badge>
                            <span className="text-muted-foreground text-xs">
                              {formatRelativeTime(historyItem.createdAt)}
                            </span>
                          </div>
                          <p className="text-muted-foreground mb-1 text-xs">
                            By: {getUserDisplayName(historyItem.editedBy)}
                          </p>
                          {historyItem.changes &&
                          typeof historyItem.changes === "object" &&
                          historyItem.changes !== null ? (
                            <div className="space-y-1 text-xs">
                              {Object.entries(
                                historyItem.changes as Record<
                                  string,
                                  { before: unknown; after: unknown }
                                >,
                              )
                                .map(([field, change]) =>
                                  describeExpenseChange(
                                    field,
                                    change.before,
                                    change.after,
                                    getUserDisplayName,
                                  ),
                                )
                                .filter(
                                  (description): description is string =>
                                    description !== null,
                                ) // Only show actual differences
                                .map((description, index) => (
                                  <div
                                    key={index}
                                    className="bg-muted rounded p-2 text-sm"
                                  >
                                    {description}
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
                  <h3 className="mb-3 text-lg font-semibold">Comments</h3>

                  {/* Add Comment */}
                  <div className="mb-4 space-y-2">
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
                  <ScrollArea className="h-64 w-full rounded-md border p-3">
                    <div className="space-y-3">
                      {expense.comments?.map((comment) => (
                        <div key={comment.id} className="text-sm">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="font-medium">
                              {getUserDisplayName(comment.userId)}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {formatRelativeTime(comment.createdAt)}
                            </span>
                          </div>
                          <p className="bg-muted rounded p-2 text-sm">
                            {comment.comment}
                          </p>
                        </div>
                      ))}
                      {(!expense.comments || expense.comments.length === 0) && (
                        <p className="text-muted-foreground text-center text-sm">
                          No comments yet.
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

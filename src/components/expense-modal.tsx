"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import * as cc from "currency-codes";

import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpenseModalProps {
  children: React.ReactNode;
  groupId?: number | null;
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

export function ExpenseModal({ children, groupId }: ExpenseModalProps) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [splitMode, setSplitMode] = useState<"equal" | "percentage" | "custom">(
    "equal",
  );
  const [paymentMode, setPaymentMode] = useState<"single" | "percentage" | "custom">(
    "single",
  );
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [splits, setSplits] = useState<SplitUser[]>([]);
  const [payments, setPayments] = useState<PaymentUser[]>([]);
  const [paidBy, setPaidBy] = useState<string>("");
  const [paidByOpen, setPaidByOpen] = useState(false);

  const utils = api.useUtils();

  const friends = api.friends.getFriends.useQuery(
    { userId: user?.id ?? "" },
    { enabled: !!user?.id },
  );

  const groupDetails = api.groups.getGroupDetails.useQuery(
    { groupId: groupId! },
    { enabled: !!groupId },
  );

  const createExpense = api.expense.create.useMutation({
    onSuccess: async () => {
      await utils.expense.invalidate();
      setTitle("");
      setAmount("");
      setCurrency("USD");
      setCategory("");
      setDescription("");
      setDate(new Date().toISOString().split("T")[0]);
      setSplitMode("equal");
      setPaymentMode("single");
      setSelectedMembers([]);
      setSplits([]);
      setPayments([]);
      setPaidBy("");
      setOpen(false);
    },
    onError: (error) => {
      console.error("Error creating expense:", error);
      
      // Extract the actual error message from tRPC error structure
      let errorMessage = "Failed to create expense. Please check your input and try again.";
      
      try {
        // Parse the error message if it's JSON
        if (error.message.startsWith('[')) {
          const parsed = JSON.parse(error.message);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.message) {
            errorMessage = parsed[0].message;
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

  // Auto-select all group members when creating a group expense and set default payer
  useEffect(() => {
    if (groupId && groupDetails.data?.members && open) {
      const memberIds = groupDetails.data.members
        .filter(member => member.userId !== user?.id) // Exclude current user
        .map(member => member.userId);
      setSelectedMembers(memberIds);
      // Set current user as default payer
      if (user?.id && !paidBy) {
        setPaidBy(user.id);
      }
    } else if (!groupId && open) {
      setSelectedMembers([]);
      // Set current user as default payer for personal expenses too
      if (user?.id && !paidBy) {
        setPaidBy(user.id);
      }
    }
  }, [groupId, groupDetails.data?.members, open, user?.id, paidBy]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !title || !amount || !date) return;

    // Validate that members are selected
    if (selectedMembers.length === 0) {
      toast.error(groupId ? "Please select group members to share with" : "Please select friends to share with");
      return;
    }

    // Validate payment configuration
    if (paymentMode === "single") {
      if (!paidBy) {
        toast.error("Please select who paid for this expense");
        return;
      }
    } else {
      if (payments.length === 0) {
        toast.error("Please configure payment details");
        return;
      }
    }

    // Prepare splits data
    let splitsData: SplitUser[] = [];
    splitsData = selectedMembers.map((memberId) => {
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

    createExpense.mutate({
      title,
      amount,
      currency,
      category,
      description,
      date,
      userId: user.id,
      groupId: groupId ?? undefined,
      splitMode,
      paymentMode,
      splits: splitsData,
      payments: paymentsData,
    });
  };

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers((prev) => {
      const newSelected = prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId];

      // Update splits when member selection changes
      updateSplitsForMode(newSelected);
      return newSelected;
    });
  };

  const updateSplitsForMode = useCallback(
    (memberIds: string[]) => {
      if (!user?.id || memberIds.length === 0) {
        setSplits([]);
        return;
      }

      const totalAmount = parseFloat(amount) || 0;
      const allParticipants = [user.id, ...memberIds];

      if (splitMode === "equal") {
        const splitAmount = totalAmount / allParticipants.length;
        setSplits(
          allParticipants.map((userId) => ({
            userId,
            amount: splitAmount.toFixed(2),
            percentage: 100 / allParticipants.length,
          })),
        );
      } else {
        // For percentage and custom, initialize with empty values
        setSplits(
          allParticipants.map((userId) => ({
            userId,
            amount: splitMode === "custom" ? "0.00" : undefined,
            percentage: splitMode === "percentage" ? 0 : undefined,
          })),
        );
      }
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

  // Update splits when amount or split mode changes
  useEffect(() => {
    if (selectedMembers.length > 0) {
      updateSplitsForMode(selectedMembers);
    }
  }, [amount, splitMode, selectedMembers, updateSplitsForMode]);

  const getMemberDisplayName = (memberId: string) => {
    // Fall back to friends list first (if they happen to be friends)
    if (friends.data) {
      const friendship = friends.data.find((f) => f.friendId === memberId);
      if (friendship?.friendName) {
        return friendship.friendName;
      }
    }
    
    // For group members who aren't friends, show userId (email or user ID)
    // In a real app, you'd want to fetch display names from Clerk
    if (memberId.includes('@')) {
      return memberId; // Show email directly
    }
    
    return `User ${memberId.slice(-8)}`; // Show last 8 chars of user ID
  };

  // Get all currencies for comprehensive list
  const allCodes = cc.codes();
  const currencyOptions = allCodes
    .map((code) => {
      const currency = cc.code(code);
      return {
        value: code,
        label: `${code} - ${currency?.currency ?? code}`,
        searchText:
          `${code} ${currency?.currency ?? code} ${currency?.countries?.join(" ") ?? ""}`.toLowerCase(),
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <input
              id="title"
              type="text"
              placeholder="Expense title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-input bg-background mt-1 w-full rounded-md border px-3 py-2 text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="amount">Amount *</Label>
              <input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="border-input bg-background mt-1 w-full rounded-md border px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <Label htmlFor="currency">Currency *</Label>
              <Popover open={currencyOpen} onOpenChange={setCurrencyOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={currencyOpen}
                    className="mt-1 w-full justify-between"
                  >
                    {currency
                      ? currencyOptions.find(
                          (option) => option.value === currency,
                        )?.label
                      : "Select currency..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput
                      placeholder="Search currency..."
                      className="h-9"
                    />
                    <CommandList>
                      <CommandEmpty>No currency found.</CommandEmpty>
                      <CommandGroup>
                        {currencyOptions.map((option) => (
                          <CommandItem
                            key={option.value}
                            value={option.value}
                            onSelect={(currentValue) => {
                              setCurrency(
                                currentValue === currency ? "" : currentValue,
                              );
                              setCurrencyOpen(false);
                            }}
                          >
                            {option.label}
                            <Check
                              className={cn(
                                "ml-auto",
                                currency === option.value
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <input
              id="category"
              type="text"
              placeholder="Food, Transportation, etc."
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border-input bg-background mt-1 w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <Label htmlFor="date">Date *</Label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border-input bg-background mt-1 w-full rounded-md border px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              placeholder="Optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border-input bg-background mt-1 min-h-[80px] w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-4 rounded-lg border p-4">
            <div>
              <Label>
                {groupId ? "Group Members" : "Select Friends to Share With"}
              </Label>
              <div className="mt-2 max-h-32 space-y-2 overflow-y-auto">
                {groupId ? (
                  // Group member selection
                  groupDetails.data?.members && groupDetails.data.members.length > 0 ? (
                    groupDetails.data.members
                      .filter(member => member.userId !== user?.id) // Exclude current user
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
                              onCheckedChange={() => handleMemberToggle(memberId)}
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
                ) : (
                  // Friend selection for personal expenses
                  friends.data && friends.data.length > 0 ? (
                    friends.data.map((friendship) => {
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
                            onCheckedChange={() => handleMemberToggle(friendId)}
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
                  )
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
                        <CommandEmpty>No participants found.</CommandEmpty>
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
                                paidBy === user?.id ? "opacity-100" : "opacity-0",
                              )}
                            />
                          </CommandItem>
                          {/* Selected members options */}
                          {selectedMembers.map((memberId) => {
                            const memberName = getMemberDisplayName(memberId);
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
                                    paidBy === memberId ? "opacity-100" : "opacity-0",
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
                    const payment = payments.find((p) => p.userId === userId);
                    const displayName =
                      userId === user?.id
                        ? "You"
                        : getMemberDisplayName(userId);

                    return (
                      <div key={userId} className="flex items-center gap-2">
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
                                const newPercentage = parseFloat(e.target.value) || 0;
                                setPayments((prev) => {
                                  const existing = prev.find((p) => p.userId === userId);
                                  if (existing) {
                                    return prev.map((p) =>
                                      p.userId === userId
                                        ? { ...p, percentage: newPercentage }
                                        : p,
                                    );
                                  } else {
                                    return [...prev, { userId, percentage: newPercentage }];
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
                                  const existing = prev.find((p) => p.userId === userId);
                                  if (existing) {
                                    return prev.map((p) =>
                                      p.userId === userId
                                        ? { ...p, amount: newAmount }
                                        : p,
                                    );
                                  } else {
                                    return [...prev, { userId, amount: newAmount }];
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
                      <div key={userId} className="flex items-center gap-2">
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
                      You + {selectedMembers.length} {groupId ? "member" : "friend"}
                      {selectedMembers.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={createExpense.isPending}
          >
            {createExpense.isPending ? "Adding..." : "Add Expense"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

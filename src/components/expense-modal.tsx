"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface ExpenseModalProps {
  children: React.ReactNode;
}

export function ExpenseModal({ children }: ExpenseModalProps) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const utils = api.useUtils();

  const createExpense = api.expense.create.useMutation({
    onSuccess: async () => {
      await utils.expense.invalidate();
      setTitle("");
      setAmount("");
      setCurrency("USD");
      setCategory("");
      setDescription("");
      setDate(new Date().toISOString().split('T')[0]);
      setOpen(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !title || !amount || !date) return;

    createExpense.mutate({
      title,
      amount,
      currency,
      category,
      description,
      date,
      userId: user.id,
    });
  };

  // Get popular currencies for easier selection
  const popularCurrencies = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "INR"];
  const popularCurrencyOptions = popularCurrencies.map(code => {
    const currency = cc.code(code);
    return {
      code,
      name: currency?.currency || code,
      countries: currency?.countries || []
    };
  });

  // Get all currencies for comprehensive list
  const allCodes = cc.codes();
  const allCurrencyOptions = allCodes
    .map(code => {
      const currency = cc.code(code);
      return {
        code,
        name: currency?.currency || code,
        countries: currency?.countries || []
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
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
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
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
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="currency">Currency *</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                    Popular
                  </div>
                  {popularCurrencyOptions.map((curr) => (
                    <SelectItem key={curr.code} value={curr.code}>
                      {curr.code} - {curr.name}
                    </SelectItem>
                  ))}
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">
                    All Currencies
                  </div>
                  {allCurrencyOptions.map((curr) => (
                    <SelectItem key={curr.code} value={curr.code}>
                      {curr.code} - {curr.name} ({curr.countries.slice(0, 2).join(', ')}{curr.countries.length > 2 ? ', ...' : ''})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="date">Date *</Label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
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
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] mt-1"
            />
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
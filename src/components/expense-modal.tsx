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
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpenseModalProps {
  children: React.ReactNode;
}

export function ExpenseModal({ children }: ExpenseModalProps) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [currencyOpen, setCurrencyOpen] = useState(false);
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

  // Get all currencies for comprehensive list
  const allCodes = cc.codes();
  const currencyOptions = allCodes
    .map(code => {
      const currency = cc.code(code);
      return {
        value: code,
        label: `${code} - ${currency?.currency ?? code}`,
        searchText: `${code} ${currency?.currency ?? code} ${currency?.countries?.join(' ') ?? ''}`.toLowerCase()
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

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
              <Popover open={currencyOpen} onOpenChange={setCurrencyOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={currencyOpen}
                    className="w-full justify-between mt-1"
                  >
                    {currency
                      ? currencyOptions.find((option) => option.value === currency)?.label
                      : "Select currency..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput placeholder="Search currency..." className="h-9" />
                    <CommandList>
                      <CommandEmpty>No currency found.</CommandEmpty>
                      <CommandGroup>
                        {currencyOptions.map((option) => (
                          <CommandItem
                            key={option.value}
                            value={option.value}
                            onSelect={(currentValue) => {
                              setCurrency(currentValue === currency ? "" : currentValue);
                              setCurrencyOpen(false);
                            }}
                          >
                            {option.label}
                            <Check
                              className={cn(
                                "ml-auto",
                                currency === option.value ? "opacity-100" : "opacity-0"
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
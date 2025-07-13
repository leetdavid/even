import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Expense calculation utilities
export interface ExpenseSplit {
  userId: string;
  amount?: string;
  percentage?: number;
}

export interface ExpensePayment {
  userId: string;
  amount?: string;
  percentage?: number;
}

/**
 * Calculate equal splits for an expense
 */
export function calculateEqualSplits(totalAmount: number, participantIds: string[]): ExpenseSplit[] {
  if (participantIds.length === 0) return [];
  
  const splitAmount = totalAmount / participantIds.length;
  const percentage = 100 / participantIds.length;
  
  return participantIds.map(userId => ({
    userId,
    amount: splitAmount.toFixed(2),
    percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
  }));
}

/**
 * Calculate splits from percentages
 */
export function calculatePercentageSplits(totalAmount: number, splits: ExpenseSplit[]): ExpenseSplit[] {
  return splits.map(split => ({
    ...split,
    amount: split.percentage 
      ? ((totalAmount * split.percentage) / 100).toFixed(2)
      : "0.00",
  }));
}

/**
 * Validate that splits add up to 100% or the total amount
 */
export function validateSplits(
  totalAmount: number,
  splits: ExpenseSplit[],
  mode: "equal" | "percentage" | "custom"
): { isValid: boolean; error?: string } {
  if (splits.length === 0) {
    return { isValid: false, error: "No splits provided" };
  }

  if (mode === "percentage") {
    const totalPercentage = splits.reduce((sum, split) => sum + (split.percentage ?? 0), 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return { 
        isValid: false, 
        error: `Percentages must add up to 100%, currently ${totalPercentage.toFixed(2)}%` 
      };
    }
  }

  if (mode === "custom") {
    const totalSplitAmount = splits.reduce((sum, split) => sum + parseFloat(split.amount ?? "0"), 0);
    if (Math.abs(totalSplitAmount - totalAmount) > 0.01) {
      return { 
        isValid: false, 
        error: `Split amounts must add up to ${totalAmount.toFixed(2)}, currently ${totalSplitAmount.toFixed(2)}` 
      };
    }
  }

  return { isValid: true };
}

/**
 * Validate that payments add up to 100% or the total amount
 */
export function validatePayments(
  totalAmount: number,
  payments: ExpensePayment[],
  mode: "single" | "percentage" | "custom"
): { isValid: boolean; error?: string } {
  if (payments.length === 0) {
    return { isValid: false, error: "No payments provided" };
  }

  if (mode === "single") {
    // Single payer should pay the full amount
    const payment = payments[0];
    if (!payment) return { isValid: false, error: "No payment data" };
    
    const paidAmount = parseFloat(payment.amount ?? "0");
    if (Math.abs(paidAmount - totalAmount) > 0.01) {
      return { 
        isValid: false, 
        error: `Single payer must pay the full amount of ${totalAmount.toFixed(2)}` 
      };
    }
  }

  if (mode === "percentage") {
    const totalPercentage = payments.reduce((sum, payment) => sum + (payment.percentage ?? 0), 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return { 
        isValid: false, 
        error: `Payment percentages must add up to 100%, currently ${totalPercentage.toFixed(2)}%` 
      };
    }
  }

  if (mode === "custom") {
    const totalPaymentAmount = payments.reduce((sum, payment) => sum + parseFloat(payment.amount ?? "0"), 0);
    if (Math.abs(totalPaymentAmount - totalAmount) > 0.01) {
      return { 
        isValid: false, 
        error: `Payment amounts must add up to ${totalAmount.toFixed(2)}, currently ${totalPaymentAmount.toFixed(2)}` 
      };
    }
  }

  return { isValid: true };
}

/**
 * Format currency amount with symbol
 */
export function formatCurrency(amount: number | string, currency = "USD"): string {
  const numericAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) return `${currency} 0.00`;
  
  return `${currency} ${numericAmount.toFixed(2)}`;
}

/**
 * Calculate who owes whom based on payments and splits
 */
export function calculateDebts(
  splits: ExpenseSplit[], 
  payments: ExpensePayment[]
): { from: string; to: string; amount: number }[] {
  const balances: Record<string, number> = {};
  
  // Calculate what each person should pay (negative balance)
  splits.forEach(split => {
    const amount = parseFloat(split.amount ?? "0");
    balances[split.userId] = (balances[split.userId] ?? 0) - amount;
  });
  
  // Add what each person actually paid (positive balance)
  payments.forEach(payment => {
    const amount = parseFloat(payment.amount ?? "0");
    balances[payment.userId] = (balances[payment.userId] ?? 0) + amount;
  });
  
  // Convert balances to debts
  const debts: { from: string; to: string; amount: number }[] = [];
  const creditors = Object.entries(balances).filter(([_, balance]) => balance > 0.01);
  const debtors = Object.entries(balances).filter(([_, balance]) => balance < -0.01);
  
  // Settle debts by matching debtors with creditors
  debtors.forEach(([debtor, debtAmount]) => {
    let remainingDebt = Math.abs(debtAmount);
    
    creditors.forEach(([creditor, creditAmount]) => {
      if (remainingDebt > 0.01 && creditAmount > 0.01) {
        const settleAmount = Math.min(remainingDebt, creditAmount);
        
        debts.push({
          from: debtor,
          to: creditor,
          amount: settleAmount,
        });
        
        remainingDebt -= settleAmount;
        balances[creditor] -= settleAmount;
      }
    });
  });
  
  return debts.filter(debt => debt.amount > 0.01);
}

/**
 * Format a date as relative time (e.g., "3 days ago", "2 hours ago")
 */
export function formatRelativeTime(date: Date | string | number): string {
  const targetDate = dayjs(date);
  
  // Check if date is valid
  if (!targetDate.isValid()) {
    return "Invalid date";
  }
  
  return targetDate.fromNow();
}

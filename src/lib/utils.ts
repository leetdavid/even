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
export function calculateEqualSplits(
  totalAmount: number,
  participantIds: string[],
): ExpenseSplit[] {
  if (participantIds.length === 0) return [];

  const splitAmount = totalAmount / participantIds.length;
  const percentage = 100 / participantIds.length;

  return participantIds.map((userId) => ({
    userId,
    amount: splitAmount.toFixed(2),
    percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
  }));
}

/**
 * Calculate splits from percentages
 */
export function calculatePercentageSplits(
  totalAmount: number,
  splits: ExpenseSplit[],
): ExpenseSplit[] {
  return splits.map((split) => ({
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
  mode: "equal" | "percentage" | "custom",
): { isValid: boolean; error?: string } {
  if (splits.length === 0) {
    return { isValid: false, error: "No splits provided" };
  }

  if (mode === "percentage") {
    const totalPercentage = splits.reduce(
      (sum, split) => sum + (split.percentage ?? 0),
      0,
    );
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return {
        isValid: false,
        error: `Percentages must add up to 100%, currently ${totalPercentage.toFixed(2)}%`,
      };
    }
  }

  if (mode === "custom") {
    const totalSplitAmount = splits.reduce(
      (sum, split) => sum + parseFloat(split.amount ?? "0"),
      0,
    );
    if (Math.abs(totalSplitAmount - totalAmount) > 0.01) {
      return {
        isValid: false,
        error: `Split amounts must add up to ${totalAmount.toFixed(2)}, currently ${totalSplitAmount.toFixed(2)}`,
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
  mode: "single" | "percentage" | "custom",
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
        error: `Single payer must pay the full amount of ${totalAmount.toFixed(2)}`,
      };
    }
  }

  if (mode === "percentage") {
    const totalPercentage = payments.reduce(
      (sum, payment) => sum + (payment.percentage ?? 0),
      0,
    );
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return {
        isValid: false,
        error: `Payment percentages must add up to 100%, currently ${totalPercentage.toFixed(2)}%`,
      };
    }
  }

  if (mode === "custom") {
    const totalPaymentAmount = payments.reduce(
      (sum, payment) => sum + parseFloat(payment.amount ?? "0"),
      0,
    );
    if (Math.abs(totalPaymentAmount - totalAmount) > 0.01) {
      return {
        isValid: false,
        error: `Payment amounts must add up to ${totalAmount.toFixed(2)}, currently ${totalPaymentAmount.toFixed(2)}`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Format currency amount with symbol
 */
export function formatCurrency(
  amount: number | string,
  currency = "USD",
): string {
  const numericAmount =
    typeof amount === "string" ? parseFloat(amount) : amount;

  if (isNaN(numericAmount)) return `${currency} 0.00`;

  return `${currency} ${numericAmount.toFixed(2)}`;
}

/**
 * Calculate who owes whom based on payments and splits
 */
export function calculateDebts(
  splits: ExpenseSplit[],
  payments: ExpensePayment[],
): { from: string; to: string; amount: number }[] {
  const balances: Record<string, number> = {};

  // Calculate what each person should pay (negative balance)
  splits.forEach((split) => {
    const amount = parseFloat(split.amount ?? "0");
    balances[split.userId] = (balances[split.userId] ?? 0) - amount;
  });

  // Add what each person actually paid (positive balance)
  payments.forEach((payment) => {
    const amount = parseFloat(payment.amount ?? "0");
    balances[payment.userId] = (balances[payment.userId] ?? 0) + amount;
  });

  // Convert balances to debts
  const debts: { from: string; to: string; amount: number }[] = [];
  const creditors = Object.entries(balances).filter(
    ([_, balance]) => balance > 0.01,
  );
  const debtors = Object.entries(balances).filter(
    ([_, balance]) => balance < -0.01,
  );

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
        balances[creditor] = (balances[creditor] ?? 0) - settleAmount;
      }
    });
  });

  return debts.filter((debt) => debt.amount > 0.01);
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

/**
 * Automatically parse category from expense title and description based on keywords
 */
export function parseExpenseCategory(
  title: string,
  description?: string,
): string | null {
  const text = `${title} ${description ?? ""}`.toLowerCase();

  // Handle common conflicts explicitly - use word boundaries to avoid partial matches
  const transportationRegex = /\b(taxi|uber|lyft|rideshare|cab)\b/;
  if (transportationRegex.test(text)) {
    return "Transportation";
  }

  // Define category mappings with keywords (ordered by specificity - longest/most specific first)
  const categoryMappings = {
    "Food & Dining": [
      "subway sandwich",
      "burger king",
      "taco bell",
      "whole foods",
      "trader joe",
      "restaurant",
      "starbucks",
      "mcdonald",
      "chipotle",
      "domino",
      "grocery",
      "supermarket",
      "safeway",
      "cafe",
      "coffee",
      "dunkin",
      "kfc",
      "pizza",
      "lunch",
      "dinner",
      "breakfast",
      "meal",
      "food",
      "snack",
    ],
    Transportation: [
      "gas station",
      "rental car",
      "car rental",
      "rideshare",
      "uber",
      "lyft",
      "taxi",
      "fuel",
      "parking",
      "toll",
      "metro",
      "subway",
      "bus",
      "train",
      "flight",
      "plane",
      "airplane",
      "airline",
      "airport",
    ],
    Entertainment: [
      "amusement park",
      "netflix",
      "spotify",
      "disney",
      "hulu",
      "movie",
      "cinema",
      "theater",
      "concert",
      "game",
      "entertainment",
    ],
    "Health & Medical": [
      "urgent care",
      "doctor",
      "hospital",
      "pharmacy",
      "cvs",
      "walgreens",
      "medicine",
      "medical",
      "health",
      "dentist",
      "clinic",
      "prescription",
    ],
    Utilities: [
      "gas utility",
      "electric",
      "electricity",
      "power",
      "water",
      "internet",
      "wifi",
      "phone",
      "cable",
      "utility",
      "bill",
      "comcast",
      "verizon",
      "att",
    ],
    "Home & Garden": [
      "home depot",
      "home improvement",
      "cleaning supplies",
      "lowes",
      "ikea",
      "furniture",
      "repair",
      "maintenance",
      "garden",
      "lawn",
    ],
    Travel: [
      "hotel",
      "airbnb",
      "expedia",
      "accommodation",
      "resort",
      "motel",
      "travel",
      "vacation",
      "trip",
    ],
    Education: [
      "textbook",
      "university",
      "college",
      "tuition",
      "course",
      "education",
      "school",
      "class",
      "training",
      "certification",
    ],
    "Personal Care": [
      "personal care",
      "salon",
      "haircut",
      "barber",
      "spa",
      "cosmetics",
      "beauty",
      "makeup",
      "gym",
      "fitness",
      "massage",
    ],
    Shopping: [
      "best buy",
      "apple store",
      "amazon",
      "target",
      "walmart",
      "costco",
      "clothing",
      "clothes",
      "shoes",
      "electronics",
      "shopping",
      "mall",
      "store",
    ],
  };

  // Find all matches and return the category with the best matching keyword
  // Priority is given to: 1) longest keyword, 2) transportation/food over generic categories
  const categoryPriority: Record<string, number> = {
    Transportation: 10,
    "Food & Dining": 9,
    "Health & Medical": 8,
    Utilities: 7,
    Entertainment: 6,
    "Personal Care": 5,
    Education: 4,
    "Home & Garden": 3,
    Shopping: 2,
    Travel: 1,
  };

  let bestMatch = {
    category: null as string | null,
    keywordLength: 0,
    priority: 0,
  };

  for (const [category, keywords] of Object.entries(categoryMappings)) {
    const priority = categoryPriority[category] ?? 0;
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        // Prefer longer keywords, but in case of close length (within 2 chars), prefer higher priority categories
        const isLonger = keyword.length > bestMatch.keywordLength;
        const isSameLengthHigherPriority =
          keyword.length === bestMatch.keywordLength &&
          priority > bestMatch.priority;
        const isCloseButHigherPriority =
          Math.abs(keyword.length - bestMatch.keywordLength) <= 2 &&
          priority > bestMatch.priority;

        if (
          isLonger ||
          isSameLengthHigherPriority ||
          (bestMatch.keywordLength > 0 && isCloseButHigherPriority)
        ) {
          bestMatch = { category, keywordLength: keyword.length, priority };
        }
      }
    }
  }

  return bestMatch.category;
}

/**
 * Convert expense changes into plain English descriptions
 * Returns null if values are the same, otherwise returns a human-readable description
 */
export function describeExpenseChange(
  field: string,
  before: unknown,
  after: unknown,
  getUserName?: (userId: string) => string,
): string | null {
  // Helper to get user display name
  const getDisplayName = (userId: string): string => {
    if (getUserName) {
      return getUserName(userId);
    }
    // Fallback for user display
    if (userId.includes("@")) {
      const emailParts = userId.split("@");
      return emailParts[0] ?? userId;
    }
    if (userId.startsWith("user_")) {
      return "User"; // Fallback name
    }
    return userId;
  };

  // Helper to format values consistently
  const formatValue = (value: unknown): string => {
    if (typeof value === "string") return value;
    if (typeof value === "number") return value.toString();
    if (typeof value === "boolean") return value.toString();
    if (Array.isArray(value)) return JSON.stringify(value);
    if (typeof value === "object" && value !== null)
      return JSON.stringify(value);
    if (value === null || value === undefined) return "";
    return JSON.stringify(value);
  };

  // Check if values are actually different
  const beforeStr = formatValue(before);
  const afterStr = formatValue(after);

  if (beforeStr === afterStr) {
    return null; // No difference
  }

  // Format specific field types with natural language
  switch (field) {
    case "title":
      return `Title changed from "${String(before)}" to "${String(after)}"`;

    case "amount":
      return `Amount changed from ${String(before)} to ${String(after)}`;

    case "currency":
      return `Currency changed from ${String(before)} to ${String(after)}`;

    case "category":
      const beforeCat = (before as string | null | undefined) ?? "none";
      const afterCat = (after as string | null | undefined) ?? "none";
      return `Category changed from ${beforeCat} to ${afterCat}`;

    case "description":
      const beforeDesc = (before as string | null | undefined) ?? "";
      const afterDesc = (after as string | null | undefined) ?? "";
      return `Description changed from ${beforeDesc || "empty"} to ${afterDesc || "empty"}`;

    case "date":
      return `Date changed from ${String(before)} to ${String(after)}`;

    case "splitMode":
      const beforeSplitMode =
        before === "equal"
          ? "equal split"
          : before === "percentage"
            ? "percentage split"
            : "custom amounts";
      const afterSplitMode =
        after === "equal"
          ? "equal split"
          : after === "percentage"
            ? "percentage split"
            : "custom amounts";
      return `Split method changed from ${beforeSplitMode} to ${afterSplitMode}`;

    case "paymentMode":
      const beforePayMode =
        before === "single"
          ? "single payer"
          : before === "percentage"
            ? "percentage payments"
            : "custom payments";
      const afterPayMode =
        after === "single"
          ? "single payer"
          : after === "percentage"
            ? "percentage payments"
            : "custom payments";
      return `Payment method changed from ${beforePayMode} to ${afterPayMode}`;

    case "splits":
      const beforeSplits = Array.isArray(before) ? before : [];
      const afterSplits = Array.isArray(after) ? after : [];

      // More robust comparison - check if arrays have same length and same content
      if (beforeSplits.length === afterSplits.length) {
        const isIdentical = beforeSplits.every(
          (beforeSplit: unknown, index) => {
            const afterSplit = afterSplits[index] as unknown;
            if (
              !afterSplit ||
              typeof beforeSplit !== "object" ||
              typeof afterSplit !== "object"
            )
              return false;

            const before = beforeSplit as Record<string, unknown>;
            const after = afterSplit as Record<string, unknown>;

            return (
              before.userId === after.userId &&
              before.amount === after.amount &&
              before.percentage === after.percentage
            );
          },
        );
        if (isIdentical) {
          return null;
        }
      }

      const formatSplits = (
        splits: Array<{ userId: string; amount?: string; percentage?: number }>,
      ): string => {
        if (splits.length === 0) return "no splits";
        return splits
          .map((split) => {
            const name = getDisplayName(split.userId);
            if (split.amount) {
              return `${name}: ${split.amount}`;
            } else if (split.percentage) {
              return `${name}: ${split.percentage}%`;
            }
            return `${name}: 0`;
          })
          .join(", ");
      };

      return `Splits changed from ${formatSplits(beforeSplits as Array<{ userId: string; amount?: string; percentage?: number }>)} to ${formatSplits(afterSplits as Array<{ userId: string; amount?: string; percentage?: number }>)}`;

    case "payments":
      const beforePayments = Array.isArray(before) ? before : [];
      const afterPayments = Array.isArray(after) ? after : [];

      // More robust comparison - check if arrays have same length and same content
      if (beforePayments.length === afterPayments.length) {
        const isIdentical = beforePayments.every(
          (beforePayment: unknown, index) => {
            const afterPayment = afterPayments[index] as unknown;
            if (
              !afterPayment ||
              typeof beforePayment !== "object" ||
              typeof afterPayment !== "object"
            )
              return false;

            const before = beforePayment as Record<string, unknown>;
            const after = afterPayment as Record<string, unknown>;

            return (
              before.userId === after.userId &&
              before.amount === after.amount &&
              before.percentage === after.percentage
            );
          },
        );
        if (isIdentical) {
          return null;
        }
      }

      const formatPayments = (
        payments: Array<{
          userId: string;
          amount?: string;
          percentage?: number;
        }>,
      ): string => {
        if (payments.length === 0) return "no payments";
        return payments
          .map((payment) => {
            const name = getDisplayName(payment.userId);
            if (payment.amount) {
              return `${name}: ${payment.amount}`;
            } else if (payment.percentage) {
              return `${name}: ${payment.percentage}%`;
            }
            return `${name}: 0`;
          })
          .join(", ");
      };

      return `Payments changed from ${formatPayments(beforePayments as Array<{ userId: string; amount?: string; percentage?: number }>)} to ${formatPayments(afterPayments as Array<{ userId: string; amount?: string; percentage?: number }>)}`;

    default:
      // For unknown fields, just show a simple change
      return `${field.charAt(0).toUpperCase() + field.slice(1)} changed from ${String(before)} to ${String(after)}`;
  }
}

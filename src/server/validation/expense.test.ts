import { describe, it, expect } from "vitest";
import { z } from "zod";

// Extract the validation schema for testing
const createExpenseSchema = z
  .object({
    title: z.string().min(1),
    amount: z.string().min(1),
    currency: z.string().default("USD"),
    category: z.string().optional(),
    description: z.string().optional(),
    date: z.string(),
    userId: z.string(),
    groupId: z.number().optional(),
    splitMode: z.enum(["equal", "percentage", "custom"]).default("equal"),
    paymentMode: z.enum(["single", "percentage", "custom"]).default("single"),
    splits: z
      .array(
        z.object({
          userId: z.string(),
          amount: z.string().optional(),
          percentage: z.number().optional(),
        }),
      )
      .optional(),
    payments: z
      .array(
        z.object({
          userId: z.string(),
          amount: z.string().optional(),
          percentage: z.number().optional(),
        }),
      )
      .optional(),
  })
  .refine(
    (data) => {
      // Validate splits add up to 100% or total amount
      if (data.splits && data.splits.length > 0) {
        const totalAmount = parseFloat(data.amount);

        if (data.splitMode === "percentage") {
          const totalPercentage = data.splits.reduce(
            (sum, split) => sum + (split.percentage ?? 0),
            0,
          );
          if (Math.abs(totalPercentage - 100) > 0.01) {
            return false;
          }
        } else if (data.splitMode === "custom") {
          const totalSplitAmount = data.splits.reduce(
            (sum, split) => sum + parseFloat(split.amount ?? "0"),
            0,
          );
          if (Math.abs(totalSplitAmount - totalAmount) > 0.01) {
            return false;
          }
        }
      }

      // Validate payments add up to 100% or total amount
      if (data.payments && data.payments.length > 0) {
        const totalAmount = parseFloat(data.amount);

        if (data.paymentMode === "percentage") {
          const totalPercentage = data.payments.reduce(
            (sum, payment) => sum + (payment.percentage ?? 0),
            0,
          );
          if (Math.abs(totalPercentage - 100) > 0.01) {
            return false;
          }
        } else if (data.paymentMode === "custom") {
          const totalPaymentAmount = data.payments.reduce(
            (sum, payment) => sum + parseFloat(payment.amount ?? "0"),
            0,
          );
          if (Math.abs(totalPaymentAmount - totalAmount) > 0.01) {
            return false;
          }
        }
      }

      return true;
    },
    {
      message: "Splits and payments must add up to the total amount or 100%",
    },
  );

describe("Expense Validation Schema", () => {
  const validBaseExpense = {
    title: "Test Expense",
    amount: "100.00",
    currency: "USD",
    date: "2024-01-01",
    userId: "user123",
  };

  it("should validate a basic expense", () => {
    const result = createExpenseSchema.safeParse(validBaseExpense);
    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.splitMode).toBe("equal");
      expect(result.data.paymentMode).toBe("single");
    }
  });

  it("should require title and amount", () => {
    const invalidExpense = {
      ...validBaseExpense,
      title: "",
      amount: "",
    };

    const result = createExpenseSchema.safeParse(invalidExpense);
    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues).toHaveLength(2);
      expect(result.error.issues[0]?.path).toContain("title");
      expect(result.error.issues[1]?.path).toContain("amount");
    }
  });

  it("should validate percentage splits that add up to 100%", () => {
    const expenseWithValidSplits = {
      ...validBaseExpense,
      splitMode: "percentage" as const,
      splits: [
        { userId: "user1", percentage: 60 },
        { userId: "user2", percentage: 40 },
      ],
    };

    const result = createExpenseSchema.safeParse(expenseWithValidSplits);
    expect(result.success).toBe(true);
  });

  it("should reject percentage splits that do not add up to 100%", () => {
    const expenseWithInvalidSplits = {
      ...validBaseExpense,
      splitMode: "percentage" as const,
      splits: [
        { userId: "user1", percentage: 60 },
        { userId: "user2", percentage: 30 }, // Only 90% total
      ],
    };

    const result = createExpenseSchema.safeParse(expenseWithInvalidSplits);
    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("100%");
    }
  });

  it("should validate custom splits that add up to total amount", () => {
    const expenseWithValidCustomSplits = {
      ...validBaseExpense,
      amount: "120.00",
      splitMode: "custom" as const,
      splits: [
        { userId: "user1", amount: "80.00" },
        { userId: "user2", amount: "40.00" },
      ],
    };

    const result = createExpenseSchema.safeParse(expenseWithValidCustomSplits);
    expect(result.success).toBe(true);
  });

  it("should reject custom splits that do not add up to total amount", () => {
    const expenseWithInvalidCustomSplits = {
      ...validBaseExpense,
      amount: "120.00",
      splitMode: "custom" as const,
      splits: [
        { userId: "user1", amount: "80.00" },
        { userId: "user2", amount: "30.00" }, // Only 110 total
      ],
    };

    const result = createExpenseSchema.safeParse(
      expenseWithInvalidCustomSplits,
    );
    expect(result.success).toBe(false);
  });

  it("should validate percentage payments that add up to 100%", () => {
    const expenseWithValidPayments = {
      ...validBaseExpense,
      paymentMode: "percentage" as const,
      payments: [
        { userId: "user1", percentage: 70 },
        { userId: "user2", percentage: 30 },
      ],
    };

    const result = createExpenseSchema.safeParse(expenseWithValidPayments);
    expect(result.success).toBe(true);
  });

  it("should reject percentage payments that do not add up to 100%", () => {
    const expenseWithInvalidPayments = {
      ...validBaseExpense,
      paymentMode: "percentage" as const,
      payments: [
        { userId: "user1", percentage: 70 },
        { userId: "user2", percentage: 20 }, // Only 90% total
      ],
    };

    const result = createExpenseSchema.safeParse(expenseWithInvalidPayments);
    expect(result.success).toBe(false);
  });

  it("should validate custom payments that add up to total amount", () => {
    const expenseWithValidCustomPayments = {
      ...validBaseExpense,
      amount: "150.00",
      paymentMode: "custom" as const,
      payments: [
        { userId: "user1", amount: "100.00" },
        { userId: "user2", amount: "50.00" },
      ],
    };

    const result = createExpenseSchema.safeParse(
      expenseWithValidCustomPayments,
    );
    expect(result.success).toBe(true);
  });

  it("should handle optional fields correctly", () => {
    const expenseWithOptionals = {
      ...validBaseExpense,
      category: "Food",
      description: "Team lunch",
      groupId: 123,
    };

    const result = createExpenseSchema.safeParse(expenseWithOptionals);
    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.category).toBe("Food");
      expect(result.data.description).toBe("Team lunch");
      expect(result.data.groupId).toBe(123);
    }
  });

  it("should apply default values for splitMode and paymentMode", () => {
    const result = createExpenseSchema.safeParse(validBaseExpense);
    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.splitMode).toBe("equal");
      expect(result.data.paymentMode).toBe("single");
      expect(result.data.currency).toBe("USD");
    }
  });

  it("should validate enum values for splitMode and paymentMode", () => {
    const expenseWithInvalidModes = {
      ...validBaseExpense,
      // Intentionally invalid values to test the schema.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
      splitMode: "invalid" as any,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
      paymentMode: "invalid" as any,
    };

    const result = createExpenseSchema.safeParse(expenseWithInvalidModes);
    expect(result.success).toBe(false);

    if (!result.success) {
      const splitModeError = result.error.issues.find((issue) =>
        issue.path.includes("splitMode"),
      );
      const paymentModeError = result.error.issues.find((issue) =>
        issue.path.includes("paymentMode"),
      );

      expect(splitModeError).toBeDefined();
      expect(paymentModeError).toBeDefined();
    }
  });
});

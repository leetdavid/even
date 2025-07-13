import { z } from "zod";
import { desc, eq, and } from "drizzle-orm";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { expenses, expenseSplits, expensePayments } from "@/server/db/schema";

const createExpenseSchema = z.object({
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
}).refine(
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

export const expenseRouter = createTRPCRouter({
  create: publicProcedure
    .input(createExpenseSchema)
    .mutation(async ({ ctx, input }) => {
      const expense = await ctx.db
        .insert(expenses)
        .values({
          title: input.title,
          amount: input.amount,
          currency: input.currency,
          category: input.category,
          description: input.description,
          date: input.date,
          userId: input.userId,
          groupId: input.groupId,
          splitMode: input.splitMode,
          paymentMode: input.paymentMode,
        })
        .returning({ id: expenses.id });

      // Create expense split records if splits are provided
      if (input.splits && input.splits.length > 0) {
        const expenseId = expense[0]!.id;
        const totalAmount = parseFloat(input.amount);

        const splitRecords = input.splits.map((split) => {
          let splitAmount: string;

          if (input.splitMode === "equal") {
            splitAmount = (totalAmount / input.splits!.length).toFixed(2);
          } else if (input.splitMode === "percentage" && split.percentage) {
            splitAmount = ((totalAmount * split.percentage) / 100).toFixed(2);
          } else if (split.amount) {
            splitAmount = split.amount;
          } else {
            splitAmount = "0.00";
          }

          return {
            expenseId,
            userId: split.userId,
            amount: splitAmount,
            percentage: split.percentage?.toString(),
          };
        });

        await ctx.db.insert(expenseSplits).values(splitRecords);
      }

      // Create expense payment records if payments are provided
      if (input.payments && input.payments.length > 0) {
        const expenseId = expense[0]!.id;
        const totalAmount = parseFloat(input.amount);

        const paymentRecords = input.payments.map((payment) => {
          let paymentAmount: string;

          if (input.paymentMode === "single") {
            paymentAmount = input.amount; // Full amount
          } else if (input.paymentMode === "percentage" && payment.percentage) {
            paymentAmount = ((totalAmount * payment.percentage) / 100).toFixed(2);
          } else if (payment.amount) {
            paymentAmount = payment.amount;
          } else {
            paymentAmount = "0.00";
          }

          return {
            expenseId,
            userId: payment.userId,
            amount: paymentAmount,
            percentage: payment.percentage?.toString(),
          };
        });

        await ctx.db.insert(expensePayments).values(paymentRecords);
      }

      return expense[0];
    }),

  getAll: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get expenses created by user
      const createdExpenses = await ctx.db.query.expenses.findMany({
        where: eq(expenses.userId, input.userId),
        orderBy: [desc(expenses.date)],
        with: {
          splits: true,
          payments: true,
        },
      });

      // Get expenses where user is involved in splits
      const sharedExpenses = await ctx.db.query.expenses.findMany({
        orderBy: [desc(expenses.date)],
        with: {
          splits: {
            where: eq(expenseSplits.userId, input.userId),
          },
        },
      });

      // Filter shared expenses to only include those where user has splits
      const userSharedExpenses = sharedExpenses.filter(
        (expense) =>
          expense.splits.length > 0 && expense.userId !== input.userId,
      );

      // Combine and deduplicate
      const allExpenses = [...createdExpenses, ...userSharedExpenses];
      const uniqueExpenses = allExpenses.filter(
        (expense, index, self) =>
          index === self.findIndex((e) => e.id === expense.id),
      );

      return uniqueExpenses.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
    }),

  getGroupExpenses: publicProcedure
    .input(z.object({ groupId: z.number() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.query.expenses.findMany({
        where: eq(expenses.groupId, input.groupId),
        orderBy: [desc(expenses.date)],
        with: {
          splits: true,
          payments: true,
        },
      });
    }),

  getExpenseSplits: publicProcedure
    .input(z.object({ expenseId: z.number() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.query.expenseSplits.findMany({
        where: eq(expenseSplits.expenseId, input.expenseId),
      });
    }),

  markSplitPaid: publicProcedure
    .input(z.object({ expenseId: z.number(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(expenseSplits)
        .set({
          isPaid: true,
          paidAt: new Date(),
        })
        .where(
          and(
            eq(expenseSplits.expenseId, input.expenseId),
            eq(expenseSplits.userId, input.userId),
          ),
        );
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // First delete all expense splits for this expense
      await ctx.db
        .delete(expenseSplits)
        .where(eq(expenseSplits.expenseId, input.id));

      // Then delete the expense
      await ctx.db.delete(expenses).where(eq(expenses.id, input.id));
    }),
});

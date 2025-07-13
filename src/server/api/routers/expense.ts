import { z } from "zod";
import { desc, eq, and } from "drizzle-orm";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { expenses, expenseSplits, expensePayments, expenseHistory, expenseComments } from "@/server/db/schema";

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

      // Create initial history record
      await ctx.db.insert(expenseHistory).values({
        expenseId: expense[0]!.id,
        editedBy: input.userId,
        changeType: "created",
        changes: {
          action: "created",
          expense: {
            title: input.title,
            amount: input.amount,
            currency: input.currency,
            category: input.category,
            description: input.description,
          },
        },
      });

      return expense[0];
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        amount: z.string().min(1).optional(),
        currency: z.string().optional(),
        category: z.string().optional(),
        description: z.string().optional(),
        date: z.string().optional(),
        editReason: z.string().optional(),
        editedBy: z.string(),
        groupId: z.number().optional(),
        splitMode: z.enum(["equal", "percentage", "custom"]).optional(),
        paymentMode: z.enum(["single", "percentage", "custom"]).optional(),
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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get the current expense for history tracking
      const currentExpense = await ctx.db.query.expenses.findFirst({
        where: eq(expenses.id, input.id),
        with: {
          splits: true,
          payments: true,
          history: true,
          comments: true,
        },
      });

      if (!currentExpense) {
        throw new Error("Expense not found");
      }

      const updateData: Record<string, unknown> = {};
      const changes: Record<string, { before: unknown; after: unknown }> = {};

      // Track changes for history
      if (input.title !== undefined && input.title !== currentExpense.title) {
        updateData.title = input.title;
        changes.title = { before: currentExpense.title, after: input.title };
      }
      if (input.amount !== undefined && input.amount !== currentExpense.amount) {
        updateData.amount = input.amount;
        changes.amount = { before: currentExpense.amount, after: input.amount };
      }
      if (input.currency !== undefined && input.currency !== currentExpense.currency) {
        updateData.currency = input.currency;
        changes.currency = { before: currentExpense.currency, after: input.currency };
      }
      if (input.category !== undefined && input.category !== currentExpense.category) {
        updateData.category = input.category;
        changes.category = { before: currentExpense.category, after: input.category };
      }
      if (input.description !== undefined && input.description !== currentExpense.description) {
        updateData.description = input.description;
        changes.description = { before: currentExpense.description, after: input.description };
      }
      if (input.date !== undefined && input.date !== currentExpense.date) {
        updateData.date = input.date;
        changes.date = { before: currentExpense.date, after: input.date };
      }
      if (input.splitMode !== undefined && input.splitMode !== currentExpense.splitMode) {
        updateData.splitMode = input.splitMode;
        changes.splitMode = { before: currentExpense.splitMode, after: input.splitMode };
      }
      if (input.paymentMode !== undefined && input.paymentMode !== currentExpense.paymentMode) {
        updateData.paymentMode = input.paymentMode;
        changes.paymentMode = { before: currentExpense.paymentMode, after: input.paymentMode };
      }

      // Update the expense if there are changes
      if (Object.keys(updateData).length > 0) {
        await ctx.db
          .update(expenses)
          .set(updateData)
          .where(eq(expenses.id, input.id));
      }

      // Update splits if provided
      if (input.splits) {
        // Delete existing splits
        await ctx.db.delete(expenseSplits).where(eq(expenseSplits.expenseId, input.id));
        
        // Create new splits
        if (input.splits.length > 0) {
          const totalAmount = parseFloat(input.amount ?? currentExpense.amount);
          const splitRecords = input.splits.map((split) => {
            let splitAmount: string;

            if ((input.splitMode ?? currentExpense.splitMode) === "equal") {
              splitAmount = (totalAmount / input.splits!.length).toFixed(2);
            } else if ((input.splitMode ?? currentExpense.splitMode) === "percentage" && split.percentage) {
              splitAmount = ((totalAmount * split.percentage) / 100).toFixed(2);
            } else if (split.amount) {
              splitAmount = split.amount;
            } else {
              splitAmount = "0.00";
            }

            return {
              expenseId: input.id,
              userId: split.userId,
              amount: splitAmount,
              percentage: split.percentage?.toString(),
            };
          });

          await ctx.db.insert(expenseSplits).values(splitRecords);
        }
        
        changes.splits = { before: currentExpense.splits, after: input.splits };
      }

      // Update payments if provided
      if (input.payments) {
        // Delete existing payments
        await ctx.db.delete(expensePayments).where(eq(expensePayments.expenseId, input.id));
        
        // Create new payments
        if (input.payments.length > 0) {
          const totalAmount = parseFloat(input.amount ?? currentExpense.amount);
          const paymentRecords = input.payments.map((payment) => {
            let paymentAmount: string;

            if ((input.paymentMode ?? currentExpense.paymentMode) === "single") {
              paymentAmount = input.amount ?? currentExpense.amount;
            } else if ((input.paymentMode ?? currentExpense.paymentMode) === "percentage" && payment.percentage) {
              paymentAmount = ((totalAmount * payment.percentage) / 100).toFixed(2);
            } else if (payment.amount) {
              paymentAmount = payment.amount;
            } else {
              paymentAmount = "0.00";
            }

            return {
              expenseId: input.id,
              userId: payment.userId,
              amount: paymentAmount,
              percentage: payment.percentage?.toString(),
            };
          });

          await ctx.db.insert(expensePayments).values(paymentRecords);
        }
        
        changes.payments = { before: currentExpense.payments, after: input.payments };
      }

      // Create history record if there were changes
      if (Object.keys(changes).length > 0) {
        await ctx.db.insert(expenseHistory).values({
          expenseId: input.id,
          editedBy: input.editedBy,
          changeType: "updated",
          changes,
          editReason: input.editReason,
        });
      }

      return { success: true };
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
          history: true,
          comments: true,
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
          history: true,
          comments: true,
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
      // Create deletion history record first
      await ctx.db.insert(expenseHistory).values({
        expenseId: input.id,
        editedBy: input.userId,
        changeType: "deleted",
        changes: { action: "deleted" },
      });

      // Delete all related records
      await ctx.db.delete(expenseSplits).where(eq(expenseSplits.expenseId, input.id));
      await ctx.db.delete(expensePayments).where(eq(expensePayments.expenseId, input.id));
      await ctx.db.delete(expenseComments).where(eq(expenseComments.expenseId, input.id));
      
      // Finally delete the expense
      await ctx.db.delete(expenses).where(eq(expenses.id, input.id));
    }),

  getHistory: publicProcedure
    .input(z.object({ expenseId: z.number() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.query.expenseHistory.findMany({
        where: eq(expenseHistory.expenseId, input.expenseId),
        orderBy: [desc(expenseHistory.createdAt)],
      });
    }),

  getComments: publicProcedure
    .input(z.object({ expenseId: z.number() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.query.expenseComments.findMany({
        where: eq(expenseComments.expenseId, input.expenseId),
        orderBy: [desc(expenseComments.createdAt)],
      });
    }),

  addComment: publicProcedure
    .input(
      z.object({
        expenseId: z.number(),
        userId: z.string(),
        comment: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db
        .insert(expenseComments)
        .values({
          expenseId: input.expenseId,
          userId: input.userId,
          comment: input.comment,
        })
        .returning();

      return comment[0];
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const expense = await ctx.db.query.expenses.findFirst({
        where: eq(expenses.id, input.id),
        with: {
          splits: true,
          payments: true,
          history: {
            orderBy: [desc(expenseHistory.createdAt)],
          },
          comments: {
            orderBy: [desc(expenseComments.createdAt)],
          },
        },
      });

      if (!expense) {
        throw new Error("Expense not found");
      }

      return expense;
    }),
});

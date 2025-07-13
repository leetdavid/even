import { z } from "zod";
import { desc, eq } from "drizzle-orm";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { expenses } from "@/server/db/schema";

export const expenseRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        title: z.string().min(1),
        amount: z.string().min(1),
        currency: z.string().default("USD"),
        category: z.string().optional(),
        description: z.string().optional(),
        date: z.string(),
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(expenses).values({
        title: input.title,
        amount: input.amount,
        currency: input.currency,
        category: input.category,
        description: input.description,
        date: input.date,
        userId: input.userId,
      });
    }),

  getAll: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userExpenses = await ctx.db.query.expenses.findMany({
        where: eq(expenses.userId, input.userId),
        orderBy: [desc(expenses.date)],
      });

      return userExpenses;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(expenses)
        .where(eq(expenses.id, input.id));
    }),
});
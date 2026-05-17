import { pgTable, serial, text, numeric, integer, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories";

export const expensesTable = pgTable("expenses", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categoriesTable.id),
  notes: text("notes"),
  date: date("date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertExpenseSchema = createInsertSchema(expensesTable).omit({ id: true, createdAt: true });
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expensesTable.$inferSelect;

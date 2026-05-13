import { Router, type IRouter } from "express";
import { eq, and, sql, desc } from "drizzle-orm";
import { db, expensesTable, categoriesTable } from "@workspace/db";
import {
  ListExpensesQueryParams,
  CreateExpenseBody,
  GetExpenseParams,
  UpdateExpenseParams,
  UpdateExpenseBody,
  DeleteExpenseParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const expenseWithCategory = {
  id: expensesTable.id,
  amount: expensesTable.amount,
  description: expensesTable.description,
  categoryId: expensesTable.categoryId,
  categoryName: categoriesTable.name,
  notes: expensesTable.notes,
  date: expensesTable.date,
  createdAt: expensesTable.createdAt,
};

router.get("/expenses", async (req, res): Promise<void> => {
  const params = ListExpensesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const conditions = [];

  if (params.data.category) {
    conditions.push(eq(categoriesTable.name, params.data.category));
  }

  if (params.data.month) {
    conditions.push(
      sql`TO_CHAR(${expensesTable.date}, 'YYYY-MM') = ${params.data.month}`
    );
  }

  const expenses = await db
    .select(expenseWithCategory)
    .from(expensesTable)
    .innerJoin(categoriesTable, eq(expensesTable.categoryId, categoriesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(expensesTable.date), desc(expensesTable.createdAt));

  const mapped = expenses.map((e) => ({
    ...e,
    amount: parseFloat(e.amount as unknown as string),
  }));

  res.json(mapped);
});

router.post("/expenses", async (req, res): Promise<void> => {
  const parsed = CreateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [expense] = await db
    .insert(expensesTable)
    .values({
      amount: String(parsed.data.amount),
      description: parsed.data.description,
      categoryId: parsed.data.categoryId,
      notes: parsed.data.notes ?? null,
      date: parsed.data.date,
    })
    .returning();

  const [result] = await db
    .select(expenseWithCategory)
    .from(expensesTable)
    .innerJoin(categoriesTable, eq(expensesTable.categoryId, categoriesTable.id))
    .where(eq(expensesTable.id, expense.id));

  res.status(201).json({ ...result, amount: parseFloat(result.amount as unknown as string) });
});

router.get("/expenses/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetExpenseParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [expense] = await db
    .select(expenseWithCategory)
    .from(expensesTable)
    .innerJoin(categoriesTable, eq(expensesTable.categoryId, categoriesTable.id))
    .where(eq(expensesTable.id, params.data.id));

  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  res.json({ ...expense, amount: parseFloat(expense.amount as unknown as string) });
});

router.patch("/expenses/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateExpenseParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.amount !== undefined) updateData.amount = String(parsed.data.amount);
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.categoryId !== undefined) updateData.categoryId = parsed.data.categoryId;
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;
  if (parsed.data.date !== undefined) updateData.date = parsed.data.date;

  const [updated] = await db
    .update(expensesTable)
    .set(updateData)
    .where(eq(expensesTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  const [result] = await db
    .select(expenseWithCategory)
    .from(expensesTable)
    .innerJoin(categoriesTable, eq(expensesTable.categoryId, categoriesTable.id))
    .where(eq(expensesTable.id, updated.id));

  res.json({ ...result, amount: parseFloat(result.amount as unknown as string) });
});

router.delete("/expenses/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteExpenseParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(expensesTable)
    .where(eq(expensesTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;

import { Router, type IRouter } from "express";
import { eq, and, sql, desc } from "drizzle-orm";
import { db, expensesTable, categoriesTable, cardsTable } from "@workspace/db";
import {
  ListExpensesQueryParams,
  CreateExpenseBody,
  GetExpenseParams,
  UpdateExpenseParams,
  UpdateExpenseBody,
  DeleteExpenseParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

const expenseWithCategory = {
  id: expensesTable.id,
  amount: expensesTable.amount,
  description: expensesTable.description,
  categoryId: expensesTable.categoryId,
  categoryName: categoriesTable.name,
  cardId: expensesTable.cardId,
  cardName: cardsTable.name,
  cardColor: cardsTable.color,
  cardLastFour: cardsTable.lastFour,
  notes: expensesTable.notes,
  date: expensesTable.date,
  createdAt: expensesTable.createdAt,
};

function parseDateToUTC(date: Date | string): Date {
  if (typeof date === "string") {
    const exactDateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (exactDateMatch) {
      const [, year, month, day] = exactDateMatch;
      return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 0, 0, 0));
    }

    const parsed = new Date(date);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }

    throw new Error(`Invalid date value: ${date}`);
  }
  return date;
}

/**
 * Combine a date-only value (YYYY-MM-DD) with the current server time (UTC)
 * so the stored timestamp reflects the chosen day and the time when insertion occurs.
 */
function combineDateWithInsertionTime(date: Date | string): Date {
  const now = new Date();
  const nowUTC = {
    hours: now.getUTCHours(),
    minutes: now.getUTCMinutes(),
    seconds: now.getUTCSeconds(),
    ms: now.getUTCMilliseconds(),
  };

  if (typeof date === "string") {
    const exactDateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (exactDateMatch) {
      const [, year, month, day] = exactDateMatch;
      return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), nowUTC.hours, nowUTC.minutes, nowUTC.seconds, nowUTC.ms));
    }

    const parsed = new Date(date);
    if (!Number.isNaN(parsed.getTime())) {
      // keep parsed date's date parts, but replace time with current UTC time
      return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), nowUTC.hours, nowUTC.minutes, nowUTC.seconds, nowUTC.ms));
    }

    throw new Error(`Invalid date value: ${date}`);
  }

  // If a Date object came in, use its date parts with current UTC time
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), nowUTC.hours, nowUTC.minutes, nowUTC.seconds, nowUTC.ms));
}

function formatDateForClient(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString();
}

router.get("/expenses", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const params = ListExpensesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const conditions = [eq(expensesTable.userId, userId)];

  if (params.data.category) {
    conditions.push(eq(categoriesTable.name, params.data.category));
  }

  if (params.data.month) {
    conditions.push(
      sql`TO_CHAR(${expensesTable.date}, 'YYYY-MM') = ${params.data.month}`
    );
  }

  // Optionally return the DB-stored date string unmodified (useful for
  // dashboards that expect the original DB format). Pass ?rawDate=true
  // to get the date as text via to_char().
  const rawDate = req.query.rawDate === "true" || req.query.rawDate === "1";

  if (rawDate) {
    const rows = await db.execute(sql`
      SELECT
        e.id,
        e.amount,
        e.description,
        e.category_id AS "categoryId",
        c.name AS "categoryName",
        e.card_id AS "cardId",
        ca.name AS "cardName",
        ca.color AS "cardColor",
        ca.last_four AS "cardLastFour",
        e.notes,
        to_char(e.date, 'YYYY-MM-DD HH24:MI:SS.US') AS date,
        to_char(e.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "createdAt"
      FROM expenses e
      INNER JOIN categories c ON e.category_id = c.id
      LEFT JOIN cards ca ON e.card_id = ca.id
      WHERE e.user_id = ${userId}
      ORDER BY e.date DESC, e.created_at DESC
    `);

    const data = rows.rows as Array<Record<string, any>>;
    const mapped = data.map((r) => ({
      id: r.id,
      amount: parseFloat(r.amount as unknown as string),
      description: r.description,
      categoryId: r.categoryId,
      categoryName: r.categoryName,
      cardId: r.cardId,
      cardName: r.cardName,
      cardColor: r.cardColor,
      cardLastFour: r.cardLastFour,
      notes: r.notes,
      date: r.date, // returned as DB-formatted string
      createdAt: r.createdAt,
    }));

    res.json(mapped);
    return;
  }

  const expenses = await db
    .select(expenseWithCategory)
    .from(expensesTable)
    .innerJoin(categoriesTable, eq(expensesTable.categoryId, categoriesTable.id))
    .leftJoin(cardsTable, eq(expensesTable.cardId, cardsTable.id))
    .where(and(...conditions))
    .orderBy(desc(expensesTable.date), desc(expensesTable.createdAt));

  const mapped = expenses.map((e) => ({
    ...e,
    amount: parseFloat(e.amount as unknown as string),
  }));

  res.json(mapped);
});

router.post("/expenses", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const parsed = CreateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const normalizedDate = combineDateWithInsertionTime(parsed.data.date);

  const [expense] = await db
    .insert(expensesTable)
    .values({
      userId,
      amount: String(parsed.data.amount),
      description: parsed.data.description,
      categoryId: parsed.data.categoryId,
      cardId: parsed.data.cardId ?? null,
      notes: parsed.data.notes ?? null,
      date: normalizedDate,
    })
    .returning();

  const [result] = await db
    .select(expenseWithCategory)
    .from(expensesTable)
    .innerJoin(categoriesTable, eq(expensesTable.categoryId, categoriesTable.id))
    .leftJoin(cardsTable, eq(expensesTable.cardId, cardsTable.id))
    .where(eq(expensesTable.id, expense.id));
  res.status(201).json({
    ...result,
    amount: parseFloat(result.amount as unknown as string),
    date: formatDateForClient(result.date),
  });
});

router.get("/expenses/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
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
    .leftJoin(cardsTable, eq(expensesTable.cardId, cardsTable.id))
    .where(and(eq(expensesTable.id, params.data.id), eq(expensesTable.userId, userId)));

  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  res.json({ ...expense, amount: parseFloat(expense.amount as unknown as string) });
});

router.patch("/expenses/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
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

  console.log("[PATCH /expenses/:id] Request body:", req.body);

  const updateData: Record<string, unknown> = {};
  if (parsed.data.amount !== undefined) updateData.amount = String(parsed.data.amount);
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.categoryId !== undefined) updateData.categoryId = parsed.data.categoryId;
  if ("cardId" in parsed.data) updateData.cardId = parsed.data.cardId ?? null;
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;
  if (parsed.data.date !== undefined) updateData.date = combineDateWithInsertionTime(parsed.data.date);

  const [updated] = await db
    .update(expensesTable)
    .set(updateData)
    .where(and(eq(expensesTable.id, params.data.id), eq(expensesTable.userId, userId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  console.log("[PATCH /expenses/:id] Updated DB row:", updated);

  const [result] = await db
    .select(expenseWithCategory)
    .from(expensesTable)
    .innerJoin(categoriesTable, eq(expensesTable.categoryId, categoriesTable.id))
    .leftJoin(cardsTable, eq(expensesTable.cardId, cardsTable.id))
    .where(eq(expensesTable.id, updated.id));

  res.json({
    ...result,
    amount: parseFloat(result.amount as unknown as string),
    date: formatDateForClient(result.date),
  });
});

router.delete("/expenses/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteExpenseParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(expensesTable)
    .where(and(eq(expensesTable.id, params.data.id), eq(expensesTable.userId, userId)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;

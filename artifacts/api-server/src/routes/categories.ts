import { Router, type IRouter } from "express";
import { or, isNull, eq, and, count } from "drizzle-orm";
import { db, categoriesTable, expensesTable } from "@workspace/db";
import {
  CreateCategoryBody,
  ListCategoriesResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/categories", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const categories = await db
    .select()
    .from(categoriesTable)
    .where(or(isNull(categoriesTable.userId), eq(categoriesTable.userId, userId)))
    .orderBy(categoriesTable.name);
  res.json(ListCategoriesResponse.parse(categories));
});

router.post("/categories", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [category] = await db
    .insert(categoriesTable)
    .values({ ...parsed.data, userId, isDefault: false })
    .returning();

  res.status(201).json(category);
});

router.patch("/categories/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const rawParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawParam, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const existing = await db
      .select({ id: categoriesTable.id, userId: categoriesTable.userId, isDefault: categoriesTable.isDefault })
      .from(categoriesTable)
      .where(eq(categoriesTable.id, id))
      .then((rows: any[]) => rows[0] ?? null);

    if (!existing) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    if (existing.userId !== null && existing.userId !== userId) {
      res.status(403).json({ error: "Not allowed to modify this category" });
      return;
    }

    const bodyRaw = req.body ?? {};
    const updates: Partial<typeof categoriesTable.$inferInsert> = {};
    if (bodyRaw.name !== undefined) {
      if (typeof bodyRaw.name !== "string" || bodyRaw.name.trim().length === 0) {
        res.status(400).json({ error: "Invalid name" });
        return;
      }
      updates.name = bodyRaw.name.trim();
    }
    if (bodyRaw.color !== undefined) {
      if (typeof bodyRaw.color !== "string") {
        res.status(400).json({ error: "Invalid color" });
        return;
      }
      updates.color = bodyRaw.color;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }

    const [updated] = await db
      .update(categoriesTable)
      .set(updates)
      .where(eq(categoriesTable.id, id))
      .returning();

    res.json(updated);
  } catch (err: any) {
    console.error("PATCH /categories/:id error", err);
    res.status(500).json({ error: err?.message ?? String(err) });
  }
});

router.delete("/categories/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  try {
    const existing = await db
      .select({ id: categoriesTable.id, userId: categoriesTable.userId, isDefault: categoriesTable.isDefault })
      .from(categoriesTable)
      .where(eq(categoriesTable.id, id))
      .then((rows: any[]) => rows[0] ?? null);

    if (!existing) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    if (existing.userId !== null && existing.userId !== userId) {
      res.status(403).json({ error: "Not allowed to delete this category" });
      return;
    }

    const [{ linkedCount }] = await db
      .select({ linkedCount: count() })
      .from(expensesTable)
      .where(eq(expensesTable.categoryId, id));

    if (Number(linkedCount) > 0) {
      res.status(409).json({ error: `This category has ${linkedCount} linked expense${linkedCount === 1 ? "" : "s"}. Remove or reassign them before deleting the category.` });
      return;
    }

    const [deleted] = await db
      .delete(categoriesTable)
      .where(eq(categoriesTable.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    res.sendStatus(204);
  } catch (err: any) {
    console.error("DELETE /categories/:id error", err);
    res.status(500).json({ error: err?.message ?? String(err) });
  }
});

export default router;


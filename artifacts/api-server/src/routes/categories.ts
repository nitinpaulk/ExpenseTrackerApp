import { Router, type IRouter } from "express";
import { or, isNull, eq } from "drizzle-orm";
import { db, categoriesTable } from "@workspace/db";
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

export default router;

import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, cardsTable } from "@workspace/db";
import { CreateCardBody, DeleteCardParams, UpdateCardParams, UpdateCardBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/cards", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;

  const cards = await db
    .select()
    .from(cardsTable)
    .where(eq(cardsTable.userId, userId))
    .orderBy(desc(cardsTable.createdAt));

  res.json(cards);
});

router.post("/cards", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const parsed = CreateCardBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [card] = await db
    .insert(cardsTable)
    .values({
      userId,
      name: parsed.data.name,
      lastFour: parsed.data.lastFour ?? null,
      color: parsed.data.color,
    })
    .returning();

  res.status(201).json(card);
});

router.patch("/cards/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateCardParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateCardBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updates: Partial<typeof cardsTable.$inferInsert> = {};
  if (body.data.name !== undefined) updates.name = body.data.name;
  if (body.data.lastFour !== undefined) updates.lastFour = body.data.lastFour ?? null;
  if (body.data.color !== undefined) updates.color = body.data.color;

  const [updated] = await db
    .update(cardsTable)
    .set(updates)
    .where(and(eq(cardsTable.id, params.data.id), eq(cardsTable.userId, userId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Card not found" });
    return;
  }

  res.json(updated);
});

router.delete("/cards/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteCardParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(cardsTable)
    .where(and(eq(cardsTable.id, params.data.id), eq(cardsTable.userId, userId)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Card not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;

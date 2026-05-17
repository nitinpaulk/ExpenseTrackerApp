import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/stats/by-category", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const month = req.query.month as string | undefined;

  const monthFilter = month
    ? sql`AND TO_CHAR(e.date, 'YYYY-MM') = ${month}`
    : sql``;

  const rows = await db.execute(sql`
    SELECT
      c.id AS "categoryId",
      c.name AS "categoryName",
      c.color AS "color",
      COALESCE(SUM(e.amount), 0) AS total,
      COUNT(e.id) AS count
    FROM categories c
    LEFT JOIN expenses e
      ON e.category_id = c.id
      AND e.user_id = ${userId}
      ${monthFilter}
    WHERE (c.user_id IS NULL OR c.user_id = ${userId})
    GROUP BY c.id, c.name, c.color
    ORDER BY total DESC
  `);

  const data = rows.rows as Array<{
    categoryId: number;
    categoryName: string;
    color: string;
    total: string;
    count: string;
  }>;

  const totalAll = data.reduce((sum, r) => sum + parseFloat(r.total), 0);

  const result = data.map((r) => ({
    categoryId: r.categoryId,
    categoryName: r.categoryName,
    color: r.color,
    total: parseFloat(r.total),
    count: parseInt(r.count, 10),
    percentage: totalAll > 0 ? (parseFloat(r.total) / totalAll) * 100 : 0,
  }));

  res.json(result);
});

router.get("/stats/monthly", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;

  const rows = await db.execute(sql`
    SELECT
      TO_CHAR(date, 'YYYY-MM') AS month,
      SUM(amount) AS total,
      COUNT(id) AS count
    FROM expenses
    WHERE user_id = ${userId}
      AND date >= NOW() - INTERVAL '12 months'
    GROUP BY TO_CHAR(date, 'YYYY-MM')
    ORDER BY month ASC
  `);

  const data = rows.rows as Array<{ month: string; total: string; count: string }>;

  const result = data.map((r) => ({
    month: r.month,
    total: parseFloat(r.total),
    count: parseInt(r.count, 10),
  }));

  res.json(result);
});

router.get("/stats/summary", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

  const [allTime] = (await db.execute(sql`
    SELECT COALESCE(SUM(amount), 0) AS total, COUNT(id) AS count
    FROM expenses WHERE user_id = ${userId}
  `)).rows as Array<{ total: string; count: string }>;

  const [thisMonthRow] = (await db.execute(sql`
    SELECT COALESCE(SUM(amount), 0) AS total FROM expenses
    WHERE user_id = ${userId} AND TO_CHAR(date, 'YYYY-MM') = ${thisMonth}
  `)).rows as Array<{ total: string }>;

  const [lastMonthRow] = (await db.execute(sql`
    SELECT COALESCE(SUM(amount), 0) AS total FROM expenses
    WHERE user_id = ${userId} AND TO_CHAR(date, 'YYYY-MM') = ${lastMonth}
  `)).rows as Array<{ total: string }>;

  const [topCategoryRow] = (await db.execute(sql`
    SELECT c.name FROM expenses e
    JOIN categories c ON c.id = e.category_id
    WHERE e.user_id = ${userId}
    GROUP BY c.name
    ORDER BY SUM(e.amount) DESC
    LIMIT 1
  `)).rows as Array<{ name: string }>;

  const [avgRow] = (await db.execute(sql`
    SELECT COALESCE(AVG(daily_total), 0) AS avg_per_day FROM (
      SELECT SUM(amount) AS daily_total FROM expenses
      WHERE user_id = ${userId}
      GROUP BY date
    ) AS daily
  `)).rows as Array<{ avg_per_day: string }>;

  res.json({
    totalAllTime: parseFloat(allTime?.total ?? "0"),
    totalThisMonth: parseFloat(thisMonthRow?.total ?? "0"),
    totalLastMonth: parseFloat(lastMonthRow?.total ?? "0"),
    expenseCount: parseInt(allTime?.count ?? "0", 10),
    topCategory: topCategoryRow?.name ?? null,
    averagePerDay: parseFloat(avgRow?.avg_per_day ?? "0"),
  });
});

router.get("/stats/by-card", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const month = req.query.month as string | undefined;

  const monthFilter = month
    ? sql`AND TO_CHAR(e.date, 'YYYY-MM') = ${month}`
    : sql``;

  const rows = await db.execute(sql`
    SELECT
      ca.id AS "cardId",
      ca.name AS "cardName",
      ca.color AS "color",
      ca.last_four AS "lastFour",
      COALESCE(SUM(e.amount), 0) AS total,
      COUNT(e.id) AS count
    FROM cards ca
    LEFT JOIN expenses e
      ON e.card_id = ca.id
      AND e.user_id = ${userId}
      ${monthFilter}
    WHERE ca.user_id = ${userId}
    GROUP BY ca.id, ca.name, ca.color, ca.last_four
    UNION ALL
    SELECT
      NULL AS "cardId",
      'No Card' AS "cardName",
      '#94a3b8' AS "color",
      NULL AS "lastFour",
      COALESCE(SUM(e.amount), 0) AS total,
      COUNT(e.id) AS count
    FROM expenses e
    WHERE e.user_id = ${userId}
      AND e.card_id IS NULL
      ${monthFilter}
    ORDER BY total DESC
  `);

  const data = rows.rows as Array<{
    cardId: number | null;
    cardName: string;
    color: string;
    lastFour: string | null;
    total: string;
    count: string;
  }>;

  const totalAll = data.reduce((sum, r) => sum + parseFloat(r.total), 0);

  const result = data
    .filter((r) => parseFloat(r.total) > 0 || r.cardId !== null)
    .map((r) => ({
      cardId: r.cardId,
      cardName: r.cardName,
      color: r.color,
      lastFour: r.lastFour,
      total: parseFloat(r.total),
      count: parseInt(r.count, 10),
      percentage: totalAll > 0 ? (parseFloat(r.total) / totalAll) * 100 : 0,
    }));

  res.json(result);
});

export default router;

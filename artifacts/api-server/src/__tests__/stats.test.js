import test from "node:test";
import assert from "node:assert/strict";
import { calculateAverageDailyThisMonth } from "../lib/expense-summary.js";

test("returns 0 when no spending has occurred this month", () => {
  assert.strictEqual(calculateAverageDailyThisMonth(0, new Date("2026-06-04")), 0);
});

test("calculates the average as total spent divided by current day of month", () => {
  const total = 120;
  const today = new Date("2026-06-04");

  assert.strictEqual(calculateAverageDailyThisMonth(total, today), 30);
});

test("uses the current day of month as the divisor", () => {
  const total = 45;
  const today = new Date("2026-06-15");

  assert.strictEqual(calculateAverageDailyThisMonth(total, today), 3);
});

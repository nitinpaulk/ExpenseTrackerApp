# Expense Tracker

A personal expense tracker with per-user expense and category management, credit card tracking, charts, and full CRUD. Built with React + Vite on the frontend and Express + Drizzle ORM on the backend.

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, Recharts, Wouter (routing)
- **Backend:** Node.js 24, Express 5, Drizzle ORM
- **Database:** PostgreSQL
- **Auth:** Clerk
- **Monorepo:** pnpm workspaces

---

## Prerequisites

- [Node.js 24+](https://nodejs.org/)
- [pnpm 9+](https://pnpm.io/installation) — `npm install -g pnpm`
- [PostgreSQL](https://www.postgresql.org/download/) running locally (or a hosted instance)
- A [Clerk](https://clerk.com) account (free tier works)

---

## 1. Clone the repo

```bash
git clone https://github.com/nitinpaulk/ExpenseTrackerApp.git
cd ExpenseTrackerApp
```

## 2. Install dependencies

```bash
pnpm install
```

## 3. Set up Clerk

1. Go to [dashboard.clerk.com](https://dashboard.clerk.com) and create a new application.
2. From the **API Keys** page, copy:
   - **Publishable key** (starts with `pk_`)
   - **Secret key** (starts with `sk_`)

## 4. Configure environment variables

Create two `.env` files:

### `artifacts/api-server/.env`

```env
DATABASE_URL=postgresql://user:password@localhost:5432/expense_tracker
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
PORT=8080
```

### `artifacts/expense-tracker/.env`

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

> Replace the Clerk keys with the ones from your Clerk dashboard, and update `DATABASE_URL` with your PostgreSQL connection string.

## 5. Set up the database

Create the database in PostgreSQL:

```bash
psql -U postgres -c "CREATE DATABASE expense_tracker;"
```

Then push the schema:

```bash
pnpm --filter @workspace/db run push
```

## 6. Run the app

You need two terminals — one for the API server and one for the frontend.

**Terminal 1 — API server:**

```bash
pnpm --filter @workspace/api-server run dev
```

The API will be available at `http://localhost:8080`.

**Terminal 2 — Frontend:**

```bash
pnpm --filter @workspace/expense-tracker run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

---

## Project Structure

```
.
├── artifacts/
│   ├── api-server/          # Express API server
│   └── expense-tracker/     # React + Vite frontend
├── lib/
│   ├── api-client-react/    # Generated React Query hooks (Orval)
│   ├── api-spec/            # OpenAPI spec (source of truth for API contract)
│   ├── api-zod/             # Generated Zod schemas (Orval)
│   └── db/                  # Drizzle ORM schema + database client
└── scripts/                 # Utility scripts
```

## Useful Commands

| Command | Description |
|---|---|
| `pnpm run typecheck` | Full typecheck across all packages |
| `pnpm run build` | Build all packages |
| `pnpm --filter @workspace/db run push` | Push DB schema changes |
| `pnpm --filter @workspace/api-spec run codegen` | Regenerate API hooks and Zod schemas from OpenAPI spec |

---

## Features

- Sign up / sign in via Clerk (email, Google, GitHub, etc.)
- Add, edit, and bulk-delete expenses
- Organize expenses by category (full CRUD)
- Track spending across credit/debit cards (add, edit, delete cards)
- Dashboard with monthly trend charts and category breakdowns
- Cards page with per-card spending stats

# Pera — Smart Expense & Budget Tracker

Pera is a responsive personal-finance dashboard built with TypeScript, Next.js-compatible App Router APIs, Prisma, Supabase, and Recharts.

## Included

- Income, expense, savings, and balance tracking
- Interactive cash-flow and category reports
- Category budgets with editable monthly limits
- Recurring expense scheduling and pause/resume controls
- Smart-rule insights plus an optional AI provider endpoint
- Responsive desktop sidebar and mobile bottom navigation
- Supabase Auth helpers and authenticated Prisma transaction APIs

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and add your Supabase credentials.
3. Run `npm run db:generate`.
4. Apply the schema to Supabase with `npm run db:migrate`.
5. Start the app with `npm run dev`.

Without environment variables, the interface runs in polished demo mode. With Supabase configured, the API routes use the signed-in user and Prisma&apos;s PostgreSQL driver adapter.

## Useful scripts

- `npm run dev` — local development server
- `npm run build` — production build
- `npm run lint` — code-quality checks
- `npm run db:generate` — regenerate Prisma Client
- `npm run db:migrate` — create and apply database migrations
- `npm run db:studio` — inspect data with Prisma Studio

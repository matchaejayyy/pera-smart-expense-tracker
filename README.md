# Pera — Smart Expense & Budget Tracker

Pera is a responsive personal-finance dashboard built with Next.js, TypeScript, Prisma, Supabase, and Recharts.

## Included

- Income, expense, savings, and balance tracking
- Interactive cash-flow and category reports
- Automatic monthly budget based on recorded income
- Recurring expense scheduling and pause/resume controls
- Smart spending tips plus an optional external provider endpoint
- Responsive desktop sidebar and mobile bottom navigation
- Supabase Auth helpers and authenticated Prisma transaction APIs

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and add your Supabase credentials.
3. Run `npm run db:generate`.
4. Apply the schema to Supabase with `npm run db:migrate`.
5. Start the app with `npm run dev`.

Financial records never fall back to sample or browser-stored data. `DATABASE_URL` and `DIRECT_URL` must point to the Supabase Postgres database; the API routes then scope every query and mutation to the signed-in user.

## Security

- Protected pages and APIs require a verified Supabase JWT. Signed-out visitors are redirected to the login page, while signed-in visitors who open the homepage or login page go directly to their dashboard.
- Prisma stores financial records only. Passwords are handled and hashed by Supabase Auth and are never written to the Prisma schema or application tables.
- Every financial query and mutation is scoped to the authenticated user ID, with owner-only Row Level Security policies as an additional database boundary.

## Supabase sign-in setup

- Email and password sign-in uses Supabase Auth directly.
- To use the Google button, enable Google under Supabase Auth providers and add the Google client ID and secret there.
- Add `http://localhost:3000/auth/callback` and `http://localhost:3000/auth/confirm` to the Supabase redirect allow list for local use. Add both matching URLs for your own domain when you publish it.
- Configure custom SMTP under Supabase Authentication before allowing public email signups. Supabase&apos;s built-in sender only delivers to project-team email addresses and is heavily rate-limited.

## Useful scripts

- `npm run dev` — local development server
- `npm run build` — production build
- `npm run lint` — code-quality checks
- `npm run db:generate` — regenerate Prisma Client
- `npm run db:migrate` — create and apply database migrations
- `npm run db:studio` — inspect data with Prisma Studio

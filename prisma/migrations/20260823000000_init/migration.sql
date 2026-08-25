CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE', 'SAVINGS', 'TRANSFER');
CREATE TYPE "AccountType" AS ENUM ('CASH', 'CHECKING', 'SAVINGS', 'CREDIT_CARD', 'E_WALLET');
CREATE TYPE "RecurringFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "displayName" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Manila',
    "monthlySavingsTarget" DECIMAL(14,2) NOT NULL DEFAULT 20000,
    "budgetAlerts" BOOLEAN NOT NULL DEFAULT true,
    "smartRule" BOOLEAN NOT NULL DEFAULT false,
    "transportReminder" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "openingBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#B5F300',
    "icon" TEXT,
    "transactionType" "TransactionType" NOT NULL DEFAULT 'EXPENSE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "categoryId" UUID,
    "type" "TransactionType" NOT NULL,
    "merchant" TEXT NOT NULL,
    "note" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "bookedAt" TIMESTAMP(3) NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "budgets" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "month" DATE NOT NULL,
    "limit" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "recurring_expenses" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "categoryId" UUID,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "frequency" "RecurringFrequency" NOT NULL DEFAULT 'MONTHLY',
    "nextDueAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "recurring_expenses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "savings_goals" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "targetAmount" DECIMAL(14,2) NOT NULL,
    "currentAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "targetDate" TIMESTAMP(3),
    "color" TEXT NOT NULL DEFAULT '#B5F300',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "savings_goals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "insights" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "actionLabel" TEXT,
    "actionData" JSONB,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dismissedAt" TIMESTAMP(3),
    CONSTRAINT "insights_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "accounts_ownerId_isArchived_idx" ON "accounts"("ownerId", "isArchived");
CREATE INDEX "categories_ownerId_idx" ON "categories"("ownerId");
CREATE UNIQUE INDEX "categories_ownerId_slug_key" ON "categories"("ownerId", "slug");
CREATE INDEX "transactions_ownerId_bookedAt_idx" ON "transactions"("ownerId", "bookedAt" DESC);
CREATE INDEX "transactions_accountId_idx" ON "transactions"("accountId");
CREATE INDEX "transactions_categoryId_idx" ON "transactions"("categoryId");
CREATE INDEX "budgets_ownerId_month_idx" ON "budgets"("ownerId", "month");
CREATE UNIQUE INDEX "budgets_ownerId_categoryId_month_key" ON "budgets"("ownerId", "categoryId", "month");
CREATE INDEX "recurring_expenses_ownerId_nextDueAt_idx" ON "recurring_expenses"("ownerId", "nextDueAt");
CREATE INDEX "savings_goals_ownerId_idx" ON "savings_goals"("ownerId");
CREATE INDEX "insights_ownerId_generatedAt_idx" ON "insights"("ownerId", "generatedAt" DESC);

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "budgets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recurring_expenses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "savings_goals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "insights" ENABLE ROW LEVEL SECURITY;

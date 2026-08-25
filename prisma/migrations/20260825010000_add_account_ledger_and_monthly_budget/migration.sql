CREATE TYPE "BalanceAdjustmentType" AS ENUM ('ADD', 'SUBTRACT');

ALTER TABLE public."transactions"
ADD COLUMN "countsTowardBudget" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE public."monthly_budgets" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "month" DATE NOT NULL,
    "limit" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "monthly_budgets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."account_adjustments" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "direction" "BalanceAdjustmentType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "note" TEXT,
    "adjustedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "account_adjustments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."account_transfers" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "fromAccountId" UUID NOT NULL,
    "toAccountId" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "note" TEXT,
    "transferredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "account_transfers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "account_transfers_different_accounts" CHECK ("fromAccountId" <> "toAccountId")
);

CREATE UNIQUE INDEX "monthly_budgets_ownerId_month_key" ON public."monthly_budgets"("ownerId", "month");
CREATE INDEX "monthly_budgets_ownerId_month_idx" ON public."monthly_budgets"("ownerId", "month");
CREATE INDEX "account_adjustments_ownerId_adjustedAt_idx" ON public."account_adjustments"("ownerId", "adjustedAt" DESC);
CREATE INDEX "account_adjustments_accountId_idx" ON public."account_adjustments"("accountId");
CREATE INDEX "account_transfers_ownerId_transferredAt_idx" ON public."account_transfers"("ownerId", "transferredAt" DESC);
CREATE INDEX "account_transfers_fromAccountId_idx" ON public."account_transfers"("fromAccountId");
CREATE INDEX "account_transfers_toAccountId_idx" ON public."account_transfers"("toAccountId");

ALTER TABLE public."account_adjustments"
ADD CONSTRAINT "account_adjustments_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES public."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE public."account_transfers"
ADD CONSTRAINT "account_transfers_fromAccountId_fkey"
FOREIGN KEY ("fromAccountId") REFERENCES public."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE public."account_transfers"
ADD CONSTRAINT "account_transfers_toAccountId_fkey"
FOREIGN KEY ("toAccountId") REFERENCES public."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

REVOKE ALL ON TABLE public."monthly_budgets" FROM anon;
REVOKE ALL ON TABLE public."account_adjustments" FROM anon;
REVOKE ALL ON TABLE public."account_transfers" FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."monthly_budgets" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."account_adjustments" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."account_transfers" TO authenticated;

ALTER TABLE public."monthly_budgets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."account_adjustments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."account_transfers" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own monthly budgets"
ON public."monthly_budgets"
FOR ALL
TO authenticated
USING ((SELECT auth.uid()) = "ownerId")
WITH CHECK ((SELECT auth.uid()) = "ownerId");

CREATE POLICY "Users manage their own account adjustments"
ON public."account_adjustments"
FOR ALL
TO authenticated
USING ((SELECT auth.uid()) = "ownerId")
WITH CHECK (
  (SELECT auth.uid()) = "ownerId"
  AND EXISTS (
    SELECT 1 FROM public."accounts"
    WHERE "accounts"."id" = "account_adjustments"."accountId"
      AND "accounts"."ownerId" = (SELECT auth.uid())
  )
);

CREATE POLICY "Users manage their own account transfers"
ON public."account_transfers"
FOR ALL
TO authenticated
USING ((SELECT auth.uid()) = "ownerId")
WITH CHECK (
  (SELECT auth.uid()) = "ownerId"
  AND EXISTS (
    SELECT 1 FROM public."accounts"
    WHERE "accounts"."id" = "account_transfers"."fromAccountId"
      AND "accounts"."ownerId" = (SELECT auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM public."accounts"
    WHERE "accounts"."id" = "account_transfers"."toAccountId"
      AND "accounts"."ownerId" = (SELECT auth.uid())
  )
);

-- Keep future tables private from anonymous Data API clients by default.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon;

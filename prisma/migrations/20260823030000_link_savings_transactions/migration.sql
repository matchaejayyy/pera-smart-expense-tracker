ALTER TABLE public."transactions"
ADD COLUMN "savingsGoalId" UUID;

CREATE INDEX "transactions_savingsGoalId_idx"
ON public."transactions"("savingsGoalId");

ALTER TABLE public."transactions"
ADD CONSTRAINT "transactions_savingsGoalId_fkey"
FOREIGN KEY ("savingsGoalId")
REFERENCES public."savings_goals"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Savings destinations are private records. A transaction may only reference
-- a savings goal owned by the same authenticated user.
DROP POLICY IF EXISTS "Users manage their own transactions" ON public."transactions";
CREATE POLICY "Users manage their own transactions"
ON public."transactions"
FOR ALL
TO authenticated
USING ((SELECT auth.uid()) = "ownerId")
WITH CHECK (
  (SELECT auth.uid()) = "ownerId"
  AND EXISTS (
    SELECT 1 FROM public."accounts"
    WHERE "accounts"."id" = "transactions"."accountId"
      AND "accounts"."ownerId" = (SELECT auth.uid())
  )
  AND (
    "categoryId" IS NULL
    OR EXISTS (
      SELECT 1 FROM public."categories"
      WHERE "categories"."id" = "transactions"."categoryId"
        AND "categories"."ownerId" = (SELECT auth.uid())
    )
  )
  AND (
    "savingsGoalId" IS NULL
    OR EXISTS (
      SELECT 1 FROM public."savings_goals"
      WHERE "savings_goals"."id" = "transactions"."savingsGoalId"
        AND "savings_goals"."ownerId" = (SELECT auth.uid())
    )
  )
);

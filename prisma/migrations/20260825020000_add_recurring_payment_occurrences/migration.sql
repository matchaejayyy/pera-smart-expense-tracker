CREATE TYPE "RecurringOccurrenceStatus" AS ENUM ('PAID', 'SKIPPED');

ALTER TABLE public."recurring_expenses"
ADD COLUMN "scheduleDay" INTEGER;

UPDATE public."recurring_expenses"
SET "scheduleDay" = EXTRACT(DAY FROM "nextDueAt")::INTEGER;

ALTER TABLE public."recurring_expenses"
ALTER COLUMN "scheduleDay" SET NOT NULL;

ALTER TABLE public."recurring_expenses"
ADD CONSTRAINT "recurring_expenses_schedule_day_check" CHECK ("scheduleDay" BETWEEN 1 AND 31);

CREATE TABLE public."recurring_occurrences" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "recurringExpenseId" UUID NOT NULL,
    "accountId" UUID,
    "transactionId" UUID,
    "scheduledFor" DATE NOT NULL,
    "status" "RecurringOccurrenceStatus" NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "recurring_occurrences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "recurring_occurrences_transactionId_key" ON public."recurring_occurrences"("transactionId");
CREATE UNIQUE INDEX "recurring_occurrences_recurringExpenseId_scheduledFor_key" ON public."recurring_occurrences"("recurringExpenseId", "scheduledFor");
CREATE INDEX "recurring_occurrences_ownerId_scheduledFor_idx" ON public."recurring_occurrences"("ownerId", "scheduledFor");
CREATE INDEX "recurring_occurrences_accountId_idx" ON public."recurring_occurrences"("accountId");

ALTER TABLE public."recurring_occurrences"
ADD CONSTRAINT "recurring_occurrences_recurringExpenseId_fkey"
FOREIGN KEY ("recurringExpenseId") REFERENCES public."recurring_expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public."recurring_occurrences"
ADD CONSTRAINT "recurring_occurrences_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES public."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE public."recurring_occurrences"
ADD CONSTRAINT "recurring_occurrences_transactionId_fkey"
FOREIGN KEY ("transactionId") REFERENCES public."transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

REVOKE ALL ON TABLE public."recurring_occurrences" FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."recurring_occurrences" TO authenticated;

ALTER TABLE public."recurring_occurrences" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own recurring occurrences"
ON public."recurring_occurrences"
FOR ALL
TO authenticated
USING ((SELECT auth.uid()) = "ownerId")
WITH CHECK (
  (SELECT auth.uid()) = "ownerId"
  AND EXISTS (
    SELECT 1 FROM public."recurring_expenses"
    WHERE "recurring_expenses"."id" = "recurring_occurrences"."recurringExpenseId"
      AND "recurring_expenses"."ownerId" = (SELECT auth.uid())
  )
  AND (
    "accountId" IS NULL OR EXISTS (
      SELECT 1 FROM public."accounts"
      WHERE "accounts"."id" = "recurring_occurrences"."accountId"
        AND "accounts"."ownerId" = (SELECT auth.uid())
    )
  )
  AND (
    "transactionId" IS NULL OR EXISTS (
      SELECT 1 FROM public."transactions"
      WHERE "transactions"."id" = "recurring_occurrences"."transactionId"
        AND "transactions"."ownerId" = (SELECT auth.uid())
    )
  )
);

-- Public tables are private by default. Signed-out Data API callers receive no access.
REVOKE ALL ON TABLE public."profiles" FROM anon;
REVOKE ALL ON TABLE public."accounts" FROM anon;
REVOKE ALL ON TABLE public."categories" FROM anon;
REVOKE ALL ON TABLE public."transactions" FROM anon;
REVOKE ALL ON TABLE public."budgets" FROM anon;
REVOKE ALL ON TABLE public."recurring_expenses" FROM anon;
REVOKE ALL ON TABLE public."savings_goals" FROM anon;
REVOKE ALL ON TABLE public."insights" FROM anon;

-- Authenticated Data API callers can use CRUD operations, subject to the RLS rules below.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."profiles" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."accounts" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."categories" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."transactions" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."budgets" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."recurring_expenses" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."savings_goals" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."insights" TO authenticated;

DROP POLICY IF EXISTS "Users manage their own profile" ON public."profiles";
CREATE POLICY "Users manage their own profile"
ON public."profiles"
FOR ALL
TO authenticated
USING ((SELECT auth.uid()) = "id")
WITH CHECK ((SELECT auth.uid()) = "id");

DROP POLICY IF EXISTS "Users manage their own accounts" ON public."accounts";
CREATE POLICY "Users manage their own accounts"
ON public."accounts"
FOR ALL
TO authenticated
USING ((SELECT auth.uid()) = "ownerId")
WITH CHECK ((SELECT auth.uid()) = "ownerId");

DROP POLICY IF EXISTS "Users manage their own categories" ON public."categories";
CREATE POLICY "Users manage their own categories"
ON public."categories"
FOR ALL
TO authenticated
USING ((SELECT auth.uid()) = "ownerId")
WITH CHECK ((SELECT auth.uid()) = "ownerId");

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
);

DROP POLICY IF EXISTS "Users manage their own budgets" ON public."budgets";
CREATE POLICY "Users manage their own budgets"
ON public."budgets"
FOR ALL
TO authenticated
USING ((SELECT auth.uid()) = "ownerId")
WITH CHECK (
  (SELECT auth.uid()) = "ownerId"
  AND EXISTS (
    SELECT 1 FROM public."categories"
    WHERE "categories"."id" = "budgets"."categoryId"
      AND "categories"."ownerId" = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Users manage their own recurring expenses" ON public."recurring_expenses";
CREATE POLICY "Users manage their own recurring expenses"
ON public."recurring_expenses"
FOR ALL
TO authenticated
USING ((SELECT auth.uid()) = "ownerId")
WITH CHECK (
  (SELECT auth.uid()) = "ownerId"
  AND EXISTS (
    SELECT 1 FROM public."accounts"
    WHERE "accounts"."id" = "recurring_expenses"."accountId"
      AND "accounts"."ownerId" = (SELECT auth.uid())
  )
  AND (
    "categoryId" IS NULL
    OR EXISTS (
      SELECT 1 FROM public."categories"
      WHERE "categories"."id" = "recurring_expenses"."categoryId"
        AND "categories"."ownerId" = (SELECT auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Users manage their own savings goals" ON public."savings_goals";
CREATE POLICY "Users manage their own savings goals"
ON public."savings_goals"
FOR ALL
TO authenticated
USING ((SELECT auth.uid()) = "ownerId")
WITH CHECK ((SELECT auth.uid()) = "ownerId");

DROP POLICY IF EXISTS "Users manage their own insights" ON public."insights";
CREATE POLICY "Users manage their own insights"
ON public."insights"
FOR ALL
TO authenticated
USING ((SELECT auth.uid()) = "ownerId")
WITH CHECK ((SELECT auth.uid()) = "ownerId");

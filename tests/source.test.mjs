import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps the Pera product, CRUD flows, account controls, RLS, and standard Next.js scripts", async () => {
  const [dashboard, landing, login, callback, confirmation, protectedPage, profilePage, profileClient, transactionApi, recurringApi, budgetApi, categoryApi, savingsApi, smartTipsApi, accountApi, accountsApi, accountActionsApi, monthlyBudgetApi, authProxy, prismaSchema, rlsMigration, savingsMigration, optionalSavingsTargetMigration, accountLedgerMigration, migrationHistorySecurity, packageJson] = await Promise.all([
    readFile(new URL("../app/dashboard/dashboard-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/login/login-form.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/auth/callback/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/auth/confirm/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/profile/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/profile/profile-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/transactions/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/recurring/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/budgets/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/categories/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/savings/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/smart-tips/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/account/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/accounts/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/account-actions/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/monthly-budget/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/supabase/proxy.ts", import.meta.url), "utf8"),
    readFile(new URL("../prisma/schema.prisma", import.meta.url), "utf8"),
    readFile(new URL("../prisma/migrations/20260823010000_add_owner_rls_policies/migration.sql", import.meta.url), "utf8"),
    readFile(new URL("../prisma/migrations/20260823030000_link_savings_transactions/migration.sql", import.meta.url), "utf8"),
    readFile(new URL("../prisma/migrations/20260823040000_optional_savings_target/migration.sql", import.meta.url), "utf8"),
    readFile(new URL("../prisma/migrations/20260825010000_add_account_ledger_and_monthly_budget/migration.sql", import.meta.url), "utf8"),
    readFile(new URL("../prisma/migrations/20260823020000_secure_prisma_migration_history/migration.sql", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(dashboard, /Smart money|Pera smart tip/);
  assert.match(dashboard, /Add recurring expense/);
  assert.match(dashboard, /Search transactions/);
  assert.match(dashboard, /Plan savings transfer/);
  assert.match(dashboard, /Edit transaction/);
  assert.match(dashboard, /useState<number \| null>\(null\)/);
  assert.match(dashboard, /Set by you/);
  assert.match(dashboard, /\/api\/monthly-budget/);
  assert.doesNotMatch(dashboard, /const monthlyBudget = totals\.income|Automatic from income/);
  assert.match(dashboard, /const exactCurrency = \(value: number\)/);
  assert.match(dashboard, /<span>Income<\/span>[\s\S]*?exactCurrency\(totals\.income\)/);
  assert.match(dashboard, /<span>Spent<\/span>[\s\S]*?exactCurrency\(totals\.expenses\)/);
  assert.match(dashboard, /<span>Saved<\/span>[\s\S]*?exactCurrency\(totals\.savings\)/);
  assert.match(dashboard, /Spent \{exactCurrency\(totalSpent\)\}/);
  assert.match(dashboard, /Available \{exactCurrency\(Math\.max\(0, \(monthlyBudget \?\? 0\) - totalSpent\)\)\}/);
  assert.doesNotMatch(dashboard, /activePage === "Budgets"|changePage\("Budgets"\)|loadApiResource<BudgetRecord/);
  assert.match(dashboard, /activePage === "Accounts"/);
  assert.match(dashboard, /Pay from/);
  assert.match(dashboard, /Count toward monthly budget/);
  assert.match(dashboard, /changePage\("Reports"\)/);
  assert.doesNotMatch(dashboard, /label: "Reports", icon:/);
  assert.doesNotMatch(dashboard, /8\.2%|TrendingUp|className="trend up"/);
  assert.match(dashboard, /Confirm deletion/);
  assert.match(dashboard, /const saveLock = useRef\(false\)/);
  assert.match(dashboard, /await runSave\("transaction"/);
  assert.match(dashboard, /disabled=\{savingAction !== null\}/);
  assert.match(dashboard, /Saving\.\.\./);
  assert.match(dashboard, /Manage categories/);
  assert.match(dashboard, /select name="categoryId"/);
  assert.ok((dashboard.match(/select name="categoryId"/g) ?? []).length >= 2);
  assert.match(dashboard, /snapshot-actions/);
  assert.doesNotMatch(dashboard, /field-action/);
  assert.match(dashboard, /Create savings goal/);
  assert.match(dashboard, /Target amount <small>Optional<\/small>/);
  assert.match(dashboard, /targetAmount: targetAmountValue \? Number\(targetAmountValue\) : null/);
  assert.match(dashboard, /transactionDraftType === "SAVINGS"/);
  assert.match(dashboard, /name="savingsGoalId"/);
  assert.match(dashboard, /const daysUntilDate/);
  assert.match(dashboard, /\[10, 1, 0\]\.includes\(daysUntilDue\)/);
  assert.match(dashboard, /is due \$\{timing\}/);
  assert.match(dashboard, /const readApiPayload/);
  assert.match(dashboard, /response\.text\(\)/);
  assert.match(dashboard, /loadApiResource<TransactionRecord\[\]>/);
  assert.doesNotMatch(dashboard, /responses\.map\(\(response\) => response\.json\(\)\)/);
  assert.match(dashboard, /reportRangeOptions: ReportRange\[\] = \[1, 3, 6, 9, 12\]/);
  assert.match(dashboard, /const \[overviewRange, setOverviewRange\] = useState<ReportRange>\(1\)/);
  assert.match(dashboard, /overviewRange === 1[\s\S]*?currentMonthCashFlowData/);
  assert.match(dashboard, /aria-label="Overview cash flow period"/);
  assert.match(dashboard, /months === 1 \? "This month"/);
  assert.match(dashboard, /data=\{overviewCashFlowData\}/);
  assert.match(dashboard, /cashFlowData\.slice\(-reportRange\)/);
  assert.match(landing, /Spend with purpose\. Save with <span>ease<\/span>\./);
  assert.match(landing, /Track every penny/);
  assert.doesNotMatch(landing, /Make every peso feel|Track every peso/);
  assert.match(landing, /getClaims/);
  assert.match(landing, /redirect\("\/dashboard"\)/);
  assert.match(login, /signInWithOAuth/);
  assert.match(login, /provider: "google"/);
  assert.match(login, /google-logo\.svg/);
  assert.match(login, /auth\.resend/);
  assert.match(callback, /exchangeCodeForSession/);
  assert.match(confirmation, /verifyOtp/);
  assert.doesNotMatch(dashboard, /localStorage|initialTransactions|historicalCashFlow|Saved on this device/);
  assert.match(dashboard, /router\.push\("\/profile"\)/);
  assert.doesNotMatch(dashboard, /auth\/signout|signout-button|LogOut/);
  assert.match(profileClient, /<form action="\/auth\/signout" method="post">/);
  assert.match(profileClient, /className="profile-signout"/);
  assert.match(protectedPage, /redirect\("\/login/);
  assert.match(profilePage, /redirect\("\/login/);
  assert.match(profilePage, /prisma\.savingsGoal\.count/);
  assert.match(profileClient, /auth\.updateUser/);
  assert.match(profileClient, /resetPasswordForEmail/);
  assert.match(profileClient, /confirmation: "DELETE"/);
  assert.match(profileClient, /const profileSaveLock = useRef\(false\)/);
  assert.match(profileClient, /await runLockedAction\(profileSaveLock/);
  assert.match(profileClient, /stats\.savings/);
  assert.match(accountApi, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(accountApi, /auth\.admin\.deleteUser/);
  assert.match(accountApi, /ownerId: user\.id/);
  assert.match(accountsApi, /export async function POST/);
  assert.match(accountsApi, /export async function PATCH/);
  assert.match(accountsApi, /isArchived: true/);
  assert.match(accountActionsApi, /"ADJUSTMENT" \| "TRANSFER"/);
  assert.match(accountActionsApi, /fromAccountId: body\.fromAccountId/);
  assert.match(monthlyBudgetApi, /monthlyBudget\.upsert/);
  assert.match(transactionApi, /countsTowardBudget/);
  assert.match(transactionApi, /accountId: account\.id/);
  assert.match(recurringApi, /id: body\.accountId/);
  assert.match(authProxy, /getClaims/);
  assert.match(authProxy, /claims\?\.sub/);
  assert.match(authProxy, /isProtectedPage/);
  assert.match(authProxy, /isProtectedApi/);
  assert.match(smartTipsApi, /getClaims/);
  assert.doesNotMatch(prismaSchema, /\bpassword\b/i);
  assert.match(prismaSchema, /savingsGoalId/);
  assert.match(prismaSchema, /targetAmount\s+Decimal\?/);
  assert.match(rlsMigration, /TO authenticated/);
  assert.match(rlsMigration, /SELECT auth\.uid\(\)/);
  assert.match(rlsMigration, /REVOKE ALL ON TABLE public\."transactions" FROM anon/);
  assert.match(migrationHistorySecurity, /REVOKE ALL ON TABLE public\."_prisma_migrations" FROM anon, authenticated, service_role/);
  assert.match(migrationHistorySecurity, /ALTER TABLE public\."_prisma_migrations" ENABLE ROW LEVEL SECURITY/);
  assert.match(migrationHistorySecurity, /ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public/);
  for (const table of ["profiles", "accounts", "categories", "transactions", "budgets", "recurring_expenses", "savings_goals", "insights"]) {
    assert.match(rlsMigration, new RegExp(`CREATE POLICY [\\s\\S]+?ON public\\."${table}"`));
  }
  for (const api of [transactionApi, recurringApi, budgetApi, categoryApi, savingsApi]) {
    assert.match(api, /export async function PATCH/);
    assert.match(api, /export async function DELETE/);
  }
  assert.match(categoryApi, /ownerId: current\.user\.id/);
  assert.match(savingsApi, /ownerId: current\.user\.id/);
  assert.match(savingsMigration, /transactions_savingsGoalId_fkey/);
  assert.match(savingsMigration, /"savings_goals"\."ownerId" = \(SELECT auth\.uid\(\)\)/);
  assert.match(optionalSavingsTargetMigration, /ALTER COLUMN "targetAmount" DROP NOT NULL/);
  for (const table of ["monthly_budgets", "account_adjustments", "account_transfers"]) {
    assert.match(accountLedgerMigration, new RegExp(`ALTER TABLE public\\."${table}" ENABLE ROW LEVEL SECURITY`));
    assert.match(accountLedgerMigration, new RegExp(`CREATE POLICY [\\s\\S]+?ON public\\."${table}"`));
  }
  assert.match(accountLedgerMigration, /ADD COLUMN "countsTowardBudget" BOOLEAN NOT NULL DEFAULT true/);
  assert.match(prismaSchema, /model AccountTransfer/);
  assert.match(prismaSchema, /model MonthlyBudget/);
  assert.match(packageJson, /"dev": "next dev"/);
  assert.match(packageJson, /"next": "16\.2\.6"/);
});

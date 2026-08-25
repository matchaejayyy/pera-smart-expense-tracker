import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("dashboard data is server-bootstrapped, parallel, compact, and owner-scoped", async () => {
  const [page, client, dashboardData, accountBalances, accountsApi, charts] = await Promise.all([
    readFile(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/dashboard/dashboard-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/dashboard-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/account-balances.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/accounts/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/dashboard/dashboard-charts.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(page, /getDashboardData\(prisma, user\.id\)/);
  assert.match(page, /initialData=\{initialData\}/);
  assert.doesNotMatch(client, /Promise\.all\(\[\s*loadApiResource/);
  assert.match(client, /useState<Transaction\[\]>\(\(\) => \(initialData\?\.transactions/);
  assert.match(dashboardData, /await Promise\.all\(\[/);
  assert.match(dashboardData, /select: \{[\s\S]*?account: \{ select: \{ name: true \} \}/);
  assert.match(dashboardData, /where: \{ ownerId/);
  assert.match(accountBalances, /\.groupBy\(/);
  assert.ok((accountBalances.match(/\.groupBy\(/g) ?? []).length >= 4);
  assert.doesNotMatch(accountBalances, /include:\s*\{\s*transactions/);
  assert.match(accountsApi, /getAccountBalances\(current\.prisma, current\.user\.id\)/);
  assert.match(accountsApi, /private, no-store/);
  assert.match(client, /dynamic\(\(\) => import\("\.\/dashboard-charts"\)/);
  assert.match(charts, /memo\(function CashFlowChart/);
  assert.match(client, /transactionBalanceDelta/);
  assert.doesNotMatch(client, /refreshAccounts/);
});

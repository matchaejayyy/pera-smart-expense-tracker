import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { advanceRecurringDate, advanceToCurrentOrFuture, dateKey } from "../lib/recurring-schedule.ts";

test("recurring dates keep their intended billing day", () => {
  assert.equal(dateKey(advanceRecurringDate(new Date("2026-09-07"), "MONTHLY", 7)), "2026-10-07");
  assert.equal(dateKey(advanceRecurringDate(new Date("2027-01-31"), "MONTHLY", 31)), "2027-02-28");
  assert.equal(dateKey(advanceRecurringDate(new Date("2027-02-28"), "MONTHLY", 31)), "2027-03-31");
  assert.equal(dateKey(advanceToCurrentOrFuture(new Date("2026-09-07"), "MONTHLY", 7, new Date("2026-11-01"))), "2026-11-07");
});

test("recurring confirmations are duplicate-safe, owner-scoped, and PWA caching stays private", async () => {
  const [dashboard, confirmApi, schema, migration, manifest, serviceWorker] = await Promise.all([
    readFile(new URL("../app/dashboard/dashboard-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/recurring/confirm/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../prisma/schema.prisma", import.meta.url), "utf8"),
    readFile(new URL("../prisma/migrations/20260825020000_add_recurring_payment_occurrences/migration.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/manifest.ts", import.meta.url), "utf8"),
    readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
  ]);

  assert.match(dashboard, /Did you pay \$\{recurringPayment\.name\}/);
  assert.match(dashboard, /action: "PAID"/);
  assert.match(dashboard, /action: "SKIPPED"/);
  assert.match(dashboard, /Count toward monthly budget/);
  assert.match(confirmApi, /ownerId: current\.user\.id/);
  assert.match(confirmApi, /isRecurring: true/);
  assert.match(confirmApi, /PrismaClientKnownRequestError/);
  assert.match(confirmApi, /P2002/);
  assert.match(schema, /@@unique\(\[recurringExpenseId, scheduledFor\]\)/);
  assert.match(schema, /scheduleDay\s+Int/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /Users manage their own recurring occurrences/);
  assert.match(manifest, /display: "standalone"/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(serviceWorker, /request\.mode === "navigate"/);
  assert.doesNotMatch(serviceWorker, /cache\.put\(request[\s\S]+request\.mode === "navigate"/);
});

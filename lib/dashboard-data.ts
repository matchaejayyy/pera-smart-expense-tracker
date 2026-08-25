import type { PrismaClient } from "../app/generated/prisma/client";
import { getAccountBalances } from "./account-balances";

export type DashboardTransactionRecord = {
  id: string;
  merchant: string;
  accountId: string;
  account: { name: string };
  categoryId: string | null;
  savingsGoalId: string | null;
  category: { name: string } | null;
  savingsGoal: { name: string } | null;
  bookedAt: string;
  amount: string;
  type: "EXPENSE" | "INCOME" | "SAVINGS";
  countsTowardBudget: boolean;
};

export type DashboardRecurringRecord = {
  id: string;
  name: string;
  accountId: string;
  account: { name: string };
  categoryId: string | null;
  category: { name: string } | null;
  amount: string;
  nextDueAt: string;
  isActive: boolean;
  frequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
};

export type DashboardData = {
  transactions: DashboardTransactionRecord[];
  recurring: DashboardRecurringRecord[];
  accounts: Awaited<ReturnType<typeof getAccountBalances>>;
  categories: Array<{ id: string; name: string; color: string; transactionType: "EXPENSE" | "INCOME" | "SAVINGS" | "TRANSFER" }>;
  savings: Array<{ id: string; name: string; targetAmount: string | null; currentAmount: string; targetDate: string | null; color: string }>;
  profile: { displayName: string | null; monthlySavingsTarget: string; budgetAlerts: boolean; smartRule: boolean } | null;
  monthlyBudget: { id: string; month: string; limit: string } | null;
};

const currentMonthStart = () => new Date(`${new Date().toISOString().slice(0, 7)}-01T00:00:00.000Z`);

export async function getDashboardData(prisma: PrismaClient, ownerId: string): Promise<DashboardData> {
  const [transactions, recurring, accounts, categories, savings, profile, monthlyBudget] = await Promise.all([
    prisma.transaction.findMany({
      where: { ownerId, type: { in: ["INCOME", "EXPENSE", "SAVINGS"] } },
      select: {
        id: true,
        merchant: true,
        accountId: true,
        categoryId: true,
        savingsGoalId: true,
        bookedAt: true,
        amount: true,
        type: true,
        countsTowardBudget: true,
        account: { select: { name: true } },
        category: { select: { name: true } },
        savingsGoal: { select: { name: true } },
      },
      orderBy: { bookedAt: "desc" },
      take: 100,
    }),
    prisma.recurringExpense.findMany({
      where: { ownerId },
      select: {
        id: true,
        name: true,
        accountId: true,
        categoryId: true,
        amount: true,
        nextDueAt: true,
        isActive: true,
        frequency: true,
        account: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: { nextDueAt: "asc" },
    }),
    getAccountBalances(prisma, ownerId),
    prisma.category.findMany({
      where: { ownerId },
      select: { id: true, name: true, color: true, transactionType: true },
      orderBy: { name: "asc" },
    }),
    prisma.savingsGoal.findMany({
      where: { ownerId },
      select: { id: true, name: true, targetAmount: true, currentAmount: true, targetDate: true, color: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.profile.findUnique({
      where: { id: ownerId },
      select: { displayName: true, monthlySavingsTarget: true, budgetAlerts: true, smartRule: true },
    }),
    prisma.monthlyBudget.findUnique({
      where: { ownerId_month: { ownerId, month: currentMonthStart() } },
      select: { id: true, month: true, limit: true },
    }),
  ]);

  return {
    transactions: transactions.map((item) => ({ ...item, type: item.type as DashboardTransactionRecord["type"], amount: item.amount.toString(), bookedAt: item.bookedAt.toISOString() })),
    recurring: recurring.map((item) => ({ ...item, amount: item.amount.toString(), nextDueAt: item.nextDueAt.toISOString() })),
    accounts,
    categories,
    savings: savings.map((item) => ({
      ...item,
      targetAmount: item.targetAmount?.toString() ?? null,
      currentAmount: item.currentAmount.toString(),
      targetDate: item.targetDate?.toISOString() ?? null,
    })),
    profile: profile ? { ...profile, monthlySavingsTarget: profile.monthlySavingsTarget.toString() } : null,
    monthlyBudget: monthlyBudget ? { ...monthlyBudget, month: monthlyBudget.month.toISOString(), limit: monthlyBudget.limit.toString() } : null,
  };
}

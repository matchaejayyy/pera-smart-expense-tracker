import type { PrismaClient } from "../app/generated/prisma/client";

export type AccountBalanceRecord = {
  id: string;
  name: string;
  type: "CASH" | "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "E_WALLET";
  openingBalance: string;
  balance: number;
};

const addToTotal = (totals: Map<string, number>, accountId: string, amount: number) => {
  totals.set(accountId, (totals.get(accountId) ?? 0) + amount);
};

export async function getAccountBalances(prisma: PrismaClient, ownerId: string): Promise<AccountBalanceRecord[]> {
  const [accounts, transactionTotals, adjustmentTotals, outgoingTotals, incomingTotals] = await Promise.all([
    prisma.account.findMany({
      where: { ownerId, isArchived: false },
      select: { id: true, name: true, type: true, openingBalance: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.transaction.groupBy({
      by: ["accountId", "type"],
      where: { ownerId },
      _sum: { amount: true },
    }),
    prisma.accountAdjustment.groupBy({
      by: ["accountId", "direction"],
      where: { ownerId },
      _sum: { amount: true },
    }),
    prisma.accountTransfer.groupBy({
      by: ["fromAccountId"],
      where: { ownerId },
      _sum: { amount: true },
    }),
    prisma.accountTransfer.groupBy({
      by: ["toAccountId"],
      where: { ownerId },
      _sum: { amount: true },
    }),
  ]);

  const deltas = new Map<string, number>();
  for (const item of transactionTotals) {
    const amount = Number(item._sum.amount ?? 0);
    const signedAmount = item.type === "INCOME" ? amount : item.type === "EXPENSE" || item.type === "SAVINGS" ? -amount : 0;
    addToTotal(deltas, item.accountId, signedAmount);
  }
  for (const item of adjustmentTotals) {
    const amount = Number(item._sum.amount ?? 0);
    addToTotal(deltas, item.accountId, item.direction === "ADD" ? amount : -amount);
  }
  for (const item of outgoingTotals) addToTotal(deltas, item.fromAccountId, -Number(item._sum.amount ?? 0));
  for (const item of incomingTotals) addToTotal(deltas, item.toAccountId, Number(item._sum.amount ?? 0));

  return accounts.map((account) => ({
    id: account.id,
    name: account.name,
    type: account.type,
    openingBalance: account.openingBalance.toString(),
    balance: Number(account.openingBalance) + (deltas.get(account.id) ?? 0),
  }));
}

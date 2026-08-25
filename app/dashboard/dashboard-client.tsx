"use client";

/* eslint-disable jsx-a11y/label-has-associated-control -- Modal labels wrap their controls; some labels use transaction-dependent text. */

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent, MouseEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Banknote,
  Bell,
  CalendarClock,
  Check,
  CircleAlert,
  CreditCard,
  Home,
  Landmark,
  LoaderCircle,
  Minus,
  Pencil,
  PiggyBank,
  Plus,
  ReceiptText,
  RefreshCw,
  Repeat2,
  Search,
  Settings,
  Smartphone,
  Sparkles,
  Tags,
  Trash2,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";

type Page = "Overview" | "Transactions" | "Accounts" | "Savings" | "Recurring" | "Reports" | "Insights";
type TransactionType = "EXPENSE" | "INCOME" | "SAVINGS";
type CategoryType = TransactionType | "TRANSFER";
type AccountType = "CASH" | "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "E_WALLET";
type Frequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
type ReportRange = 1 | 3 | 6 | 9 | 12;
type Category = { id: string; name: string; color: string; transactionType: CategoryType };
type Account = { id: string; name: string; type: AccountType; openingBalance: number; balance: number };
type Transaction = { id: string; merchant: string; accountId: string; account: string; categoryId: string | null; savingsGoalId: string | null; category: string; date: string; bookedAt: string; amount: number; type: TransactionType; countsTowardBudget: boolean; tone: string };
type RecurringItem = { id: string; name: string; accountId: string; account: string; categoryId: string | null; category: string; amount: number; due: string; nextDueAt: string; active: boolean; tone: string; frequency: Frequency };
type SavingsGoal = { id: string; name: string; targetAmount: number | null; currentAmount: number; targetDate: string | null; color: string };
type SmartTip = { kind: string; title: string; body: string };
type DashboardSettings = { displayName: string; monthlyTarget: number; budgetAlerts: boolean };
type DeleteTarget = { kind: "transaction" | "recurring" | "category" | "savings" | "account"; id: string; name: string };
type SaveAction = "transaction" | "recurring" | "recurring-payment" | "recurring-skip" | "category" | "savings" | "account" | "account-action" | "budget" | "delete" | "settings" | "transfer" | "recurring-toggle" | "smart-rule" | "tips";
type TransactionRecord = { id: string; merchant: string; accountId: string; account: { name: string }; categoryId: string | null; savingsGoalId: string | null; category?: { name: string } | null; savingsGoal?: { name: string } | null; bookedAt: string; amount: string; type: TransactionType; countsTowardBudget: boolean };
type RecurringRecord = { id: string; name: string; accountId: string; account: { name: string }; categoryId: string | null; category?: { name: string } | null; amount: string; nextDueAt: string; isActive: boolean; frequency: string };
type AccountRecord = { id: string; name: string; type: AccountType; openingBalance: string; balance: number };
type MonthlyBudgetRecord = { id: string; month: string; limit: string };
type SavingsRecord = { id: string; name: string; targetAmount: string | null; currentAmount: string; targetDate: string | null; color: string };
type ProfileRecord = { displayName?: string; monthlySavingsTarget?: string | number; budgetAlerts?: boolean; smartRule?: boolean };
type ApiPayload<T> = { data?: T; error?: string };

const defaultTips: SmartTip[] = [
  { kind: "GET_STARTED", title: "Add your first transaction", body: "Once you record income and expenses, Pera will turn your real activity into useful spending patterns." },
  { kind: "GET_STARTED", title: "Set this month’s budget", body: "Choose a spending limit and Pera will show exactly what is spent and what remains." },
];

const pageMeta: Record<Page, { eyebrow: string; title: string }> = {
  Overview: { eyebrow: "Your financial home", title: "Overview" },
  Transactions: { eyebrow: "Money in, money out", title: "Transactions" },
  Accounts: { eyebrow: "Where your money lives", title: "Accounts & wallets" },
  Savings: { eyebrow: "Build your future", title: "Savings" },
  Recurring: { eyebrow: "Never miss a due date", title: "Recurring expenses" },
  Reports: { eyebrow: "Your money story", title: "Monthly reports" },
  Insights: { eyebrow: "Personalized for you", title: "Pera smart tips" },
};

const categoryColors = ["#151613", "#b5f300", "#a9b3a2", "#d8c8ef", "#efc9aa", "#a9d9c2"];
const reportRangeOptions: ReportRange[] = [1, 3, 6, 9, 12];

const currency = (value: number, compact = false) => new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: compact ? 0 : 2,
  notation: compact ? "compact" : "standard",
}).format(Number.isFinite(value) ? value : 0);

const exactCurrency = (value: number) => new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
  maximumFractionDigits: 2,
}).format(Number.isFinite(value) ? value : 0);

const dateInputValue = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
};

const displayDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("en-PH", { month: "short", day: "2-digit" });
const daysUntilDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  const today = new Date();
  const dueDay = Date.UTC(year, month - 1, day);
  const currentDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((dueDay - currentDay) / 86_400_000);
};
const frequencyLabel: Record<Frequency, string> = { WEEKLY: "Weekly", BIWEEKLY: "Every two weeks", MONTHLY: "Monthly", QUARTERLY: "Quarterly", YEARLY: "Yearly" };
const accountTypeLabel: Record<AccountType, string> = { CASH: "Cash", CHECKING: "Bank account", SAVINGS: "Savings account", CREDIT_CARD: "Credit card", E_WALLET: "E-wallet" };
const readApiPayload = async <T,>(response: Response, label: string): Promise<ApiPayload<T>> => {
  const body = await response.text();
  if (!body.trim()) {
    if (response.ok) return {};
    throw new Error(`${label} could not be loaded (HTTP ${response.status}).`);
  }

  try {
    const payload = JSON.parse(body) as unknown;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Invalid payload");
    return payload as ApiPayload<T>;
  } catch {
    throw new Error(`${label} could not be loaded because the server returned an invalid response (HTTP ${response.status}).`);
  }
};

const loadApiResource = async <T,>(path: string, label: string): Promise<ApiPayload<T>> => {
  const response = await fetch(path, { cache: "no-store", headers: { accept: "application/json" } });
  const payload = await readApiPayload<T>(response, label);
  if (!response.ok) throw new Error(payload.error || `${label} could not be loaded (HTTP ${response.status}).`);
  return payload;
};

function MerchantIcon({ label, tone }: { label: string; tone: string }) {
  return <span className={`merchant-icon ${tone}`} aria-hidden="true">{label.slice(0, 1).toUpperCase()}</span>;
}

function AccountIcon({ type }: { type: AccountType }) {
  const Icon = type === "CASH" ? Banknote : type === "E_WALLET" ? Smartphone : type === "CREDIT_CARD" ? CreditCard : Landmark;
  return <span className={`account-type-icon ${type.toLowerCase()}`} aria-hidden="true"><Icon size={20} /></span>;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip"><strong>{label}</strong>{payload.map((item) => <span key={item.name}><i style={{ background: item.color }} />{item.name}: {currency(item.value * 1000, true)}</span>)}</div>;
}

function Modal({ id, eyebrow, title, onClose, children, className = "" }: { id: string; eyebrow: string; title: string; onClose: () => void; children: ReactNode; className?: string }) {
  const closeFromBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={closeFromBackdrop}>
      <div className={`modal ${className}`} role="dialog" aria-modal="true" aria-labelledby={id}>
        <div className="modal-head"><div><p className="eyebrow">{eyebrow}</p><h2 id={id}>{title}</h2></div><button onClick={onClose} aria-label="Close"><X size={18} /></button></div>
        {children}
      </div>
    </div>
  );
}

type DashboardProps = { userName: string; userEmail: string };

export function Dashboard({ userName, userEmail }: DashboardProps) {
  const router = useRouter();
  const [activePage, setActivePage] = useState<Page>("Overview");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurring, setRecurring] = useState<RecurringItem[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [settings, setSettings] = useState<DashboardSettings>({ displayName: userName, monthlyTarget: 20000, budgetAlerts: true });
  const [smartTips, setSmartTips] = useState<SmartTip[]>(defaultTips);
  const [transactionModal, setTransactionModal] = useState(false);
  const [transactionEditing, setTransactionEditingState] = useState<Transaction | null>(null);
  const [transactionDraftType, setTransactionDraftType] = useState<TransactionType>("EXPENSE");
  const [recurringModal, setRecurringModal] = useState(false);
  const [recurringEditing, setRecurringEditing] = useState<RecurringItem | null>(null);
  const [recurringPayment, setRecurringPayment] = useState<RecurringItem | null>(null);
  const [recurringPaymentStep, setRecurringPaymentStep] = useState<"ASK" | "PAY">("ASK");
  const [dismissedDuePrompts, setDismissedDuePrompts] = useState<string[]>([]);
  const [categoryModal, setCategoryModal] = useState(false);
  const [categoryEditing, setCategoryEditing] = useState<Category | null>(null);
  const [savingsModal, setSavingsModal] = useState(false);
  const [savingsEditing, setSavingsEditing] = useState<SavingsGoal | null>(null);
  const [accountModal, setAccountModal] = useState(false);
  const [accountEditing, setAccountEditing] = useState<Account | null>(null);
  const [accountAction, setAccountAction] = useState<{ account: Account; mode: "ADD" | "SUBTRACT" | "TRANSFER" } | null>(null);
  const [monthlyBudget, setMonthlyBudget] = useState<number | null>(null);
  const [budgetModal, setBudgetModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [transferModal, setTransferModal] = useState(false);
  const [settingsModal, setSettingsModal] = useState(false);
  const [notificationsModal, setNotificationsModal] = useState(false);
  const [transactionFilter, setTransactionFilter] = useState("All");
  const [transactionQuery, setTransactionQuery] = useState("");
  const [overviewRange, setOverviewRange] = useState<ReportRange>(1);
  const [reportRange, setReportRange] = useState<ReportRange>(6);
  const [toast, setToast] = useState<string | null>(null);
  const [smartRule, setSmartRule] = useState(false);
  const [notificationsRead, setNotificationsRead] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [tipsLoading, setTipsLoading] = useState(false);
  const [savingAction, setSavingAction] = useState<SaveAction | null>(null);
  const saveLock = useRef(false);
  const [dataMode, setDataMode] = useState<"checking" | "unavailable" | "live">("checking");
  const [dataError, setDataError] = useState("");

  const setTransactionEditing = (transaction: Transaction | null) => {
    setTransactionEditingState(transaction);
    setTransactionDraftType(transaction?.type ?? "EXPENSE");
  };

  useEffect(() => {
    const onHashChange = () => {
      const next = window.location.hash.slice(1).toLowerCase();
      const page = (Object.keys(pageMeta) as Page[]).find((item) => item.toLowerCase() === next);
      if (page) setActivePage(page);
      else window.history.replaceState(null, "", "#overview");
    };
    const syncTimer = window.setTimeout(onHashChange, 0);
    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.clearTimeout(syncTimer);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if ("Notification" in window) setNotificationPermission(Notification.permission);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      loadApiResource<TransactionRecord[]>("/api/transactions", "Transactions"),
      loadApiResource<RecurringRecord[]>("/api/recurring", "Recurring expenses"),
      loadApiResource<AccountRecord[]>("/api/accounts", "Accounts"),
      loadApiResource<Category[]>("/api/categories", "Categories"),
      loadApiResource<SavingsRecord[]>("/api/savings", "Savings"),
      loadApiResource<ProfileRecord | null>("/api/profile", "Profile settings"),
      loadApiResource<MonthlyBudgetRecord | null>("/api/monthly-budget", "Monthly budget"),
    ]).then(([transactionPayload, recurringPayload, accountPayload, categoryPayload, savingsPayload, profilePayload, budgetPayload]) => {
      if (!mounted) return;

      setTransactions((transactionPayload.data ?? []).map((item) => ({
          id: item.id,
          accountId: item.accountId,
          account: item.account.name,
          merchant: item.type === "SAVINGS" ? item.savingsGoal?.name ?? item.merchant : item.merchant,
          categoryId: item.categoryId,
          savingsGoalId: item.savingsGoalId,
          category: item.category?.name ?? (item.type === "INCOME" ? "Salary" : item.type === "SAVINGS" ? "Savings" : "Other"),
          date: new Date(item.bookedAt).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).replace(",", " ·"),
          bookedAt: item.bookedAt.slice(0, 10),
          amount: Number(item.amount),
          type: item.type,
          countsTowardBudget: item.countsTowardBudget,
          tone: item.type === "INCOME" ? "lime" : item.type === "SAVINGS" ? "blue" : "peach",
        })));
      setRecurring((recurringPayload.data ?? []).map((item) => ({
          id: item.id,
          accountId: item.accountId,
          account: item.account.name,
          name: item.name,
          categoryId: item.categoryId,
          category: item.category?.name ?? "Other",
          amount: Number(item.amount),
          due: new Date(item.nextDueAt).toLocaleDateString("en-PH", { month: "short", day: "2-digit" }),
          nextDueAt: item.nextDueAt.slice(0, 10),
          active: item.isActive,
          tone: "mint",
          frequency: item.frequency as Frequency,
        })));
      setAccounts((accountPayload.data ?? []).map((item) => ({ id: item.id, name: item.name, type: item.type, openingBalance: Number(item.openingBalance), balance: Number(item.balance) })));
      setCategories((categoryPayload.data ?? []).map((item) => ({ ...item, transactionType: item.transactionType as CategoryType })));
      setSavingsGoals((savingsPayload.data ?? []).map((item) => ({ id: item.id, name: item.name, targetAmount: item.targetAmount === null ? null : Number(item.targetAmount), currentAmount: Number(item.currentAmount), targetDate: item.targetDate?.slice(0, 10) ?? null, color: item.color })));
      setMonthlyBudget(budgetPayload.data ? Number(budgetPayload.data.limit) : null);
      const profile = profilePayload.data;
      if (profile) {
        setSettings((current) => ({
            ...current,
            displayName: profile.displayName || current.displayName,
            monthlyTarget: Number(profile.monthlySavingsTarget ?? current.monthlyTarget),
            budgetAlerts: profile.budgetAlerts ?? current.budgetAlerts,
          }));
        setSmartRule(profile.smartRule ?? false);
      }
      setDataMode("live");
      setDataError("");
    }).catch((error: unknown) => {
      if (!mounted) return;
      setTransactions([]);
      setRecurring([]);
      setAccounts([]);
      setCategories([]);
      setSavingsGoals([]);
      setDataMode("unavailable");
      setDataError(error instanceof Error ? error.message : "The database is unavailable.");
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setTransactionModal(false);
      setTransactionEditing(null);
      setRecurringModal(false);
      setRecurringEditing(null);
      if (recurringPayment) {
        setDismissedDuePrompts((items) => [...new Set([...items, `${recurringPayment.id}:${recurringPayment.nextDueAt}`])]);
        setRecurringPayment(null);
        setRecurringPaymentStep("ASK");
      }
      setCategoryModal(false);
      setCategoryEditing(null);
      setSavingsModal(false);
      setSavingsEditing(null);
      setAccountModal(false);
      setAccountEditing(null);
      setAccountAction(null);
      setBudgetModal(false);
      setDeleteTarget(null);
      setTransferModal(false);
      setSettingsModal(false);
      setNotificationsModal(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [recurringPayment]);

  useEffect(() => {
    if (dataMode !== "live" || recurringPayment || transactionModal || recurringModal || categoryModal || savingsModal || accountModal || accountAction || budgetModal || deleteTarget || transferModal || settingsModal || notificationsModal) return;
    const due = recurring.find((item) => item.active && daysUntilDate(item.nextDueAt) <= 0 && !dismissedDuePrompts.includes(`${item.id}:${item.nextDueAt}`));
    if (!due) return;
    const timer = window.setTimeout(() => {
      setRecurringPayment(due);
      setRecurringPaymentStep("ASK");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [accountAction, accountModal, budgetModal, categoryModal, dataMode, deleteTarget, dismissedDuePrompts, notificationsModal, recurring, recurringModal, recurringPayment, savingsModal, settingsModal, transactionModal, transferModal]);

  useEffect(() => {
    if (!recurringPayment || notificationPermission !== "granted" || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.ready.then((registration) => registration.showNotification(`${recurringPayment.name} is due`, {
      body: `${exactCurrency(recurringPayment.amount)} was scheduled for ${recurringPayment.due}. Open Pera to confirm it.`,
      icon: "/pera-icon-192.png",
      badge: "/pera-icon-192.png",
      tag: `recurring-${recurringPayment.id}-${recurringPayment.nextDueAt}`,
      data: { url: "/dashboard#recurring" },
    })).catch(() => undefined);
  }, [notificationPermission, recurringPayment]);

  const monthlyTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter((item) => {
      const bookedAt = new Date(`${item.bookedAt}T12:00:00`);
      return bookedAt.getFullYear() === now.getFullYear() && bookedAt.getMonth() === now.getMonth();
    });
  }, [transactions]);

  const totals = useMemo(() => {
    const income = monthlyTransactions.filter((item) => item.type === "INCOME").reduce((sum, item) => sum + item.amount, 0);
    const expenses = monthlyTransactions.filter((item) => item.type === "EXPENSE").reduce((sum, item) => sum + item.amount, 0);
    const savings = monthlyTransactions.filter((item) => item.type === "SAVINGS").reduce((sum, item) => sum + item.amount, 0);
    const balance = accounts.reduce((sum, item) => sum + item.balance, 0) + savingsGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);
    return { income, expenses, savings, balance };
  }, [accounts, monthlyTransactions, savingsGoals]);

  const cashFlowData = useMemo(() => {
    const now = new Date();
    const points = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
      return { key: `${date.getFullYear()}-${date.getMonth()}`, month: date.toLocaleDateString("en-PH", { month: "short" }), income: 0, spending: 0 };
    });
    const byMonth = new Map(points.map((point) => [point.key, point]));
    transactions.forEach((item) => {
      const date = new Date(`${item.bookedAt}T12:00:00`);
      const point = byMonth.get(`${date.getFullYear()}-${date.getMonth()}`);
      if (!point) return;
      if (item.type === "INCOME") point.income += item.amount / 1000;
      if (item.type === "EXPENSE") point.spending += item.amount / 1000;
    });
    return points;
  }, [transactions]);
  const currentMonthCashFlowData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const points = Array.from({ length: daysInMonth }, (_, index) => ({
      key: `${year}-${month}-${index + 1}`,
      label: String(index + 1),
      income: 0,
      spending: 0,
    }));

    transactions.forEach((item) => {
      const date = new Date(`${item.bookedAt}T12:00:00`);
      if (date.getFullYear() !== year || date.getMonth() !== month) return;
      const point = points[date.getDate() - 1];
      if (item.type === "INCOME") point.income += item.amount / 1000;
      if (item.type === "EXPENSE") point.spending += item.amount / 1000;
    });

    return points;
  }, [transactions]);
  const overviewCashFlowData = overviewRange === 1
    ? currentMonthCashFlowData
    : cashFlowData.slice(-overviewRange).map((point) => ({ ...point, label: point.month }));
  const reportData = cashFlowData.slice(-reportRange);
  const reportRangeLabel = `${reportRange} ${reportRange === 1 ? "month" : "months"}`;
  const reportTotals = useMemo(() => reportData.reduce((sum, item) => ({ income: sum.income + item.income, spending: sum.spending + item.spending }), { income: 0, spending: 0 }), [reportData]);

  const categoryData = useMemo(() => {
    const byCategory = new Map<string, number>();
    monthlyTransactions.filter((item) => item.type === "EXPENSE").forEach((item) => byCategory.set(item.category, (byCategory.get(item.category) ?? 0) + item.amount));
    const sorted = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    const total = sorted.reduce((sum, [, value]) => sum + value, 0) || 1;
    return sorted.map(([name, amount], index) => ({ name, amount, value: Math.max(1, Math.round(amount / total * 100)), color: categoryColors[index % categoryColors.length] }));
  }, [monthlyTransactions]);

  const filteredTransactions = useMemo(() => transactions.filter((item) => {
    const matchesType = transactionFilter === "All" || item.type === transactionFilter;
    const query = transactionQuery.trim().toLowerCase();
    const matchesQuery = !query || item.merchant.toLowerCase().includes(query) || item.category.toLowerCase().includes(query);
    return matchesType && matchesQuery;
  }), [transactionFilter, transactionQuery, transactions]);

  const totalSpent = monthlyTransactions.filter((item) => item.type === "EXPENSE" && item.countsTowardBudget).reduce((sum, item) => sum + item.amount, 0);
  const budgetPercent = monthlyBudget ? Math.round(totalSpent / monthlyBudget * 100) : 0;
  const activeRecurring = recurring.filter((item) => item.active);
  const recurringTotal = activeRecurring.reduce((sum, item) => sum + item.amount, 0);
  const firstRecurring = activeRecurring[0] ?? recurring[0];
  const expenses = monthlyTransactions.filter((item) => item.type === "EXPENSE");
  const averageExpense = expenses.length ? totals.expenses / expenses.length : 0;
  const largestExpense = expenses.length ? Math.max(...expenses.map((item) => item.amount)) : 0;
  const displayName = settings.displayName.trim() || userName;
  const firstName = displayName.split(/\s+/)[0] || "there";
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "P";
  const pageTitle = activePage === "Overview" ? `Good evening, ${firstName}` : pageMeta[activePage].title;
  const monthlyGap = Math.max(0, totals.income - totals.expenses);
  const savingsProgress = settings.monthlyTarget ? Math.min(100, Math.round(totals.savings / settings.monthlyTarget * 100)) : 0;
  const dataReady = dataMode === "live";
  const firstAccountId = accounts[0]?.id ?? "";
  const firstCategoryId = categories[0]?.id ?? "";
  const firstSavingsGoalId = savingsGoals[0]?.id ?? "";
  const savedAcrossGoals = savingsGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const targetedSavingsGoals = savingsGoals.filter((goal) => goal.targetAmount !== null);
  const savingsTargets = targetedSavingsGoals.reduce((sum, goal) => sum + (goal.targetAmount ?? 0), 0);
  const savedTowardTargets = targetedSavingsGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const accountBalanceTotal = accounts.reduce((sum, account) => sum + account.balance, 0);

  const navItems: Array<{ label: Page; icon: typeof Home }> = [
    { label: "Overview", icon: Home }, { label: "Transactions", icon: ReceiptText },
    { label: "Accounts", icon: WalletCards }, { label: "Savings", icon: PiggyBank }, { label: "Recurring", icon: Repeat2 }, { label: "Insights", icon: Sparkles },
  ];
  const activeNavIndex = Math.max(0, navItems.findIndex((item) => item.label === activePage));

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  };

  const runSave = async (action: SaveAction, task: () => Promise<void>) => {
    if (saveLock.current) return;
    saveLock.current = true;
    setSavingAction(action);
    try {
      await task();
    } finally {
      saveLock.current = false;
      setSavingAction(null);
    }
  };

  const changePage = (page: Page) => {
    setActivePage(page);
    window.history.replaceState(null, "", `#${page.toLowerCase()}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const syncMutation = async (path: string, init: RequestInit): Promise<Record<string, unknown> | null> => {
    try {
      const response = await fetch(path, init);
      const payload = await readApiPayload<Record<string, unknown>>(response, "That change");
      if (response.ok) {
        setDataMode("live");
        setDataError("");
        return payload.data ?? {};
      }
      if (response.status === 503) {
        setDataMode("unavailable");
        setDataError(payload.error ?? "The database is unavailable.");
      }
      notify(payload.error ?? "That change could not be saved. Please try again.");
    } catch {
      notify("That change could not be saved. Check your connection and try again.");
    }
    return null;
  };

  const refreshAccounts = async () => {
    const payload = await loadApiResource<AccountRecord[]>("/api/accounts", "Accounts");
    setAccounts((payload.data ?? []).map((item) => ({ id: item.id, name: item.name, type: item.type, openingBalance: Number(item.openingBalance), balance: Number(item.balance) })));
  };

  const addTransactionRecord = async (record: Omit<Transaction, "id" | "tone">) => {
    const result = await syncMutation("/api/transactions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ merchant: record.merchant, accountId: record.accountId, amount: record.amount, type: record.type, categoryId: record.categoryId, savingsGoalId: record.savingsGoalId, bookedAt: record.bookedAt, countsTowardBudget: record.countsTowardBudget }),
    });
    if (!result || typeof result.id !== "string") return false;
    const entry: Transaction = {
      ...record,
      id: result.id,
      tone: record.type === "INCOME" ? "lime" : record.type === "SAVINGS" ? "blue" : "peach",
    };
    setTransactions((current) => [entry, ...current]);
    if (record.type === "SAVINGS" && record.savingsGoalId) setSavingsGoals((items) => items.map((goal) => goal.id === record.savingsGoalId ? { ...goal, currentAmount: goal.currentAmount + record.amount } : goal));
    await refreshAccounts();
    setNotificationsRead(false);
    return true;
  };

  const saveTransaction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    await runSave("transaction", async () => {
      const data = new FormData(form);
      const type = transactionDraftType;
      const accountId = String(data.get("accountId") ?? "");
      const account = accounts.find((item) => item.id === accountId);
      if (!account) {
        notify("Create or choose an account before saving.");
        return;
      }
      const categoryId = type === "EXPENSE" ? String(data.get("categoryId") ?? "") : null;
      const category = type === "EXPENSE" ? categories.find((item) => item.id === categoryId) : null;
      if (type === "EXPENSE" && !category) {
        notify("Choose a category before saving an expense.");
        return;
      }
      const savingsGoalId = type === "SAVINGS" ? String(data.get("savingsGoalId") ?? "") : null;
      const savingsGoal = type === "SAVINGS" ? savingsGoals.find((item) => item.id === savingsGoalId) : null;
      if (type === "SAVINGS" && !savingsGoal) {
        notify("Create or choose a savings destination first.");
        return;
      }
      const merchant = type === "SAVINGS" ? savingsGoal!.name : String(data.get("merchant") ?? "").trim() || "Salary";
      const amount = Number(data.get("amount"));
      const bookedAt = String(data.get("bookedAt"));
      const countsTowardBudget = type === "EXPENSE" && data.get("countsTowardBudget") === "on";
      const nextRecord = { merchant, accountId, account: account.name, categoryId, savingsGoalId, category: category?.name ?? (type === "INCOME" ? "Salary" : "Savings"), amount, type, countsTowardBudget, bookedAt, date: `${displayDate(bookedAt)} · Just now` };
      if (transactionEditing) {
        const result = await syncMutation("/api/transactions", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: transactionEditing.id, merchant, accountId, categoryId, savingsGoalId, amount, type, bookedAt, countsTowardBudget }) });
        if (!result) return;
        if (transactionEditing.type === "SAVINGS" && transactionEditing.savingsGoalId) setSavingsGoals((items) => items.map((goal) => goal.id === transactionEditing.savingsGoalId ? { ...goal, currentAmount: Math.max(0, goal.currentAmount - transactionEditing.amount) } : goal));
        if (type === "SAVINGS" && savingsGoalId) setSavingsGoals((items) => items.map((goal) => goal.id === savingsGoalId ? { ...goal, currentAmount: goal.currentAmount + amount } : goal));
        setTransactions((items) => items.map((item) => item.id === transactionEditing.id ? { ...item, ...nextRecord, tone: type === "INCOME" ? "lime" : type === "SAVINGS" ? "blue" : "peach" } : item));
        await refreshAccounts();
        notify(`${merchant} was updated`);
      } else {
        if (!await addTransactionRecord(nextRecord)) return;
        notify(`${merchant} was added`);
      }
      setTransactionModal(false);
      setTransactionEditing(null);
    });
  };

  const saveSavingsGoal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    await runSave("savings", async () => {
      const data = new FormData(form);
      const targetAmountValue = String(data.get("targetAmount") ?? "").trim();
      const values = {
        name: String(data.get("name")).trim(),
        targetAmount: targetAmountValue ? Number(targetAmountValue) : null,
        targetDate: String(data.get("targetDate") || "") || null,
        color: String(data.get("color")),
      };
      const result = await syncMutation("/api/savings", {
        method: savingsEditing ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(savingsEditing ? { id: savingsEditing.id, ...values } : values),
      });
      if (!result || typeof result.id !== "string") return;
      const nextGoal: SavingsGoal = { id: result.id as string, currentAmount: savingsEditing?.currentAmount ?? 0, ...values };
      if (savingsEditing) {
        setSavingsGoals((items) => items.map((item) => item.id === savingsEditing.id ? nextGoal : item));
        setTransactions((items) => items.map((item) => item.savingsGoalId === savingsEditing.id ? { ...item, merchant: values.name } : item));
        notify(`${values.name} was updated`);
      } else {
        setSavingsGoals((items) => [...items, nextGoal]);
        notify(`${values.name} was created`);
      }
      setSavingsModal(false);
      setSavingsEditing(null);
    });
  };

  const saveRecurring = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    await runSave("recurring", async () => {
      const data = new FormData(form);
      const dueDate = String(data.get("nextDueAt"));
      const accountId = String(data.get("accountId"));
      const account = accounts.find((item) => item.id === accountId);
      if (!account) {
        notify("Choose a payment account before saving.");
        return;
      }
      const categoryId = String(data.get("categoryId"));
      const category = categories.find((item) => item.id === categoryId);
      if (!category) {
        notify("Choose a category before saving.");
        return;
      }
      const values = {
        name: String(data.get("name")).trim(),
        accountId,
        account: account.name,
        categoryId,
        category: category.name,
        amount: Number(data.get("amount")),
        due: displayDate(dueDate),
        nextDueAt: dueDate,
        frequency: String(data.get("frequency")) as Frequency,
      };
      if (recurringEditing) {
        const result = await syncMutation("/api/recurring", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: recurringEditing.id, name: values.name, accountId, categoryId, amount: values.amount, nextDueAt: values.nextDueAt, frequency: values.frequency }) });
        if (!result) return;
        setRecurring((items) => items.map((item) => item.id === recurringEditing.id ? { ...item, ...values } : item));
        notify(`${values.name} was updated`);
      } else {
        const result = await syncMutation("/api/recurring", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: values.name, accountId, categoryId, amount: values.amount, nextDueAt: values.nextDueAt, frequency: values.frequency }) });
        if (!result || typeof result.id !== "string") return;
        const item: RecurringItem = { id: result.id as string, ...values, active: true, tone: "mint" };
        setRecurring((current) => [...current, item]);
        notify(`${item.name} was scheduled`);
      }
      setRecurringModal(false);
      setRecurringEditing(null);
      setNotificationsRead(false);
    });
  };

  const dismissRecurringPayment = () => {
    if (recurringPayment) setDismissedDuePrompts((items) => [...new Set([...items, `${recurringPayment.id}:${recurringPayment.nextDueAt}`])]);
    setRecurringPayment(null);
    setRecurringPaymentStep("ASK");
  };

  const applyRecurringAdvance = (item: RecurringItem, result: Record<string, unknown>) => {
    const updated = result.recurring;
    if (!updated || typeof updated !== "object" || !("nextDueAt" in updated) || typeof updated.nextDueAt !== "string") return null;
    const nextDueAt = updated.nextDueAt.slice(0, 10);
    setRecurring((items) => items.map((entry) => entry.id === item.id ? { ...entry, nextDueAt, due: displayDate(nextDueAt) } : entry));
    return nextDueAt;
  };

  const skipRecurringPayment = async () => {
    if (!recurringPayment) return;
    const item = recurringPayment;
    await runSave("recurring-skip", async () => {
      const result = await syncMutation("/api/recurring/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recurringId: item.id, action: "SKIPPED" }),
      });
      if (!result) return;
      const nextDueAt = applyRecurringAdvance(item, result);
      setRecurringPayment(null);
      setRecurringPaymentStep("ASK");
      setNotificationsRead(false);
      notify(nextDueAt ? `${item.name} was skipped. Next due ${displayDate(nextDueAt)}.` : `${item.name} was skipped.`);
    });
  };

  const saveRecurringPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!recurringPayment) return;
    const item = recurringPayment;
    const form = event.currentTarget;
    await runSave("recurring-payment", async () => {
      const data = new FormData(form);
      const accountId = String(data.get("accountId") ?? "");
      const account = accounts.find((entry) => entry.id === accountId);
      const amount = Number(data.get("amount"));
      const paidAt = String(data.get("paidAt"));
      const countsTowardBudget = data.get("countsTowardBudget") === "on";
      if (!account) {
        notify("Choose the account used for this payment.");
        return;
      }
      const result = await syncMutation("/api/recurring/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recurringId: item.id, action: "PAID", accountId, amount, paidAt, countsTowardBudget }),
      });
      if (!result) return;
      const created = result.transaction;
      if (created && typeof created === "object" && "id" in created && typeof created.id === "string") {
        const transactionId = created.id;
        setTransactions((items) => [{
          id: transactionId,
          merchant: item.name,
          accountId,
          account: account.name,
          categoryId: item.categoryId,
          savingsGoalId: null,
          category: item.category,
          date: `${displayDate(paidAt)} · Just now`,
          bookedAt: paidAt,
          amount,
          type: "EXPENSE",
          countsTowardBudget,
          tone: "peach",
        }, ...items]);
      }
      const nextDueAt = applyRecurringAdvance(item, result);
      await refreshAccounts();
      setRecurringPayment(null);
      setRecurringPaymentStep("ASK");
      setNotificationsRead(false);
      notify(nextDueAt ? `${item.name} was paid. Next due ${displayDate(nextDueAt)}.` : `${item.name} was marked paid.`);
    });
  };

  const enableDeviceNotifications = async () => {
    if (!("Notification" in window)) {
      notify("Device notifications are not supported in this browser.");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    notify(permission === "granted" ? "Device reminders enabled" : "Device reminders were not enabled");
  };

  const saveCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    await runSave("category", async () => {
      const data = new FormData(form);
      const values = {
        name: String(data.get("name")).trim(),
        color: String(data.get("color")),
        transactionType: categoryEditing?.transactionType ?? "EXPENSE" as CategoryType,
      };
      const result = await syncMutation("/api/categories", {
        method: categoryEditing ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(categoryEditing ? { id: categoryEditing.id, ...values } : values),
      });
      if (!result || typeof result.id !== "string") return;
      const nextCategory: Category = { id: result.id as string, ...values };
      if (categoryEditing) {
        setCategories((items) => items.map((item) => item.id === categoryEditing.id ? nextCategory : item).sort((a, b) => a.name.localeCompare(b.name)));
        setTransactions((items) => items.map((item) => item.categoryId === categoryEditing.id ? { ...item, category: values.name } : item));
        setRecurring((items) => items.map((item) => item.categoryId === categoryEditing.id ? { ...item, category: values.name } : item));
        notify(`${values.name} category was updated`);
      } else {
        setCategories((items) => [...items, nextCategory].sort((a, b) => a.name.localeCompare(b.name)));
        notify(`${values.name} category was added`);
      }
      setCategoryEditing(null);
      form.reset();
    });
  };

  const toggleRecurring = async (id: string) => {
    const item = recurring.find((entry) => entry.id === id);
    if (!item) return;
    await runSave("recurring-toggle", async () => {
      const result = await syncMutation("/api/recurring", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: item.id, isActive: !item.active }) });
      if (!result) return;
      const nextDueAt = typeof result.nextDueAt === "string" ? result.nextDueAt.slice(0, 10) : item.nextDueAt;
      setRecurring((items) => items.map((entry) => entry.id === id ? { ...entry, active: !entry.active, nextDueAt, due: displayDate(nextDueAt) } : entry));
      if (item.active && recurringPayment?.id === item.id) dismissRecurringPayment();
      notify(`${item.name} ${item.active ? "paused" : "resumed"}`);
    });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    await runSave("delete", async () => {
      const { kind, id, name } = target;
      const path = kind === "transaction" ? "/api/transactions" : kind === "recurring" ? "/api/recurring" : kind === "category" ? "/api/categories" : kind === "account" ? "/api/accounts" : "/api/savings";
      const result = await syncMutation(path, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
      if (!result) return;
      if (kind === "transaction") {
        const item = transactions.find((entry) => entry.id === id);
        if (item?.type === "SAVINGS" && item.savingsGoalId) setSavingsGoals((items) => items.map((goal) => goal.id === item.savingsGoalId ? { ...goal, currentAmount: Math.max(0, goal.currentAmount - item.amount) } : goal));
        setTransactions((items) => items.filter((item) => item.id !== id));
        await refreshAccounts();
      } else if (kind === "recurring") {
        setRecurring((items) => items.filter((item) => item.id !== id));
      } else if (kind === "category") {
        setCategories((items) => items.filter((item) => item.id !== id));
        setTransactions((items) => items.map((item) => item.categoryId === id ? { ...item, categoryId: null, category: "Other" } : item));
        setRecurring((items) => items.map((item) => item.categoryId === id ? { ...item, categoryId: null, category: "Other" } : item));
        if (categoryEditing?.id === id) setCategoryEditing(null);
      } else if (kind === "savings") {
        setSavingsGoals((items) => items.filter((item) => item.id !== id));
        setTransactions((items) => items.map((item) => item.savingsGoalId === id ? { ...item, savingsGoalId: null } : item));
        if (savingsEditing?.id === id) setSavingsEditing(null);
      } else {
        setAccounts((items) => items.filter((item) => item.id !== id));
        if (accountEditing?.id === id) setAccountEditing(null);
      }
      setDeleteTarget(null);
      notify(`${name} was deleted`);
    });
  };

  const saveAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    await runSave("account", async () => {
      const data = new FormData(form);
      const values = {
        name: String(data.get("name") ?? "").trim(),
        type: String(data.get("type")) as AccountType,
        openingBalance: Number(data.get("openingBalance")),
      };
      const result = await syncMutation("/api/accounts", {
        method: accountEditing ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(accountEditing ? { id: accountEditing.id, ...values } : values),
      });
      if (!result) return;
      await refreshAccounts();
      setAccountModal(false);
      setAccountEditing(null);
      notify(`${values.name} was ${accountEditing ? "updated" : "created"}`);
    });
  };

  const saveAccountAction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accountAction) return;
    const form = event.currentTarget;
    await runSave("account-action", async () => {
      const data = new FormData(form);
      const amount = Number(data.get("amount"));
      const note = String(data.get("note") ?? "").trim();
      const occurredAt = String(data.get("occurredAt"));
      const isTransfer = accountAction.mode === "TRANSFER";
      const payload = isTransfer
        ? { action: "TRANSFER", fromAccountId: accountAction.account.id, toAccountId: String(data.get("toAccountId")), amount, note, occurredAt }
        : { action: "ADJUSTMENT", accountId: accountAction.account.id, direction: accountAction.mode, amount, note, occurredAt };
      const result = await syncMutation("/api/account-actions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      if (!result) return;
      await refreshAccounts();
      setAccountAction(null);
      notify(isTransfer ? "Transfer completed" : `${accountAction.account.name} balance updated`);
    });
  };

  const saveMonthlyBudget = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    await runSave("budget", async () => {
      const data = new FormData(form);
      const limit = Number(data.get("limit"));
      const result = await syncMutation("/api/monthly-budget", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ month: new Date().toISOString().slice(0, 7), limit }) });
      if (!result) return;
      setMonthlyBudget(limit);
      setBudgetModal(false);
      notify("Monthly budget saved");
    });
  };

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    await runSave("settings", async () => {
      const data = new FormData(form);
      const nextSettings = {
        displayName: String(data.get("displayName")).trim() || userName,
        monthlyTarget: Number(data.get("monthlyTarget")),
        budgetAlerts: data.get("budgetAlerts") === "on",
      };
      const result = await syncMutation("/api/profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ displayName: nextSettings.displayName, monthlySavingsTarget: nextSettings.monthlyTarget, budgetAlerts: nextSettings.budgetAlerts }) });
      if (!result) return;
      setSettings(nextSettings);
      setSettingsModal(false);
      notify("Profile settings saved");
    });
  };

  const planTransfer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    await runSave("transfer", async () => {
      const data = new FormData(form);
      const amount = Number(data.get("amount"));
      const savingsGoalId = String(data.get("savingsGoalId"));
      const savingsGoal = savingsGoals.find((item) => item.id === savingsGoalId);
      if (!savingsGoal) {
        notify("Create or choose a savings destination first.");
        return;
      }
      const accountId = String(data.get("accountId"));
      const account = accounts.find((item) => item.id === accountId);
      if (!account) {
        notify("Choose a source account first.");
        return;
      }
      if (!await addTransactionRecord({ merchant: savingsGoal.name, accountId, account: account.name, categoryId: null, savingsGoalId, category: "Savings", amount, type: "SAVINGS", countsTowardBudget: false, date: "Today · Just now", bookedAt: dateInputValue() })) return;
      setTransferModal(false);
      changePage("Savings");
      notify(`${currency(amount, true)} planned for savings`);
    });
  };

  const toggleSmartRule = async () => {
    await runSave("smart-rule", async () => {
      const next = !smartRule;
      const result = await syncMutation("/api/profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ smartRule: next }) });
      if (!result) return;
      setSmartRule(next);
      setNotificationsRead(false);
      notify(next ? "Smart dining rule activated" : "Smart rule removed");
    });
  };

  const refreshTips = async () => {
    await runSave("tips", async () => {
      setTipsLoading(true);
      const dining = monthlyTransactions.filter((item) => item.type === "EXPENSE" && item.category.toLowerCase().includes("dining")).reduce((sum, item) => sum + item.amount, 0);
      const now = new Date();
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const diningLastMonth = transactions.filter((item) => {
        const date = new Date(`${item.bookedAt}T12:00:00`);
        return item.type === "EXPENSE" && item.category.toLowerCase().includes("dining") && date.getFullYear() === previousMonth.getFullYear() && date.getMonth() === previousMonth.getMonth();
      }).reduce((sum, item) => sum + item.amount, 0);
      const subscriptions = recurring.filter((item) => item.active && item.category === "Entertainment").reduce((sum, item) => sum + item.amount, 0);
      try {
        const response = await fetch("/api/smart-tips", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ dining, diningLastMonth, subscriptions, monthlyIncome: totals.income, monthlySpend: totals.expenses }) });
        const payload = await readApiPayload<SmartTip[]>(response, "Smart tips");
        if (Array.isArray(payload.data) && payload.data.length) setSmartTips(payload.data);
        notify("Your smart tips were refreshed");
      } catch {
        notify("Your saved tips are still available");
      } finally {
        setTipsLoading(false);
      }
    });
  };

  const recurringNotificationItems = activeRecurring.flatMap((item) => {
    const daysUntilDue = daysUntilDate(item.nextDueAt);
    if (![10, 1, 0].includes(daysUntilDue) && daysUntilDue > 0) return [];
    const timing = daysUntilDue === 10 ? "in 10 days" : daysUntilDue === 1 ? "tomorrow" : "today";
    const title = daysUntilDue < 0 ? `${item.name} is ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? "" : "s"} overdue` : `${item.name} is due ${timing}`;
    return [{ key: `recurring-${item.id}-${daysUntilDue}`, title, body: `${currency(item.amount)} is scheduled for ${item.due}.` }];
  });

  const notificationItems = [
    ...(settings.budgetAlerts && monthlyBudget && budgetPercent >= 75 ? [{ key: "spending-check-in", title: "Monthly spending check-in", body: `${budgetPercent}% of this month’s budget has been spent.` }] : []),
    ...recurringNotificationItems,
  ];

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <button className="brand-mark" onClick={() => changePage("Overview")} aria-label="Pera home">P</button>
        <nav style={{ "--active-index": activeNavIndex } as CSSProperties}><span className="mobile-nav-indicator" aria-hidden="true" />{navItems.map(({ label, icon: Icon }) => <button key={label} className={activePage === label ? "nav-item active" : "nav-item"} onClick={() => changePage(label)} aria-label={label}><Icon size={21} strokeWidth={2} /><small>{label}</small></button>)}</nav>
        <button className="nav-item settings" aria-label="Settings" onClick={() => setSettingsModal(true)}><Settings size={21} /><small>Settings</small></button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="topbar-title" key={activePage}><p className="eyebrow">{pageMeta[activePage].eyebrow}</p><h1>{pageTitle}</h1></div>
          <div className="header-actions">
            <button className="add-button" disabled={!dataReady || accounts.length === 0} title={accounts.length ? "Add transaction" : "Add an account first"} onClick={() => { setTransactionEditing(null); setTransactionDraftType("EXPENSE"); setTransactionModal(true); }}><Plus size={17} />Add transaction</button>
            <button className="icon-button" aria-label="Notifications" onClick={() => setNotificationsModal(true)}><Bell size={18} />{!notificationsRead && notificationItems.length > 0 && <i />}</button>
            <button className="avatar" aria-label={`${displayName}'s profile`} title={userEmail} onClick={() => router.push("/profile")}>{initials}</button>
          </div>
        </header>

        {dataMode === "unavailable" && <div className="data-notice" role="alert"><CircleAlert size={19} /><div><strong>Your secure financial data could not be loaded.</strong><p>{dataError || "Refresh the page to reconnect to Supabase. No fallback data is being shown."}</p></div></div>}

        <div className="page-stage" key={activePage}>
        {activePage === "Overview" && <>
          <section className="summary-grid" aria-label="Financial summary">
            <article className="summary-card balance-card"><div className="card-heading"><span>Total balance</span></div><strong>{currency(totals.balance)}</strong><p>Across accounts and savings</p></article>
            <article className="summary-card"><div className="card-heading"><span>Income</span><span className="summary-icon income"><ArrowDownLeft size={15} /></span></div><strong>{exactCurrency(totals.income)}</strong><p>This month</p></article>
            <article className="summary-card"><div className="card-heading"><span>Spent</span><span className="summary-icon expense"><ArrowUpRight size={15} /></span></div><strong>{exactCurrency(totals.expenses)}</strong><p>{totals.income ? Math.round(totals.expenses / totals.income * 100) : 0}% of income</p></article>
            <article className="summary-card"><div className="card-heading"><span>Saved</span><span className="summary-icon saved"><PiggyBank size={15} /></span></div><strong>{exactCurrency(totals.savings)}</strong><p>{savingsProgress}% of your target</p></article>
          </section>

          <section className="dashboard-grid">
            <article className="panel spending-panel"><div className="panel-title-row"><div><p className="eyebrow">Cash flow</p><h2>Income vs. spending</h2></div><div className="panel-head-actions"><button className="text-button report-entry" onClick={() => changePage("Reports")}><BarChart3 size={14} />Reports</button><select className="period-pill" value={overviewRange} onChange={(event) => { const nextRange = Number(event.target.value) as ReportRange; if (reportRangeOptions.includes(nextRange)) setOverviewRange(nextRange); }} aria-label="Overview cash flow period">{reportRangeOptions.map((months) => <option key={months} value={months}>{months === 1 ? "This month" : `Last ${months} months`}</option>)}</select></div></div><div className="chart-legend"><span><i className="legend-dot lime" />Income</span><span><i className="legend-dot ink" />Spending</span></div><div className="cash-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={overviewCashFlowData} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}><defs><linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b5f300" stopOpacity={0.34} /><stop offset="100%" stopColor="#b5f300" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#e5e8df" strokeDasharray="4 5" /><XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={16} tick={{ fill: "#74776d", fontSize: 10 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#9a9d94", fontSize: 9 }} tickFormatter={(value) => `₱${value}k`} /><Tooltip content={<ChartTooltip />} /><Area type="monotone" dataKey="income" stroke="#94ca00" strokeWidth={2.5} fill="url(#incomeFill)" /><Area type="monotone" dataKey="spending" stroke="#171816" strokeWidth={2.5} fill="transparent" /></AreaChart></ResponsiveContainer></div></article>
            <article className="panel insight-card"><span className="spark"><Sparkles size={20} /></span><p className="eyebrow">Pera smart tip</p><h2>{smartTips[0]?.title ?? "You’re spending smarter."}</h2><p>{smartTips[0]?.body}</p><button onClick={() => changePage("Insights")}>See all insights <ArrowRight size={16} /></button></article>
            <article className="panel transactions-panel"><div className="panel-title-row"><div><p className="eyebrow">Latest activity</p><h2>Recent transactions</h2></div><button className="text-button" onClick={() => changePage("Transactions")}>View all <ArrowRight size={14} /></button></div><div className="transaction-list">{transactions.slice(0, 4).map((item) => <div className="transaction" key={item.id}><MerchantIcon label={item.merchant} tone={item.tone} /><span className="transaction-main"><strong>{item.merchant}</strong><small>{item.date} · {item.category} · {item.account}</small></span><strong className={item.type === "INCOME" ? "positive" : item.type === "SAVINGS" ? "saving" : ""}>{item.type === "INCOME" ? "+" : "−"}{currency(item.amount, true)}</strong></div>)}{transactions.length === 0 && <p className="empty-state compact">No transactions yet.</p>}</div></article>
            <article className="panel budget-card"><div className="panel-title-row"><div><p className="eyebrow">Set by you</p><h2>Monthly budget</h2></div><span className="budget-percent">{monthlyBudget ? `${budgetPercent}%` : "Not set"}</span></div><div className="budget-ring" style={{ "--progress": `${Math.min(budgetPercent, 100)}%` } as React.CSSProperties} aria-label={monthlyBudget ? `${budgetPercent} percent of monthly budget spent` : "Monthly budget not set"}><div><strong>{exactCurrency(totalSpent)}</strong><span>{monthlyBudget ? `of ${exactCurrency(monthlyBudget)} budget` : "Set a monthly limit"}</span></div></div><div className="budget-copy"><span><i className="legend-dot lime" />Spent {exactCurrency(totalSpent)}</span><span><i className="legend-dot pale" />Available {exactCurrency(Math.max(0, (monthlyBudget ?? 0) - totalSpent))}</span></div><button className="primary-button" disabled={!dataReady} onClick={() => setBudgetModal(true)}>{monthlyBudget ? "Edit monthly budget" : "Set monthly budget"}</button></article>
            <article className="panel recurring-preview"><div className="panel-title-row"><div><p className="eyebrow">Coming up</p><h2>Recurring expenses</h2></div><button className="text-button" onClick={() => changePage("Recurring")}>See schedule <ArrowRight size={14} /></button></div>{firstRecurring ? <div className="recurring-row"><div className="recurring-date"><strong>{firstRecurring.due.split(" ")[1]}</strong><small>{firstRecurring.due.split(" ")[0]?.toUpperCase()}</small></div><MerchantIcon label={firstRecurring.name} tone={firstRecurring.tone} /><span><strong>{firstRecurring.name}</strong><small>{frequencyLabel[firstRecurring.frequency]} · {firstRecurring.category}</small></span><strong>{currency(firstRecurring.amount, true)}</strong></div> : <p className="empty-state compact">No recurring payments yet.</p>}</article>
          </section>
        </>}

        {activePage === "Transactions" && <section className="page-grid transactions-page"><article className="panel wide-panel"><div className="toolbar"><div className="search-box"><Search size={16} /><input aria-label="Search transactions" placeholder="Search transactions" value={transactionQuery} onChange={(event) => setTransactionQuery(event.target.value)} /></div><div className="filter-pills">{["All", "EXPENSE", "INCOME", "SAVINGS"].map((filter) => <button key={filter} onClick={() => setTransactionFilter(filter)} className={transactionFilter === filter ? "active" : ""}>{filter === "All" ? "All" : filter.toLowerCase()}</button>)}</div></div><div className="transaction-table"><div className="table-head"><span>Transaction</span><span>Category</span><span>Date</span><span>Amount</span><span>Actions</span></div>{filteredTransactions.map((item) => <div className="table-row" key={item.id}><span className="table-merchant"><MerchantIcon label={item.merchant} tone={item.tone} /><span className="table-merchant-copy"><strong>{item.merchant}</strong><small>{item.account}</small></span></span><span>{item.category}</span><span>{item.date.split(" · ")[0]}</span><strong className={item.type === "INCOME" ? "positive" : item.type === "SAVINGS" ? "saving" : ""}>{item.type === "INCOME" ? "+" : "−"}{currency(item.amount)}</strong><span className="row-actions"><button onClick={() => { setTransactionEditing(item); setTransactionModal(true); }} aria-label={`Edit ${item.merchant}`}><Pencil size={14} /></button><button className="danger" onClick={() => setDeleteTarget({ kind: "transaction", id: item.id, name: item.merchant })} aria-label={`Delete ${item.merchant}`}><Trash2 size={14} /></button></span></div>)}{filteredTransactions.length === 0 && <p className="empty-state">No transactions match your search and filter.</p>}</div></article><aside className="panel transaction-side"><div className="snapshot-heading"><p className="eyebrow">This month</p><h2>Activity snapshot</h2></div><div className="snapshot-stats"><div className="mini-stat"><span>Transactions</span><strong>{monthlyTransactions.length}</strong></div><div className="mini-stat"><span>Average expense</span><strong>{currency(averageExpense, true)}</strong></div><div className="mini-stat"><span>Largest expense</span><strong>{currency(largestExpense, true)}</strong></div></div><div className="snapshot-actions"><button className="primary-button" disabled={!dataReady || accounts.length === 0} onClick={() => { setTransactionEditing(null); setTransactionModal(true); }}><Plus size={16} />Add transaction</button><button className="secondary-button category-manager-button" disabled={!dataReady} onClick={() => { setCategoryEditing(null); setCategoryModal(true); }}><Tags size={16} />Manage categories</button></div></aside></section>}

        {activePage === "Accounts" && <section className="accounts-page"><article className="accounts-summary"><div><p className="eyebrow">Your money locations</p><h2>{exactCurrency(accountBalanceTotal)}</h2><p>Available across Cash, banks, e-wallets, and other active accounts.</p></div><div className="accounts-summary-stat"><strong>{accounts.length}</strong><small>active account{accounts.length === 1 ? "" : "s"}</small></div><button className="savings-add-button" disabled={!dataReady} onClick={() => { setAccountEditing(null); setAccountModal(true); }}><Plus size={17} />Add account</button></article><div className="account-grid">{accounts.map((account) => <article className="account-ledger-card" key={account.id}><div className="account-ledger-head"><AccountIcon type={account.type} /><div className="row-actions"><button onClick={() => { setAccountEditing(account); setAccountModal(true); }} aria-label={`Edit ${account.name}`}><Pencil size={14} /></button><button className="danger" onClick={() => setDeleteTarget({ kind: "account", id: account.id, name: account.name })} aria-label={`Delete ${account.name}`}><Trash2 size={14} /></button></div></div><p className="eyebrow">{accountTypeLabel[account.type]}</p><h2>{account.name}</h2><strong className={account.balance < 0 ? "account-balance negative" : "account-balance"}>{exactCurrency(account.balance)}</strong><small className="opening-balance">Opening balance {exactCurrency(account.openingBalance)}</small><div className="account-card-actions"><button onClick={() => setAccountAction({ account, mode: "ADD" })}><Plus size={14} />Add</button><button onClick={() => setAccountAction({ account, mode: "SUBTRACT" })}><Minus size={14} />Subtract</button><button disabled={accounts.length < 2} onClick={() => setAccountAction({ account, mode: "TRANSFER" })}><ArrowLeftRight size={14} />Transfer</button></div></article>)}{accounts.length === 0 && <article className="accounts-empty"><span><WalletCards size={28} /></span><h2>Add where you keep money</h2><p>Create Cash on Hand, Maya, Metrobank, or any account you use. Transactions become available after your first account is created.</p><button disabled={!dataReady} onClick={() => { setAccountEditing(null); setAccountModal(true); }}><Plus size={16} />Add first account</button></article>}</div></section>}

        {activePage === "Savings" && <section className="savings-page"><article className="savings-summary-panel"><div><p className="eyebrow">Your savings portfolio</p><h2>{currency(savedAcrossGoals)} saved</h2><p>Build flexible destinations for emergencies, personal plans, travel, or anything important to you.</p></div><div className="savings-summary-progress"><span><strong>{savingsGoals.length}</strong><small>active goal{savingsGoals.length === 1 ? "" : "s"}</small></span><span><strong>{savingsTargets ? `${Math.round(savedTowardTargets / savingsTargets * 100)}%` : "Flexible"}</strong><small>{savingsTargets ? "of all targets" : "targets are optional"}</small></span></div><button className="savings-add-button" disabled={!dataReady} onClick={() => { setSavingsEditing(null); setSavingsModal(true); }}><Plus size={17} />Create savings goal</button></article><div className="savings-goal-grid">{savingsGoals.map((goal) => { const progress = goal.targetAmount ? Math.min(100, Math.round(goal.currentAmount / goal.targetAmount * 100)) : 0; return <article className="savings-goal-card" key={goal.id}><div className="savings-goal-head"><span className="savings-goal-icon" style={{ background: goal.color }}><PiggyBank size={20} /></span><div className="row-actions"><button onClick={() => { setSavingsEditing(goal); setSavingsModal(true); }} aria-label={`Edit ${goal.name}`}><Pencil size={14} /></button><button className="danger" onClick={() => setDeleteTarget({ kind: "savings", id: goal.id, name: goal.name })} aria-label={`Delete ${goal.name}`}><Trash2 size={14} /></button></div></div><p className="eyebrow">Savings destination</p><h2>{goal.name}</h2><strong className="savings-goal-amount">{currency(goal.currentAmount)}</strong><span className="savings-goal-target">{goal.targetAmount ? `of ${currency(goal.targetAmount)} target` : "No target amount"}</span><div className={`savings-goal-progress${goal.targetAmount ? "" : " no-target"}`}><i style={{ width: `${progress}%`, background: goal.color }} /></div><div className="savings-goal-foot"><span>{goal.targetAmount ? `${progress}% complete` : "Flexible savings"}</span><span>{goal.targetDate ? `Target ${new Date(`${goal.targetDate}T12:00:00`).toLocaleDateString("en-PH", { month: "short", year: "numeric" })}` : "No deadline"}</span></div></article>; })}{savingsGoals.length === 0 && <article className="savings-empty"><span><PiggyBank size={28} /></span><h2>Create your first savings destination</h2><p>Name it anything you want—Personal Savings, Emergency Fund, Travel, or another goal.</p><button disabled={!dataReady} onClick={() => { setSavingsEditing(null); setSavingsModal(true); }}><Plus size={16} />Create savings goal</button></article>}</div></section>}

        {activePage === "Recurring" && <section className="page-grid recurring-page"><article className="panel wide-panel"><div className="panel-title-row"><div><p className="eyebrow">Payment calendar</p><h2>Payment schedule</h2></div><button className="secondary-button" disabled={!dataReady || accounts.length === 0} onClick={() => { setRecurringEditing(null); setRecurringModal(true); }}><Plus size={15} />Add recurring</button></div><div className="recurring-list">{recurring.map((item) => <div className="recurring-item" key={item.id}><div className={`due-chip${item.active && daysUntilDate(item.nextDueAt) <= 0 ? " overdue" : ""}`}><CalendarClock size={15} /><span><small>{item.active && daysUntilDate(item.nextDueAt) < 0 ? "Overdue" : "Due"}</small><strong>{item.due}</strong></span></div><MerchantIcon label={item.name} tone={item.tone} /><span className="transaction-main"><strong>{item.name}</strong><small>{item.category} · {frequencyLabel[item.frequency]} · {item.account}</small></span><strong>{currency(item.amount)}</strong>{item.active && daysUntilDate(item.nextDueAt) <= 0 && <button className="due-action" disabled={savingAction !== null} onClick={() => { setRecurringPayment(item); setRecurringPaymentStep("ASK"); }}>Confirm payment</button>}<span className="row-actions recurring-actions"><button onClick={() => { setRecurringEditing(item); setRecurringModal(true); }} aria-label={`Edit ${item.name}`}><Pencil size={14} /></button><button className="danger" onClick={() => setDeleteTarget({ kind: "recurring", id: item.id, name: item.name })} aria-label={`Delete ${item.name}`}><Trash2 size={14} /></button></span><button className={item.active ? "toggle active" : "toggle"} disabled={savingAction !== null} onClick={() => toggleRecurring(item.id)} aria-label={`${item.active ? "Pause" : "Resume"} ${item.name}`} aria-pressed={item.active}><i /></button></div>)}{recurring.length === 0 && <p className="empty-state">Add your first recurring expense to build a payment schedule.</p>}</div></article><aside className="panel upcoming-total"><p className="eyebrow">Next cycle</p><h2>Recurring total</h2><strong>{currency(recurringTotal)}</strong><div className="upcoming-visual"><Repeat2 size={40} /><span>{activeRecurring.length} payment{activeRecurring.length === 1 ? "" : "s"}<br />scheduled</span></div><p>That&apos;s {totals.income ? (recurringTotal / totals.income * 100).toFixed(1) : "0.0"}% of your monthly income.</p></aside></section>}

        {activePage === "Reports" && <section className="reports-grid"><article className="panel report-chart"><div className="panel-title-row"><div><p className="eyebrow">Net cash flow</p><h2>Financial performance</h2></div><select value={reportRange} onChange={(event) => { const nextRange = Number(event.target.value) as ReportRange; if (reportRangeOptions.includes(nextRange)) setReportRange(nextRange); }} aria-label="Report period">{reportRangeOptions.map((months) => <option key={months} value={months}>{months} {months === 1 ? "month" : "months"}</option>)}</select></div><div className="report-kpis"><span><small>Total income</small><strong>{currency(reportTotals.income * 1000, true)}</strong><em>{reportRangeLabel}</em></span><span><small>Total spent</small><strong>{currency(reportTotals.spending * 1000, true)}</strong><em>{Math.round(reportTotals.spending / Math.max(reportTotals.income, 1) * 100)}% of income</em></span><span><small>Net saved</small><strong>{currency((reportTotals.income - reportTotals.spending) * 1000, true)}</strong><em>Cash-flow gap</em></span></div><div className="report-area"><ResponsiveContainer width="100%" height="100%"><AreaChart data={reportData}><defs><linearGradient id="reportFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b5f300" stopOpacity={0.45} /><stop offset="100%" stopColor="#b5f300" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#e5e8df" /><XAxis dataKey="month" axisLine={false} tickLine={false} /><YAxis hide /><Tooltip content={<ChartTooltip />} /><Area type="monotone" dataKey="income" stroke="#8cc000" fill="url(#reportFill)" strokeWidth={3} /><Area type="monotone" dataKey="spending" stroke="#171816" fill="transparent" strokeWidth={2} /></AreaChart></ResponsiveContainer></div></article><article className="panel category-card"><p className="eyebrow">Current breakdown</p><h2>Spending by category</h2><div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categoryData} dataKey="value" innerRadius="63%" outerRadius="88%" paddingAngle={3} stroke="none">{categoryData.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip formatter={(value) => `${value}%`} /></PieChart></ResponsiveContainer><div><strong>{currency(totals.expenses, true)}</strong><span>total spent</span></div></div><div className="category-legend">{categoryData.map((item) => <span key={item.name}><i style={{ background: item.color }} />{item.name}<strong>{item.value}%</strong></span>)}</div></article></section>}

        {activePage === "Insights" && <section className="insights-layout"><article className="hero-insight"><span className="spark"><Sparkles size={22} /></span><button className="hero-action" onClick={refreshTips} disabled={tipsLoading || savingAction !== null}>{tipsLoading ? <LoaderCircle className="spin" size={15} /> : <RefreshCw size={15} />}{tipsLoading ? "Refreshing..." : "Refresh tips"}</button><p className="eyebrow">Your weekly money brief</p><h2>Your current cash-flow gap is <u>{currency(monthlyGap, true)}</u>.</h2><p>Pera reviews your spending rhythm, recurring charges, and current budget pace to suggest practical next moves.</p></article><div className="insight-list"><article className="panel insight-detail"><span className="insight-number">01</span><div><p className="eyebrow">Subscription check</p><h2>{smartTips[0]?.title}</h2><p>{smartTips[0]?.body}</p><button onClick={() => changePage("Recurring")}>Review subscriptions <ArrowRight size={14} /></button></div></article><article className="panel insight-detail"><span className="insight-number">02</span><div><p className="eyebrow">Dining pattern</p><h2>{smartTips[1]?.title}</h2><p>{smartTips[1]?.body}</p><button disabled={!dataReady || savingAction !== null} onClick={toggleSmartRule}>{savingAction === "smart-rule" ? <><LoaderCircle className="spin" size={14} />Saving...</> : smartRule ? <><Check size={14} />Rule active</> : <>Create smart rule <ArrowRight size={14} /></>}</button></div></article><article className="panel insight-detail"><span className="insight-number">03</span><div><p className="eyebrow">Cash buffer</p><h2>{monthlyGap > 0 ? "Your balance can work harder" : "Build your first cash-flow gap"}</h2><p>{monthlyGap > 0 ? "Moving a safe part of this month’s surplus can grow your emergency fund without affecting scheduled bills." : "Add your real income and expenses to see how much is available for savings."}</p><button disabled={!dataReady || monthlyGap <= 0} onClick={() => setTransferModal(true)}>Plan transfer <ArrowRight size={14} /></button></div></article></div></section>}
        </div>
      </section>

      {transactionModal && <Modal id="transaction-title" eyebrow={transactionEditing ? "Update activity" : "New activity"} title={transactionEditing ? "Edit transaction" : "Add transaction"} onClose={() => { setTransactionModal(false); setTransactionEditing(null); }}><form key={transactionEditing?.id ?? "new-transaction"} onSubmit={saveTransaction}><label>Type<select name="type" value={transactionDraftType} onChange={(event) => setTransactionDraftType(event.target.value as TransactionType)}><option value="EXPENSE">Expense</option><option value="INCOME">Income</option><option value="SAVINGS">Savings</option></select></label><label><span>{transactionDraftType === "INCOME" ? "Deposit to" : transactionDraftType === "SAVINGS" ? "Save from" : "Pay from"}</span><select name="accountId" defaultValue={transactionEditing?.accountId ?? firstAccountId} required><option value="" disabled>{accounts.length ? "Select an account" : "Create an account first"}</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {exactCurrency(account.balance)}</option>)}</select></label>{transactionDraftType === "SAVINGS" ? <label>Destination<select name="savingsGoalId" defaultValue={transactionEditing?.savingsGoalId ?? firstSavingsGoalId} required><option value="" disabled>{savingsGoals.length ? "Select a savings destination" : "Create a savings goal first"}</option>{savingsGoals.map((goal) => <option key={goal.id} value={goal.id}>{goal.name}</option>)}</select></label> : <label><span>{transactionDraftType === "INCOME" ? "Income source" : "Merchant or source"}</span><input key={`${transactionDraftType}-merchant`} name="merchant" defaultValue={transactionEditing?.type === transactionDraftType ? transactionEditing.merchant : transactionDraftType === "INCOME" ? "Salary" : ""} placeholder={transactionDraftType === "INCOME" ? "Salary" : "e.g. SM Supermarket"} required /></label>}<div className="form-row"><label>Amount<input name="amount" type="number" min="0.01" step="0.01" defaultValue={transactionEditing?.amount} placeholder="0.00" required /></label><label>Date<input name="bookedAt" type="date" defaultValue={transactionEditing?.bookedAt ?? dateInputValue()} required /></label></div>{transactionDraftType === "EXPENSE" && <><label>Category<select name="categoryId" defaultValue={transactionEditing?.categoryId ?? firstCategoryId} required><option value="" disabled>{categories.length ? "Select a category" : "Add a category first"}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="check-row"><input name="countsTowardBudget" type="checkbox" defaultChecked={transactionEditing?.type === "EXPENSE" ? transactionEditing.countsTowardBudget : true} /><span><strong>Count toward monthly budget</strong><small>Turn this off only for an expense you do not want included in this month’s spending limit.</small></span></label></>}<button className="primary-button" type="submit" disabled={savingAction !== null || accounts.length === 0 || (transactionDraftType === "EXPENSE" && categories.length === 0) || (transactionDraftType === "SAVINGS" && savingsGoals.length === 0)}>{savingAction === "transaction" ? <><LoaderCircle className="spin" size={16} />Saving...</> : transactionEditing ? "Save changes" : transactionDraftType === "SAVINGS" ? "Add to savings" : "Save transaction"}</button></form></Modal>}

      {savingsModal && <Modal id="savings-title" eyebrow="Savings destination" title={savingsEditing ? `Edit ${savingsEditing.name}` : "Create savings goal"} onClose={() => { setSavingsModal(false); setSavingsEditing(null); }} className="savings-modal"><form key={savingsEditing?.id ?? "new-savings"} onSubmit={saveSavingsGoal}><label>Savings name<input name="name" defaultValue={savingsEditing?.name ?? ""} placeholder="e.g. Emergency savings" required /></label><div className="form-row savings-target-fields"><label><span className="field-label-row">Target amount <small>Optional</small></span><input name="targetAmount" type="number" min="1" step="0.01" defaultValue={savingsEditing?.targetAmount ?? ""} placeholder="No target" /></label><label><span className="field-label-row">Target date <small>Optional</small></span><input name="targetDate" type="date" defaultValue={savingsEditing?.targetDate ?? ""} /></label></div><label>Goal color<span className="color-field"><input name="color" type="color" defaultValue={savingsEditing?.color ?? "#b5f300"} /><small>Used on your savings progress card</small></span></label>{savingsEditing && <p className="form-help">Your saved amount stays unchanged when you edit this goal.</p>}<button className="primary-button" type="submit" disabled={savingAction !== null}>{savingAction === "savings" ? <><LoaderCircle className="spin" size={16} />Saving...</> : savingsEditing ? "Save goal changes" : "Create savings goal"}</button></form></Modal>}

      {recurringModal && <Modal id="recurring-title" eyebrow="Payment schedule" title={recurringEditing ? "Edit recurring expense" : "Add recurring expense"} onClose={() => { setRecurringModal(false); setRecurringEditing(null); }}><form key={recurringEditing?.id ?? "new-recurring"} onSubmit={saveRecurring}><label>Name<input name="name" defaultValue={recurringEditing?.name ?? ""} placeholder="e.g. Internet plan" required /></label><label>Pay from<select name="accountId" defaultValue={recurringEditing?.accountId ?? firstAccountId} required><option value="" disabled>{accounts.length ? "Select an account" : "Create an account first"}</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {exactCurrency(account.balance)}</option>)}</select></label><div className="form-row"><label>Amount<input name="amount" type="number" min="0.01" step="0.01" defaultValue={recurringEditing?.amount} required /></label><label>Next due date<input name="nextDueAt" type="date" defaultValue={recurringEditing?.nextDueAt ?? dateInputValue()} required /></label></div><div className="form-row"><label>Category<select name="categoryId" defaultValue={recurringEditing?.categoryId ?? firstCategoryId} required><option value="" disabled>{categories.length ? "Select a category" : "Add a category first"}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Frequency<select name="frequency" defaultValue={recurringEditing?.frequency ?? "MONTHLY"}><option value="WEEKLY">Weekly</option><option value="BIWEEKLY">Every two weeks</option><option value="MONTHLY">Monthly</option><option value="QUARTERLY">Quarterly</option><option value="YEARLY">Yearly</option></select></label></div><button className="primary-button" type="submit" disabled={savingAction !== null || accounts.length === 0 || categories.length === 0}>{savingAction === "recurring" ? <><LoaderCircle className="spin" size={16} />Saving...</> : recurringEditing ? "Save recurring changes" : "Add to schedule"}</button></form></Modal>}

      {recurringPayment && recurringPaymentStep === "ASK" && <Modal id="recurring-payment-title" eyebrow={daysUntilDate(recurringPayment.nextDueAt) < 0 ? "Payment overdue" : "Payment due today"} title={`Did you pay ${recurringPayment.name}?`} onClose={dismissRecurringPayment} className="recurring-payment-modal"><div className="due-payment-summary"><MerchantIcon label={recurringPayment.name} tone={recurringPayment.tone} /><div><small>Scheduled for {recurringPayment.due}</small><strong>{exactCurrency(recurringPayment.amount)}</strong><span>{recurringPayment.category} · {frequencyLabel[recurringPayment.frequency]}</span></div></div><p className="due-payment-copy">Choose yes to record the expense and select where the payment came from. “Not yet” keeps it overdue, while skip advances the schedule without creating a transaction.</p><div className="due-payment-actions"><button type="button" className="cancel-button" disabled={savingAction !== null} onClick={dismissRecurringPayment}>Not yet</button><button type="button" className="skip-button" disabled={savingAction !== null} onClick={skipRecurringPayment}>{savingAction === "recurring-skip" ? <><LoaderCircle className="spin" size={14} />Skipping...</> : "Skip this due date"}</button><button type="button" className="primary-button" disabled={savingAction !== null || accounts.length === 0} onClick={() => setRecurringPaymentStep("PAY")}>Yes, I paid</button></div></Modal>}

      {recurringPayment && recurringPaymentStep === "PAY" && <Modal id="recurring-payment-details-title" eyebrow="Record payment" title={`Pay ${recurringPayment.name}`} onClose={dismissRecurringPayment} className="recurring-payment-modal"><form onSubmit={saveRecurringPayment}><div className="due-payment-summary"><MerchantIcon label={recurringPayment.name} tone={recurringPayment.tone} /><div><small>Due {recurringPayment.due}</small><strong>{exactCurrency(recurringPayment.amount)}</strong><span>The next due date updates only after this saves.</span></div></div><label>Paid from<select name="accountId" defaultValue={recurringPayment.accountId} required><option value="" disabled>Select the payment account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {exactCurrency(account.balance)}</option>)}</select></label><div className="form-row"><label>Amount<input name="amount" type="number" min="0.01" step="0.01" defaultValue={recurringPayment.amount} required /></label><label>Payment date<input name="paidAt" type="date" defaultValue={dateInputValue()} required /></label></div><label className="check-row"><input name="countsTowardBudget" type="checkbox" defaultChecked /><span><strong>Count toward monthly budget</strong><small>This expense will be included in this month’s spending limit.</small></span></label><div className="due-payment-form-actions"><button type="button" className="cancel-button" disabled={savingAction !== null} onClick={() => setRecurringPaymentStep("ASK")}><ArrowRight className="back-arrow" size={14} />Back</button><button className="primary-button" type="submit" disabled={savingAction !== null || accounts.length === 0}>{savingAction === "recurring-payment" ? <><LoaderCircle className="spin" size={16} />Recording...</> : "Record payment"}</button></div></form></Modal>}

      {accountModal && <Modal id="account-title" eyebrow="Money location" title={accountEditing ? `Edit ${accountEditing.name}` : "Add an account"} onClose={() => { setAccountModal(false); setAccountEditing(null); }}><form key={accountEditing?.id ?? "new-account"} onSubmit={saveAccount}><label>Account name<input name="name" defaultValue={accountEditing?.name ?? ""} placeholder="e.g. Cash on Hand, Maya, Metrobank" required /></label><label>Account type<select name="type" defaultValue={accountEditing?.type ?? "CASH"}><option value="CASH">Cash</option><option value="E_WALLET">E-wallet</option><option value="CHECKING">Bank account</option><option value="SAVINGS">Savings account</option><option value="CREDIT_CARD">Credit card</option></select></label><label>Opening balance<input name="openingBalance" type="number" step="0.01" defaultValue={accountEditing?.openingBalance ?? 0} required /></label>{accountEditing && <p className="form-help">Changing the opening balance adjusts the account’s calculated balance while preserving transaction history.</p>}<button className="primary-button" type="submit" disabled={savingAction !== null}>{savingAction === "account" ? <><LoaderCircle className="spin" size={16} />Saving...</> : accountEditing ? "Save account changes" : "Add account"}</button></form></Modal>}

      {accountAction && <Modal id="account-action-title" eyebrow={accountTypeLabel[accountAction.account.type]} title={accountAction.mode === "TRANSFER" ? `Transfer from ${accountAction.account.name}` : `${accountAction.mode === "ADD" ? "Add to" : "Subtract from"} ${accountAction.account.name}`} onClose={() => setAccountAction(null)}><form key={`${accountAction.account.id}-${accountAction.mode}`} onSubmit={saveAccountAction}><div className="transfer-summary"><AccountIcon type={accountAction.account.type} /><div><small>Current balance</small><strong>{exactCurrency(accountAction.account.balance)}</strong></div></div>{accountAction.mode === "TRANSFER" && <label>Transfer to<select name="toAccountId" defaultValue={accounts.find((item) => item.id !== accountAction.account.id)?.id ?? ""} required><option value="" disabled>Select another account</option>{accounts.filter((item) => item.id !== accountAction.account.id).map((account) => <option key={account.id} value={account.id}>{account.name} · {exactCurrency(account.balance)}</option>)}</select></label>}<div className="form-row"><label>Amount<input name="amount" type="number" min="0.01" step="0.01" placeholder="0.00" required /></label><label>Date<input name="occurredAt" type="date" defaultValue={dateInputValue()} required /></label></div><label>Note <small>Optional</small><input name="note" placeholder={accountAction.mode === "TRANSFER" ? "e.g. Move funds to Maya" : "e.g. Correct counted cash"} /></label><p className="form-help">{accountAction.mode === "TRANSFER" ? "Transfers move money between your accounts without changing income, spending, savings, or budget totals." : "Use balance adjustments for corrections. Record real income and expenses from the Transactions page so reports stay accurate."}</p><button className="primary-button" type="submit" disabled={savingAction !== null || (accountAction.mode === "TRANSFER" && accounts.length < 2)}>{savingAction === "account-action" ? <><LoaderCircle className="spin" size={16} />Saving...</> : accountAction.mode === "TRANSFER" ? "Complete transfer" : "Update balance"}</button></form></Modal>}

      {budgetModal && <Modal id="budget-title" eyebrow="This month" title={monthlyBudget ? "Edit monthly budget" : "Set monthly budget"} onClose={() => setBudgetModal(false)}><form onSubmit={saveMonthlyBudget}><div className="transfer-summary"><WalletCards size={24} /><div><small>Budgeted spending so far</small><strong>{exactCurrency(totalSpent)}</strong></div></div><label>Monthly spending limit<input name="limit" type="number" min="0.01" step="0.01" defaultValue={monthlyBudget ?? ""} placeholder="e.g. 50000" required /></label><p className="form-help">Expenses count against this limit by default. Your budget tracks spending but does not hold or deduct money from an account.</p><button className="primary-button" type="submit" disabled={savingAction !== null}>{savingAction === "budget" ? <><LoaderCircle className="spin" size={16} />Saving...</> : "Save monthly budget"}</button></form></Modal>}

      {categoryModal && <Modal id="category-title" eyebrow="Organize your records" title="Manage categories" onClose={() => { setCategoryModal(false); setCategoryEditing(null); }} className="category-modal"><div className="category-editor"><div className="category-editor-heading"><span className="category-editor-icon"><Tags size={18} /></span><div><strong>{categoryEditing ? "Edit category" : "Create a category"}</strong><small>Categories are used for expenses, recurring payments, and reports.</small></div></div><form key={categoryEditing?.id ?? "new-category"} onSubmit={saveCategory}><label>Category name<input name="name" defaultValue={categoryEditing?.name ?? ""} placeholder="e.g. Groceries" required /></label><label>Category color<span className="color-field"><input name="color" type="color" defaultValue={categoryEditing?.color ?? "#b5f300"} /><small>Used in spending reports</small></span></label><div className="category-form-actions">{categoryEditing && <button className="cancel-button" type="button" disabled={savingAction !== null} onClick={() => setCategoryEditing(null)}>Cancel edit</button>}<button className="primary-button" type="submit" disabled={savingAction !== null}>{savingAction === "category" ? <><LoaderCircle className="spin" size={16} />Saving...</> : categoryEditing ? "Save category" : "Add category"}</button></div></form></div><div className="category-list-heading"><div><strong>Your categories</strong><small>Use the actions to rename, recolor, or delete.</small></div><span>{categories.length}</span></div><div className="category-manager-list">{categories.map((category) => <div className="category-manager-row" key={category.id}><i style={{ background: category.color }} /><span><strong>{category.name}</strong><small>Expense category</small></span><div className="row-actions"><button type="button" disabled={savingAction !== null} onClick={() => setCategoryEditing(category)} aria-label={`Edit ${category.name}`}><Pencil size={14} /></button><button type="button" className="danger" disabled={savingAction !== null} onClick={() => setDeleteTarget({ kind: "category", id: category.id, name: `${category.name} category` })} aria-label={`Delete ${category.name}`}><Trash2 size={14} /></button></div></div>)}{categories.length === 0 && <p className="empty-state compact">No categories yet. Add your first category above.</p>}</div></Modal>}

      {deleteTarget && <Modal id="delete-title" eyebrow="Confirm deletion" title={`Delete ${deleteTarget.name}?`} onClose={() => setDeleteTarget(null)} className="confirm-modal"><div className="delete-warning"><Trash2 size={22} /><p>{deleteTarget.kind === "category" ? "Transactions and recurring expenses will remain but become uncategorized." : deleteTarget.kind === "savings" ? "Savings transactions will remain in your activity, but they will no longer belong to this destination." : deleteTarget.kind === "account" ? "Accounts with financial history are archived to keep past balances accurate. Reassign recurring expenses first." : "This removes the item from your dashboard and cannot be undone."}</p></div><div className="modal-actions"><button type="button" className="cancel-button" disabled={savingAction === "delete"} onClick={() => setDeleteTarget(null)}>Cancel</button><button type="button" className="delete-button" disabled={savingAction !== null} onClick={confirmDelete}>{savingAction === "delete" ? <><LoaderCircle className="spin" size={15} />Deleting...</> : <><Trash2 size={15} />Delete</>}</button></div></Modal>}

      {transferModal && <Modal id="transfer-title" eyebrow="Savings goal" title="Plan savings transfer" onClose={() => setTransferModal(false)}><form onSubmit={planTransfer}><div className="transfer-summary"><PiggyBank size={24} /><div><small>Available cash-flow gap</small><strong>{currency(monthlyGap)}</strong></div></div><label>Save from<select name="accountId" defaultValue={firstAccountId} required><option value="" disabled>{accounts.length ? "Select a source account" : "Create an account first"}</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {exactCurrency(account.balance)}</option>)}</select></label><label>Destination<select name="savingsGoalId" defaultValue={firstSavingsGoalId} required><option value="" disabled>{savingsGoals.length ? "Select a savings destination" : "Create a savings goal first"}</option>{savingsGoals.map((goal) => <option key={goal.id} value={goal.id}>{goal.name}</option>)}</select></label><label>Amount<input name="amount" type="number" min="0.01" step="0.01" max={Math.max(0.01, monthlyGap)} defaultValue={Math.min(2091, Math.max(0.01, monthlyGap))} required /></label><p className="form-help">This moves money from the selected account into the savings destination without counting it as spending.</p><button className="primary-button" type="submit" disabled={savingAction !== null || accounts.length === 0 || savingsGoals.length === 0}>{savingAction === "transfer" ? <><LoaderCircle className="spin" size={16} />Saving...</> : "Add savings transfer"}</button></form></Modal>}

      {settingsModal && <Modal id="settings-title" eyebrow="Your account" title="Profile settings" onClose={() => setSettingsModal(false)}><form onSubmit={saveSettings}><div className="profile-summary"><span className="profile-avatar"><UserRound size={22} /></span><div><strong>{userEmail}</strong><small>Signed in with Supabase</small></div></div><label>Display name<input name="displayName" defaultValue={settings.displayName} required /></label><label>Monthly savings target<input name="monthlyTarget" type="number" min="1000" step="500" defaultValue={settings.monthlyTarget} required /></label><label className="check-row"><input name="budgetAlerts" type="checkbox" defaultChecked={settings.budgetAlerts} aria-label="Enable spending alerts" /><span><strong>Spending alerts</strong><small>Show a reminder as expenses approach this month’s budget.</small></span></label><button className="primary-button" type="submit" disabled={!dataReady || savingAction !== null}>{savingAction === "settings" ? <><LoaderCircle className="spin" size={16} />Saving...</> : "Save settings"}</button></form></Modal>}

      {notificationsModal && <Modal id="notifications-title" eyebrow="Stay on track" title="Notifications" onClose={() => setNotificationsModal(false)} className="notifications-modal"><div className="notification-list">{notificationItems.length ? notificationItems.map((item) => <article key={item.key}><span><Bell size={15} /></span><div><strong>{item.title}</strong><p>{item.body}</p></div></article>) : <p className="empty-state compact">You&apos;re all caught up.</p>}</div>{notificationPermission !== "granted" && <button className="device-reminder-button" type="button" onClick={enableDeviceNotifications}><Bell size={15} />Enable device reminders</button>}<button className="primary-button" onClick={() => { setNotificationsRead(true); setNotificationsModal(false); notify("Notifications marked as read"); }}>Mark all as read</button></Modal>}

      {toast && <div className="toast" role="status"><Check size={16} />{toast}</div>}
    </main>
  );
}

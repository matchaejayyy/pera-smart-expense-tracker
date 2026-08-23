"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ArrowDownLeft, ArrowRight, ArrowUpRight, BarChart3, Bell, CalendarClock,
  Check, ChevronDown, Home, Lightbulb, PiggyBank, Plus, ReceiptText,
  Repeat2, Search, Settings, Sparkles, Target, TrendingUp, X,
} from "lucide-react";

type Page = "Overview" | "Transactions" | "Budgets" | "Recurring" | "Reports" | "Insights";
type TransactionType = "EXPENSE" | "INCOME" | "SAVINGS";
type Transaction = { id: number; merchant: string; category: string; date: string; amount: number; type: TransactionType; tone: string };

const initialTransactions: Transaction[] = [
  { id: 1, merchant: "Grocerly Market", category: "Groceries", date: "Aug 22 · 6:40 PM", amount: 2485, type: "EXPENSE", tone: "mint" },
  { id: 2, merchant: "Salary deposit", category: "Income", date: "Aug 21 · 9:00 AM", amount: 72000, type: "INCOME", tone: "lime" },
  { id: 3, merchant: "Meralco", category: "Utilities", date: "Aug 20 · 2:12 PM", amount: 3240, type: "EXPENSE", tone: "peach" },
  { id: 4, merchant: "Grab", category: "Transport", date: "Aug 19 · 8:14 PM", amount: 486, type: "EXPENSE", tone: "lilac" },
  { id: 5, merchant: "BPI Save Up", category: "Savings", date: "Aug 18 · 8:00 AM", amount: 12000, type: "SAVINGS", tone: "blue" },
  { id: 6, merchant: "Netflix", category: "Subscriptions", date: "Aug 16 · 12:01 AM", amount: 549, type: "EXPENSE", tone: "rose" },
  { id: 7, merchant: "Wildflour", category: "Dining", date: "Aug 15 · 1:24 PM", amount: 1860, type: "EXPENSE", tone: "yellow" },
  { id: 8, merchant: "Freelance project", category: "Income", date: "Aug 12 · 4:30 PM", amount: 20000, type: "INCOME", tone: "lime" },
];

const cashFlowData = [
  { month: "Mar", income: 68, spending: 42 }, { month: "Apr", income: 78, spending: 49 },
  { month: "May", income: 74, spending: 45 }, { month: "Jun", income: 86, spending: 56 },
  { month: "Jul", income: 81, spending: 39 }, { month: "Aug", income: 92, spending: 41.3 },
];

const categoryData = [
  { name: "Housing", value: 32, color: "#151613" }, { name: "Food", value: 24, color: "#b5f300" },
  { name: "Transport", value: 17, color: "#a9b3a2" }, { name: "Bills", value: 15, color: "#d8c8ef" },
  { name: "Other", value: 12, color: "#efc9aa" },
];

const initialBudgets = [
  { name: "Groceries", spent: 8240, limit: 12000, color: "#b5f300" },
  { name: "Dining out", spent: 4160, limit: 8000, color: "#d8c8ef" },
  { name: "Transport", spent: 6280, limit: 7500, color: "#efc9aa" },
  { name: "Entertainment", spent: 2350, limit: 5000, color: "#a9d9c2" },
];

const initialRecurring = [
  { id: 1, name: "Netflix", category: "Entertainment", amount: 549, due: "Aug 28", active: true, tone: "rose" },
  { id: 2, name: "Spotify", category: "Entertainment", amount: 149, due: "Sep 02", active: true, tone: "mint" },
  { id: 3, name: "Converge", category: "Utilities", amount: 1599, due: "Sep 05", active: true, tone: "blue" },
  { id: 4, name: "Gym membership", category: "Health", amount: 2200, due: "Sep 08", active: false, tone: "yellow" },
];

const pageMeta: Record<Page, { eyebrow: string; title: string }> = {
  Overview: { eyebrow: "Sunday, 23 August", title: "Good evening, Elmor" },
  Transactions: { eyebrow: "Money in, money out", title: "Transactions" },
  Budgets: { eyebrow: "Plan every peso", title: "Budgets" },
  Recurring: { eyebrow: "Never miss a due date", title: "Recurring expenses" },
  Reports: { eyebrow: "Your money story", title: "Monthly reports" },
  Insights: { eyebrow: "Personalized for you", title: "Pera AI insights" },
};

const currency = (value: number, compact = false) => new Intl.NumberFormat("en-PH", {
  style: "currency", currency: "PHP", maximumFractionDigits: compact ? 0 : 2, notation: compact ? "compact" : "standard",
}).format(value);

function MerchantIcon({ label, tone }: { label: string; tone: string }) {
  return <span className={`merchant-icon ${tone}`} aria-hidden="true">{label.slice(0, 1).toUpperCase()}</span>;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip"><strong>{label}</strong>{payload.map((item) => <span key={item.name}><i style={{ background: item.color }} />{item.name}: {currency(item.value * 1000, true)}</span>)}</div>;
}

export function Dashboard() {
  const [activePage, setActivePage] = useState<Page>("Overview");
  const [transactions, setTransactions] = useState(initialTransactions);
  const [budgets, setBudgets] = useState(initialBudgets);
  const [recurring, setRecurring] = useState(initialRecurring);
  const [transactionModal, setTransactionModal] = useState(false);
  const [budgetModal, setBudgetModal] = useState<number | null>(null);
  const [budgetDraft, setBudgetDraft] = useState(12000);
  const [transactionFilter, setTransactionFilter] = useState("All");
  const [reportRange, setReportRange] = useState("6 months");
  const [toast, setToast] = useState<string | null>(null);
  const [smartRule, setSmartRule] = useState(false);

  const totals = useMemo(() => {
    const income = transactions.filter((item) => item.type === "INCOME").reduce((sum, item) => sum + item.amount, 0);
    const expenses = transactions.filter((item) => item.type === "EXPENSE").reduce((sum, item) => sum + item.amount, 0);
    const savings = transactions.filter((item) => item.type === "SAVINGS").reduce((sum, item) => sum + item.amount, 0) + Math.max(0, income - expenses - 29000);
    return { income, expenses, savings, balance: 184520 + income - 92000 - (expenses - 8860) };
  }, [transactions]);

  const navItems: Array<{ label: Page; icon: typeof Home }> = [
    { label: "Overview", icon: Home }, { label: "Transactions", icon: ReceiptText }, { label: "Budgets", icon: Target },
    { label: "Recurring", icon: Repeat2 }, { label: "Reports", icon: BarChart3 }, { label: "Insights", icon: Sparkles },
  ];

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(null), 2600); };

  const addTransaction = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const type = String(data.get("type")) as TransactionType;
    const merchant = String(data.get("merchant"));
    const amount = Number(data.get("amount"));
    const category = String(data.get("category"));
    setTransactions((current) => [{ id: Date.now(), merchant, category, amount, type, date: "Just now", tone: type === "INCOME" ? "lime" : type === "SAVINGS" ? "blue" : "peach" }, ...current]);
    setTransactionModal(false);
    notify(`${merchant} was added`);
  };

  const updateBudget = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (budgetModal === null) return;
    setBudgets((items) => items.map((item, index) => index === budgetModal ? { ...item, limit: budgetDraft } : item));
    setBudgetModal(null);
    notify("Budget limit updated");
  };

  const filteredTransactions = transactionFilter === "All" ? transactions : transactions.filter((item) => item.type === transactionFilter);
  const totalBudget = budgets.reduce((sum, item) => sum + item.limit, 0) + 17500;
  const totalSpent = budgets.reduce((sum, item) => sum + item.spent, 0) + 10390;
  const budgetPercent = Math.round(totalSpent / totalBudget * 100);

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <button className="brand-mark" onClick={() => setActivePage("Overview")} aria-label="Pera home">P</button>
        <nav>{navItems.map(({ label, icon: Icon }) => <button key={label} className={activePage === label ? "nav-item active" : "nav-item"} onClick={() => setActivePage(label)} aria-label={label}><Icon size={21} strokeWidth={2} /><small>{label}</small></button>)}</nav>
        <button className="nav-item settings" aria-label="Settings" onClick={() => notify("Settings are ready for your Supabase profile")}><Settings size={21} /><small>Settings</small></button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div><p className="eyebrow">{pageMeta[activePage].eyebrow}</p><h1>{pageMeta[activePage].title}</h1></div>
          <div className="header-actions"><span className="demo-badge"><i />Demo data</span><button className="add-button" onClick={() => setTransactionModal(true)}><Plus size={17} />Add transaction</button><button className="icon-button" aria-label="Notifications" onClick={() => notify("You're all caught up")}><Bell size={18} /><i /></button><button className="avatar" aria-label="Open Elmor's profile" onClick={() => notify("Profile syncs with Supabase Auth")}>EC</button></div>
        </header>

        {activePage === "Overview" && <>
          <section className="summary-grid" aria-label="Financial summary">
            <article className="summary-card balance-card"><div className="card-heading"><span>Total balance</span><span className="trend up"><TrendingUp size={12} />8.2%</span></div><strong>{currency(totals.balance)}</strong><p>Across 3 active accounts</p></article>
            <article className="summary-card"><div className="card-heading"><span>Income</span><span className="summary-icon income"><ArrowDownLeft size={15} /></span></div><strong>{currency(totals.income, true)}</strong><p>This month</p></article>
            <article className="summary-card"><div className="card-heading"><span>Spent</span><span className="summary-icon expense"><ArrowUpRight size={15} /></span></div><strong>{currency(totals.expenses, true)}</strong><p>{Math.round(totals.expenses / totals.income * 100)}% of income</p></article>
            <article className="summary-card"><div className="card-heading"><span>Saved</span><span className="summary-icon saved"><PiggyBank size={15} /></span></div><strong>{currency(totals.savings, true)}</strong><p>{Math.round(totals.savings / totals.income * 100)}% savings rate</p></article>
          </section>

          <section className="dashboard-grid">
            <article className="panel spending-panel"><div className="panel-title-row"><div><p className="eyebrow">Cash flow</p><h2>Income vs. spending</h2></div><button className="period-pill" onClick={() => setActivePage("Reports")}>Last 6 months <ChevronDown size={13} /></button></div><div className="chart-legend"><span><i className="legend-dot lime" />Income</span><span><i className="legend-dot ink" />Spending</span></div><div className="cash-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={cashFlowData} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}><defs><linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b5f300" stopOpacity={0.34} /><stop offset="100%" stopColor="#b5f300" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#e5e8df" strokeDasharray="4 5" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#74776d", fontSize: 10 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#9a9d94", fontSize: 9 }} tickFormatter={(value) => `₱${value}k`} /><Tooltip content={<ChartTooltip />} /><Area type="monotone" dataKey="income" stroke="#94ca00" strokeWidth={2.5} fill="url(#incomeFill)" /><Area type="monotone" dataKey="spending" stroke="#171816" strokeWidth={2.5} fill="transparent" /></AreaChart></ResponsiveContainer></div></article>

            <article className="panel insight-card"><span className="spark"><Sparkles size={20} /></span><p className="eyebrow">Pera AI insight</p><h2>You&apos;re spending smarter.</h2><p>Your dining spend is 18% lower than last month. Keep this pace and you could add <strong>₱3,600</strong> to savings.</p><button onClick={() => setActivePage("Insights")}>See all insights <ArrowRight size={16} /></button></article>

            <article className="panel transactions-panel"><div className="panel-title-row"><div><p className="eyebrow">Latest activity</p><h2>Recent transactions</h2></div><button className="text-button" onClick={() => setActivePage("Transactions")}>View all <ArrowRight size={14} /></button></div><div className="transaction-list">{transactions.slice(0, 4).map((item) => <div className="transaction" key={item.id}><MerchantIcon label={item.merchant} tone={item.tone} /><span className="transaction-main"><strong>{item.merchant}</strong><small>{item.date} · {item.category}</small></span><strong className={item.type === "INCOME" ? "positive" : item.type === "SAVINGS" ? "saving" : ""}>{item.type === "INCOME" ? "+" : "−"}{currency(item.amount, true)}</strong></div>)}</div></article>

            <article className="panel budget-card"><div className="panel-title-row"><div><p className="eyebrow">August</p><h2>Monthly budget</h2></div><span className="budget-percent">{budgetPercent}%</span></div><div className="budget-ring" style={{ "--progress": `${budgetPercent}%` } as React.CSSProperties} aria-label={`${budgetPercent} percent of monthly budget used`}><div><strong>{currency(totalSpent, true)}</strong><span>of {currency(totalBudget, true)}</span></div></div><div className="budget-copy"><span><i className="legend-dot lime" />Spent {currency(totalSpent, true)}</span><span><i className="legend-dot pale" />Left {currency(totalBudget - totalSpent, true)}</span></div><button className="primary-button" onClick={() => setActivePage("Budgets")}>Manage budget</button></article>

            <article className="panel recurring-preview"><div className="panel-title-row"><div><p className="eyebrow">Coming up</p><h2>Recurring expenses</h2></div><button className="text-button" onClick={() => setActivePage("Recurring")}>See schedule <ArrowRight size={14} /></button></div><div className="recurring-row"><div className="recurring-date"><strong>28</strong><small>AUG</small></div><MerchantIcon label="Netflix" tone="rose" /><span><strong>Netflix</strong><small>Monthly subscription</small></span><strong>{currency(549, true)}</strong></div></article>
          </section>
        </>}

        {activePage === "Transactions" && <section className="page-grid transactions-page"><article className="panel wide-panel"><div className="toolbar"><div className="search-box"><Search size={16} /><input aria-label="Search transactions" placeholder="Search transactions" /></div><div className="filter-pills">{["All", "EXPENSE", "INCOME", "SAVINGS"].map((filter) => <button key={filter} onClick={() => setTransactionFilter(filter)} className={transactionFilter === filter ? "active" : ""}>{filter === "All" ? "All" : filter.toLowerCase()}</button>)}</div></div><div className="transaction-table"><div className="table-head"><span>Transaction</span><span>Category</span><span>Date</span><span>Amount</span></div>{filteredTransactions.map((item) => <div className="table-row" key={item.id}><span className="table-merchant"><MerchantIcon label={item.merchant} tone={item.tone} /><strong>{item.merchant}</strong></span><span>{item.category}</span><span>{item.date.split(" · ")[0]}</span><strong className={item.type === "INCOME" ? "positive" : item.type === "SAVINGS" ? "saving" : ""}>{item.type === "INCOME" ? "+" : "−"}{currency(item.amount)}</strong></div>)}</div></article><aside className="panel transaction-side"><p className="eyebrow">This month</p><h2>Activity snapshot</h2><div className="mini-stat"><span>Transactions</span><strong>{transactions.length}</strong></div><div className="mini-stat"><span>Average expense</span><strong>{currency(totals.expenses / transactions.filter((item) => item.type === "EXPENSE").length, true)}</strong></div><div className="mini-stat"><span>Largest expense</span><strong>{currency(Math.max(...transactions.filter((item) => item.type === "EXPENSE").map((item) => item.amount)), true)}</strong></div><button className="primary-button" onClick={() => setTransactionModal(true)}><Plus size={16} />Add transaction</button></aside></section>}

        {activePage === "Budgets" && <section className="page-grid budgets-page"><article className="panel wide-panel"><div className="section-intro"><div><p className="eyebrow">August plan</p><h2>{currency(totalSpent, true)} of {currency(totalBudget, true)} used</h2></div><span className="large-percent">{budgetPercent}%</span></div><div className="overall-progress"><i style={{ width: `${budgetPercent}%` }} /></div><div className="budget-list">{budgets.map((budget, index) => { const percent = Math.round(budget.spent / budget.limit * 100); return <div className="budget-item" key={budget.name}><div className="budget-item-head"><span><i style={{ background: budget.color }} />{budget.name}</span><button onClick={() => { setBudgetModal(index); setBudgetDraft(budget.limit); }}>Edit</button></div><div className="category-progress"><i style={{ width: `${Math.min(percent, 100)}%`, background: percent > 85 ? "#ff765f" : budget.color }} /></div><div className="budget-item-copy"><span>{currency(budget.spent, true)} spent</span><span>{currency(budget.limit - budget.spent, true)} left</span></div></div>; })}</div></article><aside className="panel budget-advice"><span className="spark dark"><Lightbulb size={20} /></span><p className="eyebrow">Smart budget tip</p><h2>Transport is close to its limit.</h2><p>You have {currency(1220, true)} left for 8 days. A daily cap of ₱152 will keep you on track.</p><button onClick={() => notify("Daily transport reminder created")}>Set daily reminder</button></aside></section>}

        {activePage === "Recurring" && <section className="page-grid recurring-page"><article className="panel wide-panel"><div className="panel-title-row"><div><p className="eyebrow">August–September</p><h2>Payment schedule</h2></div><button className="secondary-button" onClick={() => notify("Recurring expense form is ready to connect")}><Plus size={15} />Add recurring</button></div><div className="recurring-list">{recurring.map((item) => <div className="recurring-item" key={item.id}><div className="due-chip"><CalendarClock size={15} /><span><small>Due</small><strong>{item.due}</strong></span></div><MerchantIcon label={item.name} tone={item.tone} /><span className="transaction-main"><strong>{item.name}</strong><small>{item.category} · Monthly</small></span><strong>{currency(item.amount)}</strong><button className={item.active ? "toggle active" : "toggle"} onClick={() => setRecurring((items) => items.map((entry) => entry.id === item.id ? { ...entry, active: !entry.active } : entry))} aria-label={`${item.active ? "Pause" : "Resume"} ${item.name}`}><i /></button></div>)}</div></article><aside className="panel upcoming-total"><p className="eyebrow">Next 30 days</p><h2>Recurring total</h2><strong>{currency(recurring.filter((item) => item.active).reduce((sum, item) => sum + item.amount, 0))}</strong><div className="upcoming-visual"><Repeat2 size={40} /><span>4 payments<br />scheduled</span></div><p>That&apos;s 4.9% of your monthly income.</p></aside></section>}

        {activePage === "Reports" && <section className="reports-grid"><article className="panel report-chart"><div className="panel-title-row"><div><p className="eyebrow">Net cash flow</p><h2>Financial performance</h2></div><select value={reportRange} onChange={(event) => setReportRange(event.target.value)} aria-label="Report period"><option>6 months</option><option>12 months</option></select></div><div className="report-kpis"><span><small>Total income</small><strong>₱479k</strong><em>+12.4%</em></span><span><small>Total spent</small><strong>₱271k</strong><em>−4.1%</em></span><span><small>Net saved</small><strong>₱208k</strong><em>+22.8%</em></span></div><div className="report-area"><ResponsiveContainer width="100%" height="100%"><AreaChart data={cashFlowData}><defs><linearGradient id="reportFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b5f300" stopOpacity={0.45} /><stop offset="100%" stopColor="#b5f300" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#e5e8df" /><XAxis dataKey="month" axisLine={false} tickLine={false} /><YAxis hide /><Tooltip content={<ChartTooltip />} /><Area type="monotone" dataKey="income" stroke="#8cc000" fill="url(#reportFill)" strokeWidth={3} /><Area type="monotone" dataKey="spending" stroke="#171816" fill="transparent" strokeWidth={2} /></AreaChart></ResponsiveContainer></div></article><article className="panel category-card"><p className="eyebrow">August breakdown</p><h2>Spending by category</h2><div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categoryData} dataKey="value" innerRadius="63%" outerRadius="88%" paddingAngle={3} stroke="none">{categoryData.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip formatter={(value) => `${value}%`} /></PieChart></ResponsiveContainer><div><strong>{currency(totals.expenses, true)}</strong><span>total spent</span></div></div><div className="category-legend">{categoryData.map((item) => <span key={item.name}><i style={{ background: item.color }} />{item.name}<strong>{item.value}%</strong></span>)}</div></article></section>}

        {activePage === "Insights" && <section className="insights-layout"><article className="hero-insight"><span className="spark"><Sparkles size={22} /></span><p className="eyebrow">Your weekly money brief</p><h2>Three small moves could free up <u>₱6,240</u> next month.</h2><p>Pera analyzed your spending rhythm, recurring charges, and current budget pace.</p></article><div className="insight-list"><article className="panel insight-detail"><span className="insight-number">01</span><div><p className="eyebrow">Subscription check</p><h2>Two services overlap</h2><p>Netflix and another streaming charge both renewed this month. Reviewing one could save ₱549 monthly.</p><button onClick={() => setActivePage("Recurring")}>Review subscriptions <ArrowRight size={14} /></button></div></article><article className="panel insight-detail"><span className="insight-number">02</span><div><p className="eyebrow">Dining pattern</p><h2>Weekday spending is down</h2><p>You spent 18% less on weekday dining. Keep the streak for three more weeks to save around ₱3,600.</p><button onClick={() => { setSmartRule(!smartRule); notify(smartRule ? "Smart rule removed" : "Smart dining rule activated"); }}>{smartRule ? <><Check size={14} />Rule active</> : <>Create smart rule <ArrowRight size={14} /></>}</button></div></article><article className="panel insight-detail"><span className="insight-number">03</span><div><p className="eyebrow">Cash buffer</p><h2>Your balance can work harder</h2><p>Moving ₱2,091 from this month&apos;s surplus brings your emergency goal to 60% without affecting bills.</p><button onClick={() => notify("Savings transfer prepared")}>Plan transfer <ArrowRight size={14} /></button></div></article></div></section>}
      </section>

      {transactionModal && <div className="modal-backdrop" role="presentation"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="transaction-title"><div className="modal-head"><div><p className="eyebrow">New activity</p><h2 id="transaction-title">Add transaction</h2></div><button onClick={() => setTransactionModal(false)} aria-label="Close"><X size={18} /></button></div><form onSubmit={addTransaction}><label>Type<select name="type" defaultValue="EXPENSE"><option value="EXPENSE">Expense</option><option value="INCOME">Income</option><option value="SAVINGS">Savings</option></select></label><label>Merchant or source<input name="merchant" placeholder="e.g. SM Supermarket" required /></label><div className="form-row"><label>Amount<input name="amount" type="number" min="1" placeholder="0.00" required /></label><label>Category<select name="category" defaultValue="Groceries"><option>Groceries</option><option>Dining</option><option>Transport</option><option>Utilities</option><option>Income</option><option>Savings</option><option>Other</option></select></label></div><button className="primary-button" type="submit">Save transaction</button></form></div></div>}

      {budgetModal !== null && <div className="modal-backdrop" role="presentation"><div className="modal budget-modal" role="dialog" aria-modal="true" aria-labelledby="budget-title"><div className="modal-head"><div><p className="eyebrow">Monthly limit</p><h2 id="budget-title">Edit {budgets[budgetModal].name}</h2></div><button onClick={() => setBudgetModal(null)} aria-label="Close"><X size={18} /></button></div><form onSubmit={updateBudget}><div className="range-value">{currency(budgetDraft, true)}</div><input className="range" type="range" min="1000" max="30000" step="500" value={budgetDraft} onChange={(event) => setBudgetDraft(Number(event.target.value))} /><div className="range-labels"><span>₱1k</span><span>₱30k</span></div><button className="primary-button" type="submit">Update budget</button></form></div></div>}

      {toast && <div className="toast"><Check size={16} />{toast}</div>}
    </main>
  );
}

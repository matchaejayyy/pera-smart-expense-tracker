"use client";

import { memo } from "react";
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

const compactCurrencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
  notation: "compact",
});

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip"><strong>{label}</strong>{payload.map((item) => <span key={item.name}><i style={{ background: item.color }} />{item.name}: {compactCurrencyFormatter.format(item.value * 1000)}</span>)}</div>;
}

export const CashFlowChart = memo(function CashFlowChart({ data }: { data: Array<{ label: string; income: number; spending: number }> }) {
  return <ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}><defs><linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b5f300" stopOpacity={0.34} /><stop offset="100%" stopColor="#b5f300" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#e5e8df" strokeDasharray="4 5" /><XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={16} tick={{ fill: "#74776d", fontSize: 10 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#9a9d94", fontSize: 9 }} tickFormatter={(value) => `₱${value}k`} /><Tooltip content={<ChartTooltip />} /><Area type="monotone" dataKey="income" stroke="#94ca00" strokeWidth={2.5} fill="url(#incomeFill)" /><Area type="monotone" dataKey="spending" stroke="#171816" strokeWidth={2.5} fill="transparent" /></AreaChart></ResponsiveContainer>;
});

export const ReportAreaChart = memo(function ReportAreaChart({ data }: { data: Array<{ month: string; income: number; spending: number }> }) {
  return <ResponsiveContainer width="100%" height="100%"><AreaChart data={data}><defs><linearGradient id="reportFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b5f300" stopOpacity={0.45} /><stop offset="100%" stopColor="#b5f300" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#e5e8df" /><XAxis dataKey="month" axisLine={false} tickLine={false} /><YAxis hide /><Tooltip content={<ChartTooltip />} /><Area type="monotone" dataKey="income" stroke="#8cc000" fill="url(#reportFill)" strokeWidth={3} /><Area type="monotone" dataKey="spending" stroke="#171816" fill="transparent" strokeWidth={2} /></AreaChart></ResponsiveContainer>;
});

export const CategoryDonutChart = memo(function CategoryDonutChart({ data }: { data: Array<{ name: string; value: number; color: string }> }) {
  return <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" innerRadius="63%" outerRadius="88%" paddingAngle={3} stroke="none">{data.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip formatter={(value) => `${value}%`} /></PieChart></ResponsiveContainer>;
});

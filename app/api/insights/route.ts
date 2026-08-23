import { NextResponse } from "next/server";

type SpendingSummary = { dining?: number; diningLastMonth?: number; subscriptions?: number; monthlyIncome?: number; monthlySpend?: number };

export async function POST(request: Request) {
  const summary = await request.json() as SpendingSummary;
  const diningChange = summary.diningLastMonth ? Math.round(((summary.dining || 0) - summary.diningLastMonth) / summary.diningLastMonth * 100) : -18;
  const fallback = [
    { kind: "SPENDING_TREND", title: "Your weekday dining is trending down", body: `Dining is ${Math.abs(diningChange)}% lower than last month. Keep the pace to protect your savings goal.` },
    { kind: "CASH_FLOW", title: "You have room to save more", body: `Your current cash-flow gap is about ₱${Math.max(0, (summary.monthlyIncome || 92000) - (summary.monthlySpend || 41280)).toLocaleString("en-PH")}. Move a small part automatically after payday.` },
  ];

  const url = process.env.AI_INSIGHTS_API_URL;
  const key = process.env.AI_INSIGHTS_API_KEY;
  if (!url || !key) return NextResponse.json({ data: fallback, source: "smart-rules" });

  try {
    const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}` }, body: JSON.stringify({ task: "Generate two concise, actionable personal-finance insights in JSON.", summary }) });
    if (!response.ok) throw new Error("Insight provider failed");
    return NextResponse.json({ data: await response.json(), source: "ai" });
  } catch {
    return NextResponse.json({ data: fallback, source: "smart-rules" });
  }
}

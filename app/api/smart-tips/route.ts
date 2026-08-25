import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type SpendingSnapshot = {
  dining?: number;
  diningLastMonth?: number;
  subscriptions?: number;
  monthlyIncome?: number;
  monthlySpend?: number;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Server authentication is not configured." }, { status: 503 });
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return NextResponse.json({ error: "A valid signed-in session is required." }, { status: 401 });

  const summary = await request.json() as SpendingSnapshot;
  const diningChange = summary.diningLastMonth ? Math.round(((summary.dining || 0) - summary.diningLastMonth) / summary.diningLastMonth * 100) : 0;
  const cashFlowGap = Math.max(0, (summary.monthlyIncome || 0) - (summary.monthlySpend || 0));
  const fallback = [
    summary.diningLastMonth
      ? { kind: "SPENDING_TREND", title: diningChange <= 0 ? "Your dining spend is trending down" : "Your dining spend is trending up", body: `Dining changed by ${Math.abs(diningChange)}% from last month. Use that pattern when setting your next category limit.` }
      : { kind: "GET_STARTED", title: "Build your first spending pattern", body: "Record a few dining and grocery expenses to unlock a useful month-over-month comparison." },
    cashFlowGap > 0
      ? { kind: "CASH_FLOW", title: "You have room to save more", body: `Your current cash-flow gap is about ₱${cashFlowGap.toLocaleString("en-PH")}. Consider moving a small part after payday.` }
      : { kind: "GET_STARTED", title: "Add income to understand your cash flow", body: "Once income and expenses are recorded, Pera can calculate how much room you have to save." },
  ];

  const url = process.env.SMART_TIPS_API_URL;
  const key = process.env.SMART_TIPS_API_KEY;
  if (!url || !key) return NextResponse.json({ data: fallback, source: "smart-rules" });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ task: "Generate two concise, actionable personal-finance tips in JSON.", summary }),
    });
    if (!response.ok) throw new Error("Tips provider failed");
    return NextResponse.json({ data: await response.json(), source: "provider" });
  } catch {
    return NextResponse.json({ data: fallback, source: "smart-rules" });
  }
}

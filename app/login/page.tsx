import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, Check, PiggyBank, ShieldCheck, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{ mode?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) redirect("/dashboard");
  }

  return (
    <main className="auth-shell">
      <section className="auth-story">
        <Link className="auth-brand" href="/" aria-label="Back to Pera home"><span>P</span><strong>Pera</strong></Link>
        <div className="auth-story-copy">
          <p className="landing-kicker"><Sparkles size={14} />A clearer money routine</p>
          <h1>Know where your money goes—and where it can take you.</h1>
          <p>One secure account keeps your transactions, automatic monthly budget, recurring bills, and savings goals together.</p>
          <div className="auth-benefits">
            <span><Check size={15} />A monthly budget based on your income</span>
            <span><Check size={15} />Spending reports you can understand</span>
            <span><Check size={15} />Practical tips based on your activity</span>
          </div>
        </div>
        <div className="auth-mini-preview">
          <article><span className="feature-icon lime"><PiggyBank size={20} /></span><small>Saved this month</small><strong>₱21,240</strong></article>
          <article><span className="feature-icon lilac"><BarChart3 size={20} /></span><small>Income remaining</small><strong>37%</strong></article>
        </div>
        <p className="auth-security"><ShieldCheck size={15} />Secure access powered by Supabase</p>
      </section>

      <section className="auth-form-side">
        <div className="auth-mobile-brand"><Link className="auth-brand" href="/"><span>P</span><strong>Pera</strong></Link></div>
        <LoginForm initialMode={params.mode === "signup" ? "signup" : "login"} initialError={params.error} />
        <p className="auth-back"><Link href="/">← Back to the homepage</Link></p>
      </section>
    </main>
  );
}

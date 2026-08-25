import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  Check,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  WalletCards,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  if (supabase) {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user) redirect("/dashboard");
  }

  return (
    <main className="landing-shell">
      <nav className="landing-nav" aria-label="Main navigation">
        <Link className="landing-brand" href="/" aria-label="Pera home">
          <span>P</span>
          <strong>Pera</strong>
        </Link>
        <div className="landing-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#security">Security</a>
        </div>
        <div className="landing-actions">
          <Link className="landing-login" href="/login">Log in</Link>
          <Link className="landing-cta small" href="/login?mode=signup">Start tracking <ArrowRight size={15} /></Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-copy">
          <p className="landing-kicker"><Sparkles size={14} />Your money, finally in focus</p>
          <h1>Spend with purpose. Save with <span>ease</span>.</h1>
          <p className="landing-lead">Track spending, let your income set the monthly budget, and build better habits in one calm, beautifully organized place.</p>
          <div className="landing-hero-actions">
            <Link className="landing-cta" href="/login?mode=signup">Create your free account <ArrowRight size={17} /></Link>
            <a className="landing-secondary" href="#preview">See how it works</a>
          </div>
          <div className="landing-proof" aria-label="Product benefits">
            <span><Check size={14} />Free to get started</span>
          </div>
        </div>

        <div className="landing-preview" id="preview" aria-label="Pera dashboard preview">
          <div className="preview-glow" />
          <div className="preview-window">
            <div className="preview-topbar">
              <span className="preview-logo">P</span>
              <div><small>Good evening</small><strong>Your overview</strong></div>
              <span className="preview-avatar">YC</span>
            </div>
            <div className="preview-stats">
              <article className="preview-balance"><small>Total balance</small><strong>₱184,520</strong><span><TrendingDown size={12} />8.2% this month</span></article>
              <article><small>Income</small><strong>₱92k</strong><em>August</em></article>
              <article><small>Saved</small><strong>₱21k</strong><em>23% rate</em></article>
            </div>
            <div className="preview-grid">
              <article className="preview-chart">
                <div><small>Cash flow</small><strong>Income vs. spending</strong></div>
                <div className="mini-bars" aria-hidden="true">
                  {[42, 61, 48, 72, 58, 83, 66, 91, 76].map((height, index) => <i key={height} style={{ height: `${height}%`, opacity: .45 + index * .05 }} />)}
                </div>
                <div className="chart-months"><span>MAR</span><span>MAY</span><span>JUL</span><span>AUG</span></div>
              </article>
              <article className="preview-budget">
                <small>Monthly budget</small>
                <div className="preview-ring"><span><strong>63%</strong><small>used</small></span></div>
                <p>₱25,470 left</p>
              </article>
            </div>
            <div className="preview-tip"><Sparkles size={17} /><span><small>Smart tip</small><strong>Dining spend is down 18% this month.</strong></span><ArrowRight size={15} /></div>
          </div>
        </div>
      </section>

      <section className="landing-features" id="features">
        <div className="landing-section-head">
          <p className="landing-kicker">Everything in one view</p>
          <h2>Less money stress.<br />More confident decisions.</h2>
          <p>Pera turns everyday activity into a clear picture of where you are and what to do next.</p>
        </div>
        <div className="feature-grid">
          <article><span className="feature-icon lime"><WalletCards size={23} /></span><h3>Track every penny</h3><p>See income, expenses, and savings together without wrestling with spreadsheets.</p></article>
          <article><span className="feature-icon lilac"><Target size={23} /></span><h3>A budget you control</h3><p>Set your own monthly spending limit and always know exactly what is spent and available.</p></article>
          <article><span className="feature-icon peach"><BarChart3 size={23} /></span><h3>Reports you can read</h3><p>Understand monthly trends through simple charts built for real-life decisions.</p></article>
          <article><span className="feature-icon mint"><CalendarClock size={23} /></span><h3>Never miss a bill</h3><p>Keep recurring expenses visible and know what is coming before payday.</p></article>
        </div>
      </section>

      <section className="landing-steps" id="how-it-works">
        <div className="landing-section-head compact">
          <p className="landing-kicker">Simple from day one</p>
          <h2>Three steps to a calmer money routine.</h2>
        </div>
        <div className="steps-grid">
          <article><span>01</span><h3>Create your space</h3><p>Sign in securely and choose the currency that fits your life.</p></article>
          <article><span>02</span><h3>Add your activity</h3><p>Log income, expenses, savings goals, and recurring bills.</p></article>
          <article><span>03</span><h3>Build your rhythm</h3><p>Check your dashboard and use smart tips to adjust with confidence.</p></article>
        </div>
      </section>

      <section className="landing-security" id="security">
        <div className="security-icon"><ShieldCheck size={29} /></div>
        <div><p className="landing-kicker">Private by design</p><h2>Your financial routine belongs to you.</h2><p>Secure account access and user-scoped records keep your dashboard personal.</p></div>
        <Link className="landing-secondary light" href="/login">Sign in securely <ArrowRight size={16} /></Link>
      </section>

      <section className="landing-final">
        <span className="final-pig"><PiggyBank size={38} /></span>
        <p className="landing-kicker">Start today</p>
        <h2>A clearer month starts with one expense.</h2>
        <p>Join Pera and make your money easier to understand.</p>
        <Link className="landing-cta" href="/login?mode=signup">Get started for free <ArrowRight size={17} /></Link>
      </section>

      <footer className="landing-footer"><Link className="landing-brand" href="/"><span>P</span><strong>Pera</strong></Link><p>Smart expense and budget tracking.</p><small>© 2026 Pera</small></footer>
    </main>
  );
}

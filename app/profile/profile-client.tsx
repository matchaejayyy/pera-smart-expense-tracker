"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Database,
  KeyRound,
  Landmark,
  LoaderCircle,
  LogOut,
  Mail,
  PencilLine,
  PiggyBank,
  ReceiptText,
  Repeat2,
  ShieldCheck,
  Trash2,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AccountInfo = {
  id: string;
  email: string;
  phone: string;
  createdAt: string;
  lastSignInAt: string;
  emailConfirmed: boolean;
  providers: string[];
};

type Preferences = {
  displayName: string;
  currency: string;
  timezone: string;
  monthlySavingsTarget: number;
  budgetAlerts: boolean;
};

type Stats = { transactions: number; savings: number; recurring: number; accounts: number };
type Message = { tone: "success" | "error"; text: string } | null;

const formatDate = (value: string) => value ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not available";

export function ProfileClient({ account, preferences: initialPreferences, stats, databaseReady }: { account: AccountInfo; preferences: Preferences; stats: Stats; databaseReady: boolean }) {
  const router = useRouter();
  const [preferences, setPreferences] = useState(initialPreferences);
  const [email, setEmail] = useState(account.email);
  const [profileMessage, setProfileMessage] = useState<Message>(null);
  const [passwordMessage, setPasswordMessage] = useState<Message>(null);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [resetSending, setResetSending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [deleting, setDeleting] = useState(false);
  const profileSaveLock = useRef(false);
  const passwordSaveLock = useRef(false);
  const resetEmailLock = useRef(false);
  const deleteAccountLock = useRef(false);

  const initials = preferences.displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "P";
  const providerLabel = account.providers.length ? account.providers.map((provider) => provider === "google" ? "Google" : provider === "email" ? "Email & password" : provider).join(", ") : "Email & password";

  const runLockedAction = async (lock: { current: boolean }, setLoading: (value: boolean) => void, task: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setLoading(true);
    try {
      await task();
    } finally {
      lock.current = false;
      setLoading(false);
    }
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!databaseReady) {
      setProfileMessage({ tone: "error", text: "Your secure financial database is temporarily unavailable. Refresh the page and try again." });
      return;
    }
    const formElement = event.currentTarget;
    await runLockedAction(profileSaveLock, setSaving, async () => {
      setProfileMessage(null);
      const form = new FormData(formElement);
      const next = {
        displayName: String(form.get("displayName") ?? "").trim(),
        currency: String(form.get("currency") ?? "PHP"),
        timezone: String(form.get("timezone") ?? "Asia/Manila"),
        monthlySavingsTarget: Number(form.get("monthlySavingsTarget") ?? 0),
        budgetAlerts: form.get("budgetAlerts") === "on",
      };
      const nextEmail = String(form.get("email") ?? "").trim();
      const supabase = createClient();
      if (!supabase) {
        setProfileMessage({ tone: "error", text: "Supabase authentication is not configured." });
        return;
      }

      const { error: authError } = await supabase.auth.updateUser({
        ...(nextEmail !== email ? { email: nextEmail } : {}),
        data: { full_name: next.displayName, name: next.displayName },
      });
      if (authError) {
        setProfileMessage({ tone: "error", text: authError.message });
        return;
      }

      const response = await fetch("/api/profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(next) });
      const payload = await response.json();
      if (!response.ok) {
        setProfileMessage({ tone: "error", text: payload.error ?? "Profile changes could not be saved." });
        return;
      }

      setPreferences(next);
      setEmail(nextEmail);
      setProfileMessage({ tone: "success", text: nextEmail !== email ? "Profile saved. Check your email to confirm the new address." : "Your profile was saved to Supabase." });
      router.refresh();
    });
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    await runLockedAction(passwordSaveLock, setPasswordSaving, async () => {
      setPasswordMessage(null);
      const form = new FormData(formElement);
      const currentPassword = String(form.get("currentPassword") ?? "");
      const password = String(form.get("password") ?? "");
      const confirmation = String(form.get("passwordConfirmation") ?? "");
      if (password.length < 8 || password !== confirmation) {
        setPasswordMessage({ tone: "error", text: password.length < 8 ? "Use at least 8 characters." : "The new passwords do not match." });
        return;
      }
      const supabase = createClient();
      if (!supabase) {
        setPasswordMessage({ tone: "error", text: "Supabase authentication is not configured." });
        return;
      }
      const { error } = await supabase.auth.updateUser({ password, ...(currentPassword ? { current_password: currentPassword } : {}) });
      if (error) {
        setPasswordMessage({ tone: "error", text: error.message });
        return;
      }
      formElement.reset();
      setPasswordMessage({ tone: "success", text: "Your password was updated." });
    });
  };

  const sendResetEmail = async () => {
    await runLockedAction(resetEmailLock, setResetSending, async () => {
      setPasswordMessage(null);
      const supabase = createClient();
      if (!supabase) {
        setPasswordMessage({ tone: "error", text: "Supabase authentication is not configured." });
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/profile` });
      setPasswordMessage(error ? { tone: "error", text: error.message } : { tone: "success", text: `A password reset link was sent to ${email}.` });
    });
  };

  const deleteAccount = async () => {
    if (deleteConfirmation !== "DELETE") return;
    await runLockedAction(deleteAccountLock, setDeleting, async () => {
      setDeleteMessage("");
      const response = await fetch("/api/account", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirmation: "DELETE" }) });
      const payload = await response.json();
      if (!response.ok) {
        setDeleteMessage(payload.error ?? "Your account could not be deleted.");
        return;
      }
      await createClient()?.auth.signOut({ scope: "local" });
      router.replace("/");
      router.refresh();
    });
  };

  return (
    <main className="profile-shell">
      <header className="profile-topbar">
        <Link className="profile-brand" href="/"><span>P</span><strong>Pera</strong></Link>
        <div className="profile-top-actions"><Link className="profile-back" href="/dashboard#overview"><ArrowLeft size={16} />Back to dashboard</Link><form action="/auth/signout" method="post"><button className="profile-signout" type="submit"><LogOut size={15} />Sign out</button></form></div>
      </header>

      <section className="profile-content">
        <div className="profile-hero">
          <span className="profile-avatar-large" aria-hidden="true">{initials}</span>
          <div><p className="eyebrow">Your Pera account</p><h1>{preferences.displayName}</h1><p>{email}</p></div>
          <span className={account.emailConfirmed ? "verification-pill verified" : "verification-pill"}>{account.emailConfirmed ? <CheckCircle2 size={15} /> : <Mail size={15} />}{account.emailConfirmed ? "Email verified" : "Verification pending"}</span>
        </div>

        {!databaseReady && <div className="profile-database-notice" role="alert"><Database size={20} /><div><strong>Your secure financial data could not be loaded.</strong><p>Your account remains protected and no fallback data is being shown. Refresh the page to reconnect to Supabase.</p></div></div>}

        <div className="profile-layout">
          <div className="profile-main-column">
            <section className="profile-card">
              <div className="profile-card-heading"><span className="profile-section-icon lime"><PencilLine size={19} /></span><div><p className="eyebrow">Personal details</p><h2>Edit your information</h2></div></div>
              <form className="profile-form" onSubmit={saveProfile}>
                <div className="profile-field-grid"><label>Full name<input name="displayName" defaultValue={preferences.displayName} autoComplete="name" required /></label><label>Email address<input name="email" type="email" defaultValue={email} autoComplete="email" required /></label></div>
                <div className="profile-field-grid"><label>Currency<select name="currency" defaultValue={preferences.currency}><option value="PHP">PHP — Philippine peso</option><option value="USD">USD — US dollar</option><option value="EUR">EUR — Euro</option><option value="GBP">GBP — British pound</option><option value="SGD">SGD — Singapore dollar</option></select></label><label>Timezone<select name="timezone" defaultValue={preferences.timezone}><option value="Asia/Manila">Asia/Manila</option><option value="Asia/Singapore">Asia/Singapore</option><option value="UTC">UTC</option><option value="America/New_York">America/New_York</option><option value="Europe/London">Europe/London</option></select></label></div>
                <label>Monthly savings target<input name="monthlySavingsTarget" type="number" min="0" step="500" defaultValue={preferences.monthlySavingsTarget} required /></label>
                <label className="profile-check"><input name="budgetAlerts" type="checkbox" defaultChecked={preferences.budgetAlerts} aria-label="Enable spending alerts" /><span><strong>Spending alerts</strong><small>Notify me as expenses approach this month’s income.</small></span></label>
                {profileMessage && <p className={`profile-message ${profileMessage.tone}`} role="status">{profileMessage.text}</p>}
                <button className="profile-primary" type="submit" disabled={saving || !databaseReady}>{saving ? <LoaderCircle className="spin" size={16} /> : <ShieldCheck size={16} />}Save profile</button>
              </form>
            </section>

            <section className="profile-card">
              <div className="profile-card-heading"><span className="profile-section-icon lilac"><KeyRound size={19} /></span><div><p className="eyebrow">Security</p><h2>Password and recovery</h2></div></div>
              <form className="profile-form" onSubmit={changePassword}>
                <label>Current password <small>Optional for Google-only accounts</small><input name="currentPassword" type="password" autoComplete="current-password" /></label>
                <div className="profile-field-grid"><label>New password<input name="password" type="password" minLength={8} autoComplete="new-password" required /></label><label>Confirm new password<input name="passwordConfirmation" type="password" minLength={8} autoComplete="new-password" required /></label></div>
                {passwordMessage && <p className={`profile-message ${passwordMessage.tone}`} role="status">{passwordMessage.text}</p>}
                <div className="profile-button-row"><button className="profile-primary" type="submit" disabled={passwordSaving}>{passwordSaving ? <LoaderCircle className="spin" size={16} /> : <KeyRound size={16} />}Change password</button><button className="profile-secondary" type="button" onClick={sendResetEmail} disabled={resetSending}>{resetSending ? <LoaderCircle className="spin" size={16} /> : <Mail size={16} />}Email reset link</button></div>
              </form>
            </section>

            <section className="profile-card profile-danger">
              <div className="profile-card-heading"><span className="profile-section-icon danger"><Trash2 size={19} /></span><div><p className="eyebrow">Danger zone</p><h2>Delete account</h2></div></div>
              <p>This permanently removes your Supabase Auth account and every transaction, budget, recurring expense, category, account, savings goal, insight, and profile row owned by your user ID.</p>
              <button className="profile-delete-button" type="button" onClick={() => setDeleteOpen(true)}><Trash2 size={16} />Delete my account</button>
            </section>
          </div>

          <aside className="profile-side-column">
            <section className="profile-card account-card"><div className="profile-card-heading"><span className="profile-section-icon mint"><UserRound size={19} /></span><div><p className="eyebrow">Account</p><h2>Sign-in details</h2></div></div><dl><div><dt>Account ID</dt><dd title={account.id}>{account.id}</dd></div><div><dt>Sign-in method</dt><dd>{providerLabel}</dd></div><div><dt>Phone</dt><dd>{account.phone || "Not added"}</dd></div><div><dt>Member since</dt><dd>{formatDate(account.createdAt)}</dd></div><div><dt>Last sign-in</dt><dd>{formatDate(account.lastSignInAt)}</dd></div></dl></section>
            <section className="profile-card"><div className="profile-card-heading"><span className="profile-section-icon peach"><Landmark size={19} /></span><div><p className="eyebrow">Your data</p><h2>Database summary</h2></div></div><div className="profile-stats"><div><WalletCards size={18} /><span><strong>{stats.accounts}</strong><small>Accounts</small></span></div><div><ReceiptText size={18} /><span><strong>{stats.transactions}</strong><small>Transactions</small></span></div><div><PiggyBank size={18} /><span><strong>{stats.savings}</strong><small>Savings</small></span></div><div><Repeat2 size={18} /><span><strong>{stats.recurring}</strong><small>Recurring</small></span></div></div></section>
          </aside>
        </div>
      </section>

      {deleteOpen && <div className="profile-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) setDeleteOpen(false); }}><div className="profile-delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-account-title"><button className="profile-modal-close" onClick={() => setDeleteOpen(false)} disabled={deleting} aria-label="Close"><X size={18} /></button><span className="profile-modal-icon"><Trash2 size={24} /></span><p className="eyebrow">Permanent action</p><h2 id="delete-account-title">Delete your Pera account?</h2><p>This cannot be undone. Type <strong>DELETE</strong> below to confirm.</p><input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} placeholder="Type DELETE" aria-label="Type DELETE to confirm" autoComplete="off" />{deleteMessage && <p className="profile-message error" role="alert">{deleteMessage}</p>}<div className="profile-button-row"><button className="profile-secondary" type="button" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</button><button className="profile-delete-button" type="button" onClick={deleteAccount} disabled={deleteConfirmation !== "DELETE" || deleting}>{deleting ? <LoaderCircle className="spin" size={16} /> : <Trash2 size={16} />}Delete permanently</button></div></div></div>}
    </main>
  );
}

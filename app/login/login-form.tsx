"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, LoaderCircle, Mail } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";

type LoginFormProps = {
  initialMode: AuthMode;
  initialError?: string;
};

const errorMessages: Record<string, string> = {
  auth_callback_failed: "We could not finish signing you in. Please try again.",
  email_confirmation_failed: "That verification link is invalid or has expired. Request a new email below.",
  missing_configuration: "Supabase authentication is not configured yet.",
};

export function LoginForm({ initialMode, initialError }: LoginFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState<"google" | "email" | null>(null);
  const [message, setMessage] = useState(initialError ? errorMessages[initialError] ?? "Sign in was not completed. Please try again." : "");
  const [messageType, setMessageType] = useState<"error" | "success">("error");
  const [pendingEmail, setPendingEmail] = useState("");

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setMessage("");
    window.history.replaceState(null, "", nextMode === "signup" ? "/login?mode=signup" : "/login");
  };

  const continueWithGoogle = async () => {
    setLoading("google");
    setMessage("");
    const supabase = createClient();

    if (!supabase) {
      setMessage("Supabase authentication is not configured yet.");
      setLoading(null);
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        scopes: "openid email profile",
      },
    });

    if (error) {
      setMessage(error.message.toLowerCase().includes("provider is not enabled") ? "Google sign-in is not enabled in this Supabase project yet." : error.message);
      setMessageType("error");
      setLoading(null);
    }
  };

  const submitEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading("email");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const fullName = String(form.get("fullName") ?? "").trim();
    const supabase = createClient();

    if (!supabase) {
      setMessage("Supabase authentication is not configured yet.");
      setLoading(null);
      return;
    }

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(error.message);
        setMessageType("error");
        setLoading(null);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=/dashboard`,
      },
    });

    if (error) {
      setMessage(error.message);
      setMessageType("error");
      setLoading(null);
      return;
    }

    if (data.session) {
      router.replace("/dashboard");
      router.refresh();
      return;
    }

    setPendingEmail(email);
    setMessage(`We sent a verification link to ${email}. Open it on this device to finish creating your account.`);
    setMessageType("success");
    setLoading(null);
  };

  const resendVerification = async () => {
    if (!pendingEmail) return;
    setLoading("email");
    setMessage("");
    const supabase = createClient();
    if (!supabase) {
      setMessage("Supabase authentication is not configured yet.");
      setMessageType("error");
      setLoading(null);
      return;
    }
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: pendingEmail,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm?next=/dashboard` },
    });
    setLoading(null);
    if (error) {
      setMessage(error.message);
      setMessageType("error");
      return;
    }
    setMessage(`A new verification link was sent to ${pendingEmail}.`);
    setMessageType("success");
  };

  return (
    <div className="auth-card">
      <div className="auth-heading">
        <p className="landing-kicker">{mode === "login" ? "Welcome back" : "Start with Pera"}</p>
        <h2>{mode === "login" ? "Log in to your account" : "Create your account"}</h2>
        <p>{mode === "login" ? "Your next clear money decision starts here." : "Build a calmer, more intentional money routine."}</p>
      </div>

      <button className="google-button" type="button" onClick={continueWithGoogle} disabled={loading !== null}>
        {loading === "google" ? <LoaderCircle className="spin" size={18} /> : <Image src="/google-logo.svg" alt="" width={18} height={18} />}
        Continue with Google
      </button>

      <div className="auth-divider"><span>or continue with email</span></div>

      <form className="auth-form" onSubmit={submitEmail}>
        {mode === "signup" && <label>Full name<input name="fullName" type="text" autoComplete="name" placeholder="Juan Dela Cruz" required /></label>}
        <label>Email address<div className="auth-input"><Mail size={16} /><input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></div></label>
        <label>Password<div className="auth-input"><input name="password" type={showPassword ? "text" : "password"} minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="At least 8 characters" required /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>

        {message && <p className={`auth-message ${messageType}`} role="status">{message}</p>}
        {pendingEmail && <button className="resend-button" type="button" onClick={resendVerification} disabled={loading !== null}>Resend verification email</button>}

        <button className="auth-submit" type="submit" disabled={loading !== null}>
          {loading === "email" ? <LoaderCircle className="spin" size={17} /> : <>{mode === "login" ? "Log in" : "Create account"}<ArrowRight size={16} /></>}
        </button>
      </form>

      <p className="auth-switch">
        {mode === "login" ? "New to Pera?" : "Already have an account?"}{" "}
        <button type="button" onClick={() => switchMode(mode === "login" ? "signup" : "login")}>{mode === "login" ? "Create an account" : "Log in"}</button>
      </p>
      <p className="auth-terms">By continuing, you agree to keep your account information accurate and secure.</p>
    </div>
  );
}

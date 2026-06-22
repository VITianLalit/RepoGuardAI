"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, Eye, EyeOff, Loader2, Mail, ShieldCheck, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";

type Mode = "sign-in" | "sign-up" | "forgot";

const AUTH_SUCCESS_PATH = "/connect_your_first_project";

// Always use the deployed production URL for Supabase email redirect links.
// Falls back to window.location.origin only in local dev when env var is not set.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (typeof window !== "undefined" ? window.location.origin : "https://repo-guard-ai-beta.vercel.app");

export default function AuthPanel({ initialMode }: { initialMode: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifyBanner, setVerifyBanner] = useState(false);

  // Redirect already-authenticated users immediately
  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    async function redirectAuthenticatedUser() {
      const { data: { session } } = await supabase!.auth.getSession();
      if (mounted && session) router.replace(AUTH_SUCCESS_PATH);
    }
    void redirectAuthenticatedUser();
    return () => { mounted = false; };
  }, [router]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      toast.error("Authentication service is not configured. Please contact support.");
      return;
    }
    setLoading(true);
    setVerifyBanner(false);

    try {
      // ── Forgot password ───────────────────────────────────────────────────
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${SITE_URL}${AUTH_SUCCESS_PATH}`,
        });
        if (error) throw error;
        toast.success("Password reset email sent — check your inbox.", { duration: 6000, icon: "📧" });
        setMode("sign-in");
        return;
      }

      // ── Sign up ───────────────────────────────────────────────────────────
      if (mode === "sign-up") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            emailRedirectTo: `${SITE_URL}${AUTH_SUCCESS_PATH}`,
          },
        });
        if (error) throw error;

        if (data.session) {
          // Email confirmations disabled in Supabase dashboard — user immediately signed in
          toast.success("Account created! Welcome to RepoGuard AI.");
          router.replace(AUTH_SUCCESS_PATH);
          return;
        }

        // Email confirmation required — show a prominent banner
        setVerifyBanner(true);
        toast.success(
          "Verification email sent! Please check your inbox before signing in.",
          { duration: 8000, icon: "📧" },
        );
        setMode("sign-in");
        setPassword("");
        return;
      }

      // ── Sign in ───────────────────────────────────────────────────────────
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Welcome back!");
      router.replace(AUTH_SUCCESS_PATH);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Authentication failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  const title =
    mode === "sign-up"
      ? "Create your account"
      : mode === "forgot"
        ? "Reset your password"
        : "Welcome back";

  const subtitle =
    mode === "sign-up"
      ? "Sign up to start auditing your repositories for security vulnerabilities."
      : mode === "forgot"
        ? "Enter your email and we'll send you a secure reset link."
        : "Sign in to access your repository audits and saved reports.";

  return (
    <main className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-10">
      <section className="w-full max-w-[480px] rounded-2xl border border-outline-variant bg-white p-6 shadow-2xl sm:p-10">

        {/* Logo + title */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white shadow-lg">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <p className="font-label-sm text-xs uppercase tracking-[0.18em] text-secondary font-semibold">
            RepoGuard AI
          </p>
          <h1 className="mt-2 font-headline-lg text-3xl font-bold text-on-surface">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">{subtitle}</p>
        </div>

        {/* ── Email-verify banner ────────────────────────────────────────── */}
        {verifyBanner && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-teal-300 bg-teal-50 px-4 py-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
            <div>
              <p className="font-semibold text-teal-800">Check your email to verify</p>
              <p className="mt-1 text-sm text-teal-700">
                We sent a verification link to <strong>{email}</strong>. Click the link in that email,
                then return here to sign in.
              </p>
            </div>
          </div>
        )}

        {/* Tab switcher */}
        {mode !== "forgot" && (
          <div className="mb-6 grid grid-cols-2 rounded-xl bg-surface-container-low p-1">
            <button
              className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
                mode === "sign-in"
                  ? "bg-white text-primary shadow-sm"
                  : "text-on-surface-variant hover:text-primary"
              }`}
              onClick={() => { setMode("sign-in"); setVerifyBanner(false); }}
              type="button"
            >
              Sign In
            </button>
            <button
              className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
                mode === "sign-up"
                  ? "bg-white text-primary shadow-sm"
                  : "text-on-surface-variant hover:text-primary"
              }`}
              onClick={() => { setMode("sign-up"); setVerifyBanner(false); }}
              type="button"
            >
              Sign Up
            </button>
          </div>
        )}

        <form className="space-y-4" onSubmit={submit}>
          {/* Name — sign-up only */}
          {mode === "sign-up" ? (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-on-surface">
                Full name <span className="text-on-surface-variant font-normal">(optional)</span>
              </span>
              <input
                autoComplete="name"
                className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-on-surface outline-none ring-primary/20 placeholder:text-on-surface-variant/50 focus:border-primary focus:ring-4 transition"
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Johnson"
                value={name}
              />
            </label>
          ) : null}

          {/* Email */}
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-on-surface">Email address</span>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-outline" />
              <input
                autoComplete="email"
                className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest py-3 pl-10 pr-4 text-on-surface outline-none ring-primary/20 placeholder:text-on-surface-variant/50 focus:border-primary focus:ring-4 transition"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                type="email"
                value={email}
              />
            </div>
          </label>

          {/* Password */}
          {mode !== "forgot" ? (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-on-surface">Password</span>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-outline" />
                <input
                  autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                  className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest py-3 pl-10 pr-12 text-on-surface outline-none ring-primary/20 placeholder:text-on-surface-variant/50 focus:border-primary focus:ring-4 transition"
                  minLength={6}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "sign-up" ? "Minimum 6 characters" : "Your password"}
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                />
                <button
                  className="absolute right-3.5 top-3.5 text-outline hover:text-on-surface transition"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
          ) : null}

          {/* Submit */}
          <button
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 font-semibold text-white shadow-sm transition-all hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading
              ? "Please wait…"
              : mode === "sign-up"
                ? "Create account"
                : mode === "forgot"
                  ? "Send reset link"
                  : "Sign in"}
          </button>
        </form>

        {/* Forgot / back to sign-in toggle */}
        <div className="mt-6 flex items-center justify-center text-sm">
          {mode === "forgot" ? (
            <button
              className="text-on-surface-variant transition hover:text-primary font-medium"
              onClick={() => { setMode("sign-in"); setVerifyBanner(false); }}
              type="button"
            >
              ← Back to sign in
            </button>
          ) : (
            <button
              className="text-on-surface-variant transition hover:text-primary font-medium"
              onClick={() => { setMode("forgot"); setVerifyBanner(false); }}
              type="button"
            >
              Forgot your password?
            </button>
          )}
        </div>

        {/* Sign-up terms note */}
        {mode === "sign-up" && (
          <p className="mt-5 text-center text-xs text-on-surface-variant leading-5">
            By creating an account you agree to our{" "}
            <a href="#" className="underline hover:text-primary transition">Terms of Service</a>
            {" "}and{" "}
            <a href="#" className="underline hover:text-primary transition">Privacy Policy</a>.
          </p>
        )}
      </section>
    </main>
  );
}

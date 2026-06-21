"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, Eye, EyeOff, Loader2, Mail, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Mode = "sign-in" | "sign-up" | "forgot";

const AUTH_SUCCESS_PATH = "/connect_your_first_project";

export default function AuthPanel({ initialMode }: { initialMode: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Shown prominently in the UI (not just a toast) after sign-up needs email confirm
  const [verifyBanner, setVerifyBanner] = useState(false);

  // Redirect already-authenticated users immediately
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
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
    setLoading(true);
    setVerifyBanner(false);

    try {
      // ── Demo mode (no Supabase keys) ──────────────────────────────────────
      if (!isSupabaseConfigured || !supabase) {
        localStorage.setItem(
          "repoguard-demo-user",
          JSON.stringify({ email, name: name || "Security Engineer" }),
        );
        toast.success(
          mode === "sign-up"
            ? "Demo account created! Redirecting…"
            : "Signed in (demo mode). Redirecting…",
        );
        router.replace(AUTH_SUCCESS_PATH);
        return;
      }

      // ── Forgot password ───────────────────────────────────────────────────
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}${AUTH_SUCCESS_PATH}`,
        });
        if (error) throw error;
        toast.success("Password reset email sent — check your inbox.");
        return;
      }

      // ── Sign up ───────────────────────────────────────────────────────────
      if (mode === "sign-up") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            emailRedirectTo: `${window.location.origin}${AUTH_SUCCESS_PATH}`,
          },
        });
        if (error) throw error;

        if (data.session) {
          // Email confirmations disabled — user is immediately signed in
          toast.success("Account created! Welcome to RepoGuard AI.");
          router.replace(AUTH_SUCCESS_PATH);
          return;
        }

        // Email confirmation is required — show a prominent banner + toast
        setVerifyBanner(true);
        toast.success(
          "Verification email sent! Please check your inbox before signing in.",
          { duration: 8000, icon: "📧" },
        );
        // Switch to sign-in tab so they know what comes next
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
        error instanceof Error ? error.message : "Authentication failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  const title =
    mode === "sign-up"
      ? "Create your account"
      : mode === "forgot"
        ? "Reset password"
        : "Welcome back";

  return (
    <main className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-10">
      <section className="w-full max-w-[480px] rounded-xl border border-outline-variant bg-white p-6 shadow-2xl sm:p-8">
        {/* Logo + title */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-white">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <p className="font-label-sm text-xs uppercase tracking-[0.18em] text-secondary">
            RepoGuard AI
          </p>
          <h1 className="mt-2 font-headline-lg text-3xl font-bold">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">
            {isSupabaseConfigured
              ? "Use your account to access repository analysis and saved reports."
              : "Demo mode — Supabase keys not configured. Auth is stored locally."}
          </p>
        </div>

        {/* ── Email-verify banner ────────────────────────────────────────── */}
        {verifyBanner && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-teal-300 bg-teal-50 px-4 py-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
            <div>
              <p className="font-semibold text-teal-800">Verify your email to continue</p>
              <p className="mt-1 text-sm text-teal-700">
                We have sent a verification link to <strong>{email}</strong>. Open that
                email and click the link — then come back here to sign in.
              </p>
            </div>
          </div>
        )}

        {/* Tab switcher */}
        <div className="mb-5 grid grid-cols-2 rounded-lg bg-surface-container-low p-1">
          <button
            className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
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
            className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
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

        <form className="space-y-4" onSubmit={submit}>
          {/* Name — sign-up only */}
          {mode === "sign-up" ? (
            <label className="block">
              <span className="mb-1 block text-sm font-medium">
                Full name <span className="text-on-surface-variant">(optional)</span>
              </span>
              <input
                autoComplete="name"
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-3 outline-none ring-primary/20 focus:ring-4"
                onChange={(e) => setName(e.target.value)}
                placeholder="Security engineer"
                value={name}
              />
            </label>
          ) : null}

          {/* Email */}
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Email</span>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 h-4 w-4 text-outline" />
              <input
                autoComplete="email"
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-3 pl-10 pr-3 outline-none ring-primary/20 focus:ring-4"
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
              <span className="mb-1 block text-sm font-medium">Password</span>
              <div className="relative">
                <input
                  autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-3 pr-10 outline-none ring-primary/20 focus:ring-4"
                  minLength={6}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                />
                <button
                  className="absolute right-3 top-3.5 text-outline hover:text-on-surface"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  type="button"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
          ) : null}

          {/* Submit */}
          <button
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading
              ? "Working…"
              : mode === "sign-up"
                ? "Create account"
                : mode === "forgot"
                  ? "Send reset link"
                  : "Sign in"}
          </button>
        </form>

        {/* Forgot password toggle */}
        <div className="mt-5 flex items-center justify-center text-sm">
          <button
            className="text-on-surface-variant transition hover:text-primary"
            onClick={() => {
              setMode(mode === "forgot" ? "sign-in" : "forgot");
              setVerifyBanner(false);
            }}
            type="button"
          >
            {mode === "forgot" ? "Back to sign in" : "Forgot password?"}
          </button>
        </div>
      </section>
    </main>
  );
}

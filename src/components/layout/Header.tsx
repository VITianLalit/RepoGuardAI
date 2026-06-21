"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Shield } from "lucide-react";
import { supabase } from "@/lib/supabase";

type HeaderVariant = "landing" | "dashboard" | "auth";

const navItems: Record<HeaderVariant, { label: string; href: string }[]> = {
  landing: [
    { label: "Repositories", href: "#features" },
    { label: "Scan History", href: "#reasoning" },
    { label: "Documentation", href: "#features" },
  ],
  dashboard: [
    { label: "Connect", href: "/connect_your_first_project" },
    { label: "Report", href: "/dashboard#reports" },
    { label: "Fix center", href: "#recommendations" },
  ],
  auth: [
    { label: "Features", href: "/#features" },
    { label: "Reasoning", href: "/#reasoning" },
  ],
};

export default function Header({ variant = "landing" }: { variant?: HeaderVariant }) {
  const router = useRouter();

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    localStorage.removeItem("repoguard-demo-user");
    localStorage.removeItem("repoguard-github-token");
    router.replace("/auth");
  }

  return (
    <header className="sticky top-0 z-50 flex w-full items-center justify-between border-b border-outline-variant/30 bg-surface-container-low/80 px-lg h-16 shadow-sm backdrop-blur-xl transition-all duration-300">
      <Link className="flex items-center gap-3" href="/">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
          <Shield className="h-5 w-5" />
        </span>
        <span className="font-headline-md text-headline-md font-bold text-on-surface tracking-tight">RepoGuard AI</span>
      </Link>
      <nav className="hidden md:flex items-center gap-8">
        {navItems[variant].map((item, index) => (
          <Link
            className={
              index === 0
                ? "text-primary border-b-2 border-primary pb-1 font-body-md transition-all duration-300 active:scale-95"
                : "text-on-surface-variant hover:text-primary font-body-md transition-all duration-300 active:scale-95"
            }
            href={item.href}
            key={item.label}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-3">
        {variant === "dashboard" ? (
          <button
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 py-2 font-body-md text-on-surface-variant transition-all duration-300 hover:border-primary hover:text-primary active:scale-95"
            onClick={signOut}
            type="button"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        ) : (
          <>
            <Link
              className="hidden items-center justify-center rounded-lg border border-outline-variant px-5 py-2 font-body-md text-on-surface-variant transition-all duration-300 hover:border-primary hover:text-primary active:scale-95 sm:inline-flex"
              href="/auth"
            >
              Sign In
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2 font-body-md font-semibold text-on-primary transition-all duration-300 hover:brightness-110 active:scale-95"
              href="/auth?mode=sign-up"
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

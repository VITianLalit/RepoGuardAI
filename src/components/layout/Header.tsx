"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Shield, Menu, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

type HeaderVariant = "landing" | "dashboard" | "auth";

const navItems: Record<HeaderVariant, { label: string; href: string }[]> = {
  landing: [
    { label: "Home", href: "/" },
    { label: "Features", href: "/#features" },
    { label: "Pipeline", href: "/#agents-pipeline" },
    { label: "Reasoning", href: "/#reasoning" },
  ],
  dashboard: [
    { label: "Connect", href: "/connect_your_first_project" },
    { label: "Report", href: "/dashboard#reports" },
    // { label: "Fix center", href: "/#recommendations" },
  ],
  auth: [
    { label: "Features", href: "/#features" },
    { label: "Pipeline", href: "/#agents-pipeline" },
    { label: "Reasoning", href: "/#reasoning" },
  ],
};

export default function Header({ variant = "landing" }: { variant?: HeaderVariant }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    localStorage.removeItem("repoguard-demo-user");
    localStorage.removeItem("repoguard-github-token");
    router.replace("/auth");
  }

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 backdrop-blur-2xl ${
        isScrolled
          ? "border-b border-outline-variant/30 bg-surface-container-low/80 shadow-md py-5"
          : "border-b border-transparent bg-transparent py-8"
      }`}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 lg:px-12">
        {/* Logo Section */}
        <Link className="group flex items-center gap-4" href="/">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-primary-container text-white shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:shadow-md">
            <Shield className="h-6 w-6" />
          </span>
          <span className="text-2xl font-bold tracking-tight text-on-surface transition-all duration-300 group-hover:text-primary">
            RepoGuard AI
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-3 md:flex">
          {navItems[variant].map((item) => {
            const isActive = pathname === item.href.split("#")[0];

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`rounded-full px-5 py-2.5 text-base font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-5 md:flex">
          {variant === "dashboard" ? (
            <button
              onClick={signOut}
              className="group inline-flex items-center justify-center gap-2.5 rounded-full border border-outline-variant/50 px-6 py-3 text-base font-medium text-on-surface-variant transition-all hover:border-error/50 hover:bg-error/10 hover:text-error active:scale-95"
              type="button"
            >
              <LogOut className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
              <span>Sign Out</span>
            </button>
          ) : (
            <>
              <Link
                href="/auth"
                className="rounded-full px-6 py-3 text-base font-medium text-on-surface-variant transition-colors hover:text-primary"
              >
                Sign In
              </Link>
              <Link
                href="/auth?mode=sign-up"
                className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-3 text-base font-semibold text-on-primary shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md active:translate-y-0 active:scale-95"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="flex items-center p-3 text-on-surface-variant transition-colors hover:text-on-surface md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X className="h-8 w-8" /> : <Menu className="h-8 w-8" />}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="absolute left-0 top-full w-full animate-in slide-in-from-top-2 border-b border-outline-variant/20 bg-surface/95 shadow-lg backdrop-blur-xl md:hidden">
          <div className="flex flex-col space-y-5 p-8">
            <nav className="flex flex-col space-y-5">
              {navItems[variant].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-lg font-medium text-on-surface-variant hover:text-primary"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <hr className="border-outline-variant/20" />
            <div className="flex flex-col space-y-4 pt-3">
              {variant === "dashboard" ? (
                <button
                  onClick={signOut}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-error/10 py-4 text-base font-medium text-error"
                >
                  <LogOut className="h-5 w-5" />
                  Sign Out
                </button>
              ) : (
                <>
                  <Link
                    href="/auth"
                    className="rounded-xl border border-outline-variant/50 py-4 text-center text-base font-medium text-on-surface-variant"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth?mode=sign-up"
                    className="rounded-xl bg-primary py-4 text-center text-base font-semibold text-on-primary"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
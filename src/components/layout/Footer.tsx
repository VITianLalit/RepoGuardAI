import Link from "next/link";
import { Shield } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-surface-container-low border-t border-outline-variant/30 py-12 px-lg transition-all duration-300">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        
        <div className="flex flex-col items-center md:items-start gap-4">
          <Link className="group flex items-center gap-3" href="/">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-primary to-primary-container text-white shadow-sm transition-all duration-300 group-hover:scale-105">
              <Shield className="h-5 w-5" />
            </span>
            <span className="text-xl font-bold tracking-tight text-on-surface transition-all duration-300 group-hover:text-primary">
              RepoGuard AI
            </span>
          </Link>
          <p className="font-body-sm text-on-surface-variant opacity-80 text-center md:text-left">
            &copy; {new Date().getFullYear()} RepoGuard AI. Fortified Intelligence.
          </p>
        </div>

        <nav className="flex flex-wrap justify-center md:justify-end gap-x-8 gap-y-4">
          <Link href="/#features" className="font-medium text-on-surface-variant hover:text-primary hover:underline transition-all duration-300 opacity-80 hover:opacity-100">
            Features
          </Link>
          <Link href="/#agents-pipeline" className="font-medium text-on-surface-variant hover:text-primary hover:underline transition-all duration-300 opacity-80 hover:opacity-100">
            Pipeline
          </Link>
          <Link href="/#reasoning" className="font-medium text-on-surface-variant hover:text-primary hover:underline transition-all duration-300 opacity-80 hover:opacity-100">
            Reasoning
          </Link>
          <Link href="/auth" className="font-medium text-on-surface-variant hover:text-primary hover:underline transition-all duration-300 opacity-80 hover:opacity-100">
            Sign In
          </Link>
          <a href="https://github.com" target="_blank" rel="noreferrer" className="font-medium text-on-surface-variant hover:text-primary hover:underline transition-all duration-300 opacity-80 hover:opacity-100">
            GitHub
          </a>
        </nav>

      </div>
    </footer>
  );
}

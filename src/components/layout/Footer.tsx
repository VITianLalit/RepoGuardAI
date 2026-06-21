export default function Footer() {
  return (
    <footer className="bg-surface-container-low border-t border-outline-variant/30 py-lg px-lg transition-all duration-300">
      <div className="flex flex-col md:flex-row justify-between items-center w-full gap-8">
        <div className="flex flex-col gap-2">
          <span className="font-label-md text-on-surface uppercase tracking-widest font-bold">RepoGuard AI</span>
          <p className="font-body-sm text-on-surface-variant opacity-80">&copy; 2024 RepoGuard AI. Fortified Intelligence.</p>
        </div>
        <nav className="flex flex-wrap justify-center gap-6">
          <a className="font-body-sm text-on-surface-variant hover:text-primary hover:underline transition-all duration-300 opacity-80 hover:opacity-100" href="#">Terms of Service</a>
          <a className="font-body-sm text-on-surface-variant hover:text-primary hover:underline transition-all duration-300 opacity-80 hover:opacity-100" href="#">Privacy Policy</a>
          <a className="font-body-sm text-on-surface-variant hover:text-primary hover:underline transition-all duration-300 opacity-80 hover:opacity-100" href="#">API Documentation</a>
          <a className="font-body-sm text-on-surface-variant hover:text-primary hover:underline transition-all duration-300 opacity-80 hover:opacity-100" href="#">GitHub</a>
          <a className="font-body-sm text-on-surface-variant hover:text-primary hover:underline transition-all duration-300 opacity-80 hover:opacity-100" href="#">LinkedIn</a>
        </nav>
      </div>
    </footer>
  );
}

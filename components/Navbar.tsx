import { Icon } from "@/components/ui/Icon";

export function Navbar() {
  return (
    <header className="site-nav">
      <nav className="page-width flex h-full items-center justify-between" aria-label="Main navigation">
        <a href="#main-content" className="brand" aria-label="RepoExplain home">
          <span className="brand-mark"><Icon name="code" size={22} /></span>
          RepoExplain<span className="ml-1 hidden rounded border border-line px-1.5 py-0.5 font-mono text-xs font-normal tracking-normal text-muted sm:inline">BETA</span>
        </a>
        <div className="flex items-center gap-5">
          <a href="#about" className="nav-link">About</a>
          <span className="hidden h-4 w-px bg-line sm:block" />
          <button className="icon-button" type="button" disabled aria-label="GitHub project link coming soon" title="GitHub project link coming soon"><Icon name="github" size={18} /></button>
        </div>
      </nav>
    </header>
  );
}

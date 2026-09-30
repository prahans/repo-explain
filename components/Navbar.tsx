import Link from "next/link";
import { AuthButton } from "@/components/AuthButton";
import { Icon } from "@/components/ui/Icon";

export function Navbar({
  signedIn = false,
  activePage,
}: {
  signedIn?: boolean;
  activePage?: "history";
}) {
  return (
    <header className="site-nav">
      <nav
        className="page-width nav-content"
        aria-label="Main navigation"
      >
        <Link href="/" className="brand" aria-label="RepoExplain home">
          <span className="brand-mark">
            <Icon name="code" size={22} />
          </span>
          RepoExplain
          <span className="ml-1 hidden rounded border border-line px-1.5 py-0.5 font-mono text-xs font-normal tracking-normal text-muted sm:inline">
            BETA
          </span>
        </Link>
        <div className="nav-actions">
          {signedIn && (
            <Link
              href="/history"
              className="nav-link"
              aria-current={activePage === "history" ? "page" : undefined}
            >
              <Icon name="clock" size={16} />
              History
            </Link>
          )}
          <AuthButton />
        </div>
      </nav>
    </header>
  );
}

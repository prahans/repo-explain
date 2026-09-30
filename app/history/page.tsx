import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { RepositoryHistory } from "@/components/RepositoryHistory";
import { Navbar } from "@/components/Navbar";

export default async function HistoryPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Navbar signedIn activePage="history" />
      <main id="main-content" className="page-width history-page">
        <div className="history-heading">
          <div>
            <p className="eyebrow">RepoExplain</p>

            <h1 className="history-title">Repository history</h1>

            <p className="mt-2 text-sm text-muted">
              Reopen, favorite, or remove repositories you have previously
              analyzed.
            </p>
          </div>

          <Link href="/" className="secondary-button">
            ← Back to RepoExplain
          </Link>
        </div>

        <RepositoryHistory />
      </main>
    </>
  );
}

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
      <Navbar />
      <main className="page-width py-10">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">RepoExplain</p>

            <h1 className="mt-2 text-3xl font-semibold">Repository history</h1>

            <p className="mt-2 text-sm text-muted">
              Reopen, favorite, or remove repositories you have previously
              analyzed.
            </p>
          </div>

          <Link href="/" className="text-link">
            ← Back to RepoExplain
          </Link>
        </div>

        <RepositoryHistory />
      </main>
    </>
  );
}

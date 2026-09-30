import { Navbar } from "@/components/Navbar";
import { RepoExplain } from "@/components/RepoExplain";

import { auth } from "@/auth";

type HomePageProps = {
  searchParams: Promise<{
    repo?: string | string[];
  }>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const [session, params] = await Promise.all([auth(), searchParams]);

  const repositoryUrl = Array.isArray(params.repo)
    ? params.repo[0]
    : params.repo;
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Navbar signedIn={Boolean(session?.user)} />

      <main id="main-content">
        <RepoExplain initialRepositoryUrl={repositoryUrl ?? ""} />
      </main>
      <footer className="site-footer page-width" id="about">
        <p>Less time navigating. More time understanding.</p>
        <span>
          RepoExplain <span className="footer-dot">/</span> Built for curious
          developers
        </span>
      </footer>
    </>
  );
}

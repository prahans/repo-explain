import { Navbar } from "@/components/Navbar";
import { RepoExplain } from "@/components/RepoExplain";

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Navbar />
      <main id="main-content"><RepoExplain /></main>
      <footer className="site-footer page-width" id="about">
        <p>Less time navigating. More time understanding.</p>
        <span>RepoExplain <span className="footer-dot">/</span> Built for curious developers</span>
      </footer>
    </>
  );
}

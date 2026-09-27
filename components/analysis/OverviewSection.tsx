import { Icon } from "@/components/ui/Icon";
import { ProjectTree } from "@/components/analysis/ProjectTree";
import { TechnologyMark } from "@/components/analysis/TechStackSection";
import type { AnalysisSection } from "@/types/analysis";
import type { LiveRepositoryAnalysis } from "@/types/live-analysis";
import styles from "./OverviewSection.module.css";

export function OverviewSection({
  analysis,
  onNavigate,
}: {
  analysis: LiveRepositoryAnalysis;
  onNavigate: (section: AnalysisSection) => void;
}) {
  return (
    <section className={styles.overview}>
      <div>
        <h2 className="section-heading">The big picture</h2>
        <p className="section-description">
          Your first look at what this repository is all about.
        </p>
      </div>
      <div className={styles.overviewGrid}>
        <div className={styles.summaryColumn}>
          <article className={`${styles.card} ${styles.purposeCard}`}>
            <h3 className={`small-heading ${styles.cardHeading}`}>
              <span className={`${styles.cardIcon} ${styles.purposeIcon}`}>
                <Icon name="repository" size={17} />
              </span>
              What this repository does
            </h3>
            <p className={styles.copy}>{analysis.overview.summary}</p>
          </article>
          <article className={styles.card}>
            <h3 className={`small-heading ${styles.cardHeading}`}>
              <span className={styles.cardIcon}>
                <Icon name="users" size={17} />
              </span>
              Who this project is for
            </h3>
            <p className={styles.copy}>{analysis.overview.targetAudience}</p>
          </article>
        </div>
        <div className={styles.structureColumn}>
          <div className={styles.sectionHeader}>
            <h3 className="small-heading">At a glance</h3>
            <button
              type="button"
              className={`text-link ${styles.sectionLink}`}
              onClick={() => onNavigate("project-structure")}
            >
              Explore
              <Icon name="arrow" size={13} />
            </button>
          </div>
          <ProjectTree structure={analysis.structure} compact />
        </div>
      </div>
      {analysis.overview.limitations.length > 0 && (
        <details className={styles.analysisDetails}>
          <summary className={styles.analysisSummary}>
            <span className={styles.analysisIcon}>
              <Icon name="info" size={19} />
            </span>
            <span className={styles.analysisLabel}>
              <span className="small-heading">About this analysis</span>
              <span className={styles.analysisSubtitle}>
                A closer look at the scope and limitations.
              </span>
            </span>
            <span className={styles.noteCount}>
              {analysis.overview.limitations.length}{" "}
              {analysis.overview.limitations.length === 1 ? "note" : "notes"}
            </span>
            <Icon
              name="chevron"
              size={16}
              className={styles.analysisChevron}
            />
          </summary>
          <div className={styles.analysisBody}>
            <p className={styles.analysisIntro}>
              This overview is based on selected repository files. Some files
              or file contents were not included.
            </p>
            <ul className={styles.limitations}>
              {analysis.overview.limitations.map((limitation, index) => (
                <li key={`${index}-${limitation}`}>{limitation}</li>
              ))}
            </ul>
          </div>
        </details>
      )}
      <div className={styles.technologies}>
        <div className={styles.sectionHeader}>
          <h3 className="small-heading">Built with</h3>
          <button
            type="button"
            className={`text-link ${styles.sectionLink}`}
            onClick={() => onNavigate("tech-stack")}
          >
            View tech stack
            <Icon name="arrow" size={13} />
          </button>
        </div>
        {analysis.technologies.length > 0 ? (
          <ul className={styles.techGrid}>
            {analysis.technologies.map((technology) => (
              <li className={styles.techItem} key={technology.name}>
                <TechnologyMark technology={technology} />
                <div className={styles.techLabel}>
                  <p className="text-sm font-medium">{technology.name}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {technology.category}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.copy}>
            No technologies were identified from the available data.
          </p>
        )}
      </div>
    </section>
  );
}

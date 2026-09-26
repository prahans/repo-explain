import { Icon } from "@/components/ui/Icon";
import { ProjectTree } from "@/components/analysis/ProjectTree";
import { TechnologyMark } from "@/components/analysis/TechStackSection";
import type { AnalysisSection } from "@/types/analysis";
import type { LiveRepositoryAnalysis } from "@/types/live-analysis";

export function OverviewSection({
  analysis,
  onNavigate,
}: {
  analysis: LiveRepositoryAnalysis;
  onNavigate: (section: AnalysisSection) => void;
}) {
  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="section-heading">The big picture</h2>
          <p className="section-description">
            Your first look at what this repository is all about.
          </p>
        </div>
      </div>
      <div className="overview-grid">
        <div className="space-y-5">
          <article className="panel-card">
            <h3 className="small-heading flex items-center gap-2">
              <Icon name="repository" size={17} className="text-accent" />
              What this repository does
            </h3>
            <p className="body-copy mt-3">{analysis.overview.summary}</p>
          </article>
          <article className="panel-card">
            <h3 className="small-heading flex items-center gap-2">
              <Icon name="users" size={17} className="text-muted" />
              Who this project is for
            </h3>
            <p className="body-copy mt-3">{analysis.overview.targetAudience}</p>
          </article>
          {analysis.overview.limitations.length > 0 && (
            <article className="panel-card">
              <h3 className="small-heading flex items-center gap-2">
                <Icon name="info" size={17} className="text-muted" />
                Analysis limitations
              </h3>
              <ul className="body-copy mt-3 list-disc space-y-2 pl-5">
                {analysis.overview.limitations.map((limitation, index) => (
                  <li key={`${index}-${limitation}`}>{limitation}</li>
                ))}
              </ul>
            </article>
          )}
        </div>
        <div className="space-y-5">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="small-heading">At a glance</h3>
              <button
                type="button"
                className="text-link"
                onClick={() => onNavigate("project-structure")}
              >
                Explore
                <Icon name="arrow" size={13} />
              </button>
            </div>
            <ProjectTree structure={analysis.structure} compact />
          </div>
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between gap-3">
        <h3 className="small-heading">Built with</h3>
        <button
          type="button"
          className="text-link"
          onClick={() => onNavigate("tech-stack")}
        >
          View tech stack
          <Icon name="arrow" size={13} />
        </button>
      </div>
      {analysis.technologies.length > 0 ? (
        <div className="tech-strip">
          {analysis.technologies.map((technology) => (
            <div className="tech-strip-item" key={technology.name}>
              <TechnologyMark technology={technology} />
              <div>
                <p className="text-sm font-medium">{technology.name}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {technology.category}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="body-copy mt-3">
          No technologies were identified from the available data.
        </p>
      )}
    </section>
  );
}

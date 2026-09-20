import { Icon } from "@/components/ui/Icon";
import { ProjectTree } from "@/components/analysis/ProjectTree";
import { TechnologyMark } from "@/components/analysis/TechStackSection";
import type { AnalysisSection, RepositoryAnalysis } from "@/types/analysis";

export function OverviewSection({ analysis, onNavigate }: { analysis: RepositoryAnalysis; onNavigate: (section: AnalysisSection) => void }) {
  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="section-heading">The big picture</h2><p className="section-description">Your first look at what this repository is all about.</p></div><span className="overview-read-time"><Icon name="clock" size={13} />2 min read</span></div>
      <div className="overview-grid">
        <div className="space-y-5">
          <article className="panel-card">
            <h3 className="small-heading flex items-center gap-2"><Icon name="repository" size={17} className="text-accent" />What this repository does</h3>
            <p className="body-copy mt-3">{analysis.overview.purpose}</p>
            <div className="takeaway"><Icon name="bulb" size={17} /><p>{analysis.overview.takeaway}</p></div>
          </article>
          <article className="panel-card"><h3 className="small-heading flex items-center gap-2"><Icon name="users" size={17} className="text-muted" />Who this project is for</h3><p className="body-copy mt-3">{analysis.overview.audience}</p></article>
        </div>
        <div className="space-y-5">
          <article className="panel-card complexity-card">
            <div className="flex items-center justify-between gap-2"><h3 className="small-heading">Complexity</h3><span className="complexity-badge">{analysis.overview.complexity}</span></div>
            <div className="complexity-bars" aria-hidden="true"><span /><span /><span /><span /><span /></div>
            <p className="text-sm leading-7 text-muted">{analysis.overview.complexityDescription}</p>
          </article>
          <div><div className="mb-3 flex items-center justify-between"><h3 className="small-heading">At a glance</h3><button type="button" className="text-link" onClick={() => onNavigate("project-structure")}>Explore<Icon name="arrow" size={13} /></button></div><ProjectTree structure={analysis.structure} compact /></div>
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between gap-3"><h3 className="small-heading">Built with</h3><button type="button" className="text-link" onClick={() => onNavigate("tech-stack")}>View tech stack<Icon name="arrow" size={13} /></button></div>
      <div className="tech-strip">{analysis.technologies.map((technology) => <div className="tech-strip-item" key={technology.name}><TechnologyMark technology={technology} /><div><p className="text-sm font-medium">{technology.name}</p><p className="mt-0.5 text-xs text-muted">{technology.category}</p></div></div>)}</div>
    </section>
  );
}

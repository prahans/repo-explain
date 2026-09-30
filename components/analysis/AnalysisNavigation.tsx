import { Icon, type IconName } from "@/components/ui/Icon";
import type { AnalysisSection, GeneratedAnalysisSection, SectionStatus } from "@/types/analysis";

const sections: { id: AnalysisSection; label: string; icon: IconName }[] = [
  { id: "overview", label: "Overview", icon: "overview" },
  { id: "tech-stack", label: "Tech Stack", icon: "layers" },
  { id: "project-structure", label: "Project Structure", icon: "folder" },
  { id: "important-files", label: "Important Files", icon: "file" },
  { id: "architecture", label: "Architecture", icon: "architecture" },
  { id: "how-it-works", label: "How It Works", icon: "play" },
  { id: "improvements", label: "Improvements", icon: "bulb" },
];

export function AnalysisNavigation({
  active,
  onChange,
  statuses,
}: {
  active: AnalysisSection;
  onChange: (section: AnalysisSection) => void;
  statuses: Record<GeneratedAnalysisSection, SectionStatus>;
}) {
  return (
    <aside className="analysis-sidebar">
      <p className="eyebrow mb-4 px-3">Explore repository</p>
      <nav className="analysis-nav" aria-label="Analysis sections">
        {sections.map(({ id, label, icon }) => (
          <button
            type="button"
            key={id}
            id={`nav-${id}`}
            aria-pressed={active === id}
            aria-controls="analysis-panel"
            onClick={() => onChange(id)}
          >
            <Icon name={icon} size={17} />
            <span>{label}</span>
            <SectionIndicator status={id === "how-it-works" ? "complete" : statuses[id]} />
          </button>
        ))}
      </nav>
      <div className="sidebar-note">
        <Icon name="sparkles" size={16} />
        <p>A starting point for your next contribution.</p>
        <span>Understand. Explore. Build.</span>
      </div>
    </aside>
  );
}

function SectionIndicator({ status }: { status: SectionStatus }) {
  const label = status === "not-available" ? "Not available" : status;
  return (
    <span className="ml-auto flex shrink-0 items-center text-muted" data-section-status={status}>
      {status === "generating" ? <span className="loading-spinner" aria-hidden="true" />
        : <Icon name={status === "complete" ? "check" : status === "error" ? "alert" : "clock"} size={14} />}
      <span className="sr-only">{label}</span>
    </span>
  );
}

import { Icon, type IconName } from "@/components/ui/Icon";
import type { AnalysisSection } from "@/types/analysis";

const sections: { id: AnalysisSection; label: string; icon: IconName }[] = [
  { id: "overview", label: "Overview", icon: "overview" },
  { id: "tech-stack", label: "Tech Stack", icon: "layers" },
  { id: "project-structure", label: "Project Structure", icon: "folder" },
  { id: "important-files", label: "Important Files", icon: "file" },
  { id: "architecture", label: "Architecture", icon: "architecture" },
  { id: "how-it-works", label: "How It Works", icon: "play" },
  { id: "improvements", label: "Improvements", icon: "bulb" },
];

export function AnalysisNavigation({ active, onChange }: { active: AnalysisSection; onChange: (section: AnalysisSection) => void }) {
  return (
    <aside className="analysis-sidebar">
      <p className="eyebrow mb-4 px-3">Explore repository</p>
      <nav className="analysis-nav" aria-label="Analysis sections">
        {sections.map(({ id, label, icon }) => (
          <button type="button" key={id} id={`nav-${id}`} aria-pressed={active === id} aria-controls="analysis-panel" onClick={() => onChange(id)}>
            <Icon name={icon} size={17} /><span>{label}</span>
            {active === id && <span className="ml-auto size-1.5 shrink-0 rounded-full bg-accent" />}
          </button>
        ))}
      </nav>
      <div className="sidebar-note"><Icon name="sparkles" size={16} /><p>A starting point for your next contribution.</p><span>Understand. Explore. Build.</span></div>
    </aside>
  );
}

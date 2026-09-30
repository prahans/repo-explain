"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { RepositoryHeader } from "@/components/analysis/RepositoryHeader";
import { AnalysisNavigation } from "@/components/analysis/AnalysisNavigation";
import { OverviewSection } from "@/components/analysis/OverviewSection";
import { TechStackSection } from "@/components/analysis/TechStackSection";
import { ProjectTree } from "@/components/analysis/ProjectTree";
import { ImportantFiles } from "@/components/analysis/ImportantFiles";
import { ArchitectureSection } from "@/components/analysis/ArchitectureSection";
import { HowItWorks } from "@/components/analysis/HowItWorks";
import { ImprovementsSection } from "@/components/analysis/ImprovementsSection";
import { SectionPlaceholder } from "@/components/analysis/SectionPlaceholder";
import type { AnalysisSection } from "@/types/analysis";
import type { LiveRepositoryAnalysis } from "@/types/live-analysis";

const sectionTitles = {
  overview: "Overview", "tech-stack": "Tech Stack", "project-structure": "Project Structure",
  "important-files": "Important Files", architecture: "Architecture", improvements: "Improvements",
};

export function AnalysisReport({
  analysis,
}: {
  analysis: LiveRepositoryAnalysis;
}) {
  const [activeSection, setActiveSection] =
    useState<AnalysisSection>("overview");
  const status = activeSection === "how-it-works" ? "complete" : analysis.sectionStatuses[activeSection];
  const showContent = status === "complete" || activeSection === "improvements";

  function navigateFromContent(section: AnalysisSection) {
    setActiveSection(section);
    document.getElementById(`nav-${section}`)?.focus();
  }

  return (
    <>
      <RepositoryHeader repository={analysis.repository} />
      <div className="analysis-layout">
        <AnalysisNavigation
          active={activeSection}
          onChange={setActiveSection}
          statuses={analysis.sectionStatuses}
        />
        <div
          className="analysis-content"
          id="analysis-panel"
          role="region"
          aria-labelledby={`nav-${activeSection}`}
        >
          {!showContent && activeSection !== "how-it-works" && (
            <SectionPlaceholder title={sectionTitles[activeSection]} status={status} message={analysis.sectionErrors[activeSection]} />
          )}
          {showContent && activeSection === "overview" && (
            <OverviewSection
              analysis={analysis}
              onNavigate={navigateFromContent}
            />
          )}
          {showContent && activeSection === "tech-stack" &&
            (analysis.technologies.length > 0 ? (
              <TechStackSection technologies={analysis.technologies} />
            ) : (
              <section>
                <h2 className="section-heading">Tech stack</h2>
                <p className="section-description">
                  No technologies were identified from the available data.
                </p>
              </section>
            ))}
          {showContent && activeSection === "project-structure" && (
            <section>
              <h2 className="section-heading">Find your way around</h2>
              <p className="section-description">
                Explore the source, configuration, and docs. Generated files and
                dependencies are hidden by default.
              </p>
              <div className="mt-6">
                <ProjectTree structure={analysis.structure} />
              </div>
            </section>
          )}
          {showContent && activeSection === "important-files" &&
            (analysis.importantFiles.length > 0 ? (
              <ImportantFiles files={analysis.importantFiles} />
            ) : (
              <section>
                <h2 className="section-heading">Important files</h2>
                <p className="section-description">
                  No files matched the current selection rules.
                </p>
              </section>
            ))}
          {showContent && activeSection === "architecture" &&
            (analysis.architecture.length > 0 ? (
              <ArchitectureSection nodes={analysis.architecture} />
            ) : (
              <section>
                <h2 className="section-heading">Architecture</h2>
                <p className="section-description">No architecture components were identified from the supplied files.</p>
              </section>
            ))}
          {activeSection === "how-it-works" && (
            <HowItWorks
              repository={analysis.repository}
              selectedFileCount={analysis.selectedFileCount}
            />
          )}
          {activeSection === "improvements" && (
            <ImprovementsSection
              improvements={analysis.improvements}
              summary={analysis.improvementsSummary}
              status={analysis.sectionStatuses.improvements}
            />
          )}
        </div>
      </div>
      <div className="report-footer">
        <span>
          <Icon name="info" size={13} />
          AI overview based on selected repository files. Check the analysis
          limitations for gaps.
        </span>
        <span className="hidden sm:inline">Made for understanding</span>
      </div>
    </>
  );
}

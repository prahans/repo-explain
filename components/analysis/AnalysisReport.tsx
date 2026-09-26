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
import type { AnalysisSection } from "@/types/analysis";
import type { LiveRepositoryAnalysis } from "@/types/live-analysis";

function PendingSection({ title }: { title: string }) {
  return (
    <section>
      <h2 className="section-heading">{title}</h2>
      <p className="section-description">
        This section has not been generated for this repository yet.
      </p>
    </section>
  );
}

export function AnalysisReport({
  analysis,
}: {
  analysis: LiveRepositoryAnalysis;
}) {
  const [activeSection, setActiveSection] =
    useState<AnalysisSection>("overview");

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
        />
        <div
          className="analysis-content"
          id="analysis-panel"
          role="region"
          aria-labelledby={`nav-${activeSection}`}
        >
          {activeSection === "overview" && (
            <OverviewSection
              analysis={analysis}
              onNavigate={navigateFromContent}
            />
          )}
          {activeSection === "tech-stack" &&
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
          {activeSection === "project-structure" && (
            <section>
              <h2 className="section-heading">Find your way around</h2>
              <p className="section-description">
                The file tree returned by GitHub. Select a folder to open or
                close it.
              </p>
              <div className="mt-6">
                <ProjectTree structure={analysis.structure} />
              </div>
            </section>
          )}
          {activeSection === "important-files" &&
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
          {activeSection === "architecture" &&
            (analysis.architecture.length > 0 ? (
              <ArchitectureSection nodes={analysis.architecture} />
            ) : (
              <PendingSection title="Architecture" />
            ))}
          {activeSection === "how-it-works" &&
            (analysis.steps.length > 0 ? (
              <HowItWorks steps={analysis.steps} />
            ) : (
              <PendingSection title="How it works" />
            ))}
          {activeSection === "improvements" &&
            (analysis.improvements.length > 0 ? (
              <ImprovementsSection improvements={analysis.improvements} />
            ) : (
              <PendingSection title="Improvements" />
            ))}
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

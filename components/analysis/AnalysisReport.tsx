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
import type { AnalysisSection, RepositoryAnalysis } from "@/types/analysis";

export function AnalysisReport({ analysis }: { analysis: RepositoryAnalysis }) {
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
          {activeSection === "tech-stack" && (
            <TechStackSection technologies={analysis.technologies} />
          )}
          {activeSection === "project-structure" && (
            <section>
              <h2 className="section-heading">Find your way around</h2>
              <p className="section-description">
                An annotated map of the project. Select a folder to open or
                close it.
              </p>
              <div className="mt-6">
                <ProjectTree structure={analysis.structure} />
              </div>
            </section>
          )}
          {activeSection === "important-files" && (
            <ImportantFiles files={analysis.importantFiles} />
          )}
          {activeSection === "architecture" && (
            <ArchitectureSection nodes={analysis.architecture} />
          )}
          {activeSection === "how-it-works" && (
            <HowItWorks steps={analysis.steps} />
          )}
          {activeSection === "improvements" && (
            <ImprovementsSection improvements={analysis.improvements} />
          )}
        </div>
      </div>
      <div className="report-footer">
        <span>
          <Icon name="info" size={13} />
          Sample analysis for username/repo-explain. All content and metadata
          are mock data.
        </span>
        <span className="hidden sm:inline">Made for understanding</span>
      </div>
    </>
  );
}

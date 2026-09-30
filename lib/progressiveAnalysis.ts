import { buildProjectTree } from "./projectTree";
import { mapImportantFiles, mapRepositoryMetadata, mapSectionStatuses, mapTechnologies, repositoryFramework } from "./mapRepositoryResponse";
import { sectionNavigation, type AnalysisUpdate, type PreparedRepository, type RepositoryMetadata } from "./analysisProtocol";
import type { LiveRepositoryAnalysis } from "../types/live-analysis";

export function createProgressiveAnalysis(repository: RepositoryMetadata): LiveRepositoryAnalysis {
  return {
    repository: mapRepositoryMetadata(repository),
    overview: { summary: "", targetAudience: "", limitations: [], fileExplanations: [] },
    technologies: [], structure: { name: repository.name, children: [] }, importantFiles: [], architecture: [],
    steps: [], improvements: [], sectionStatuses: mapSectionStatuses({}, "waiting"), sectionErrors: {},
  };
}

/** Immutable updates preserve the current report and sidebar selection. */
export function applyAnalysisUpdate(
  analysis: LiveRepositoryAnalysis,
  event: AnalysisUpdate,
  prepared?: PreparedRepository,
): LiveRepositoryAnalysis {
  if (event.type === "prepared") {
    return {
      ...analysis,
      repository: { ...analysis.repository, framework: repositoryFramework(event.data.technologies) },
      technologies: mapTechnologies(event.data.technologies),
      structure: buildProjectTree(analysis.repository.name, event.data.tree),
      importantFiles: mapImportantFiles(event.data.importantFiles, event.data.fileContents, []),
      selectedFileCount: event.data.importantFiles.length,
    };
  }
  if (event.type !== "section" && event.type !== "section-status") return analysis;
  const section = sectionNavigation[event.section];
  // A delayed status must not replace data already delivered for this section.
  if (analysis.sectionStatuses[section] === "complete") return analysis;
  const next: LiveRepositoryAnalysis = {
    ...analysis,
    sectionStatuses: { ...analysis.sectionStatuses, [section]: event.type === "section" ? "complete" : event.status },
    sectionErrors: { ...analysis.sectionErrors },
  };
  if (event.type === "section-status") {
    if (event.message) next.sectionErrors[section] = event.message;
    return next;
  }
  switch (event.section) {
    case "overview": next.overview = { ...next.overview, ...event.data }; break;
    // Preserve the complete deterministic GitHub data, including tree paths
    // beyond the truncated context given to the model.
    case "techStack": next.technologies = mapTechnologies(prepared?.technologies ?? event.data); break;
    case "projectStructure":
      next.structure = buildProjectTree(next.repository.name, prepared?.tree ?? event.data.map((path) => ({ path, type: "blob" })));
      break;
    case "importantFiles":
      next.importantFiles = mapImportantFiles(prepared?.importantFiles ?? next.importantFiles, prepared?.fileContents ?? [], event.data);
      next.overview = { ...next.overview, fileExplanations: event.data };
      break;
    case "architecture": next.architecture = event.data; break;
    case "improvements":
      next.improvements = event.data.improvements;
      next.improvementsSummary = event.data.summary;
      break;
  }
  return next;
}

export function finishAnalysis(analysis: LiveRepositoryAnalysis, error?: string): LiveRepositoryAnalysis {
  const statuses = { ...analysis.sectionStatuses };
  const errors = { ...analysis.sectionErrors };
  for (const section of Object.values(sectionNavigation)) {
    if (statuses[section] === "waiting" || statuses[section] === "generating") {
      statuses[section] = error ? "error" : "not-available";
      if (error) errors[section] = error;
    }
  }
  return { ...analysis, sectionStatuses: statuses, sectionErrors: errors };
}

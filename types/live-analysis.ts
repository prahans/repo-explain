import type { FileExplanation, GeneratedAnalysisSection, SectionStatus, RepositoryAnalysis } from "@/types/analysis";

// Keep the existing mock/demo types intact. Live data has a different overview.
export type LiveRepositoryAnalysis = Omit<RepositoryAnalysis, "overview"> & {
  improvementsSummary?: string;
  sectionStatuses: Record<GeneratedAnalysisSection, SectionStatus>;
  sectionErrors: Partial<Record<GeneratedAnalysisSection, string>>;
  selectedFileCount?: number;
  overview: {
    summary: string;
    targetAudience: string;
    limitations: string[];
    fileExplanations: FileExplanation[];
  };
};

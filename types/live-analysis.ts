import type { FileExplanation, RepositoryAnalysis } from "@/types/analysis";

// Keep the existing mock/demo types intact. Live data has a different overview.
export type LiveRepositoryAnalysis = Omit<RepositoryAnalysis, "overview"> & {
  overview: {
    summary: string;
    targetAudience: string;
    limitations: string[];
    fileExplanations: FileExplanation[];
  };
};

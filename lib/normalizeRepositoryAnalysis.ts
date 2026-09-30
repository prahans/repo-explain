import type {
  PreparedRepository,
  RepositoryMetadata,
} from "./analysisProtocol";

import type { RepositoryOverview } from "./generateOverview";

export const CURRENT_ANALYSIS_VERSION = 1;

type FileContentMetadata = {
  path: string;
  truncated: boolean;
  error: string | null;
};

type NormalizeRepositoryAnalysisInput = {
  repository: RepositoryMetadata;
  tree: PreparedRepository["tree"];
  importantFiles: PreparedRepository["importantFiles"];
  technologies: string[];
  fileContents: FileContentMetadata[];
  overview: RepositoryOverview;

  revision: string;
  treeTruncated: boolean;
};

/**
 * Converts the raw analysis pipeline result into the clean shape
 * that will eventually be persisted in MongoDB.
 *
 * Important:
 * - Does NOT store source-code contents.
 * - Does NOT store README contents.
 * - Does NOT store repositoryContext / AI prompt input.
 * - Does NOT contain UI-only formatting.
 */
export function normalizeRepositoryAnalysis({
  repository,
  tree,
  importantFiles,
  technologies,
  fileContents,
  overview,
  revision,
  treeTruncated,
}: NormalizeRepositoryAnalysisInput) {
  const fileMetadataByPath = new Map(
    fileContents.map((file) => [file.path, file]),
  );

  const explanationByPath = new Map(
    overview.fileExplanations.map((explanation) => [
      explanation.path,
      explanation,
    ]),
  );

  const [owner] = repository.fullName.split("/");

  const sectionStatuses = {
    ...overview.sectionStatuses,
  };

  const status = Object.values(sectionStatuses).every(
    (sectionStatus) => sectionStatus === "complete",
  )
    ? "completed"
    : "partial";

  return {
    repository: {
      owner,

      name: repository.name,

      fullName: repository.fullName,

      /**
       * GitHub repository names are effectively case-insensitive.
       * This gives us one consistent value for MongoDB lookups.
       *
       * Example:
       * Facebook/React -> facebook/react
       */
      repoKey: repository.fullName.toLowerCase(),

      description: repository.description,

      language: repository.language,

      defaultBranch: repository.defaultBranch,

      url: repository.url,

      stars: repository.stars ?? null,

      license: repository.license ?? null,
    },

    source: {
      revision,
      treeTruncated,
    },

    analysis: {
      overview: {
        summary: overview.summary,

        targetAudience: overview.targetAudience,

        limitations: [...overview.limitations],
      },

      /**
       * Store only the actual detected technology names.
       *
       * UI fields such as mark, color, description, etc.
       * can continue to be created by mapTechnologies().
       */
      technologies: [...new Set(technologies)],

      /**
       * Store repository paths + GitHub entry types.
       *
       * This gives us enough data to rebuild the ProjectNode
       * tree later using buildProjectTree().
       */
      structure: {
        entries: tree.map((entry) => ({
          path: entry.path,
          type: entry.type,
        })),

        totalEntries: tree.length,

        truncated: treeTruncated,
      },

      /**
       * Store explanations, but NOT the actual source-code content.
       */

      importantFiles: importantFiles.map((file) => {
        const explanation = explanationByPath.get(file.path);
        const metadata = fileMetadataByPath.get(file.path);

        return {
          path: file.path,

          type: file.type,

          purpose: explanation?.purpose ?? null,

          significance: explanation?.significance ?? null,

          explanationStatus: explanation
            ? ("available" as const)
            : ("unavailable" as const),

          truncated: metadata?.truncated ?? false,

          error: metadata?.error ?? null,
        };
      }),

      architecture: overview.architecture.map((node) => ({
        name: node.name,

        description: node.description,

        layer: node.layer,
      })),

      improvements: overview.improvements
        ? {
            summary: overview.improvements.summary,

            items: overview.improvements.improvements.map((improvement) => ({
              id: improvement.id,

              title: improvement.title,

              category: improvement.category,

              priority: improvement.priority,

              description: improvement.description,

              reason: improvement.reason,

              recommendation: improvement.recommendation,

              relatedFiles: [...new Set(improvement.relatedFiles ?? [])],
            })),
          }
        : null,
    },

    sectionStatuses,

    status,

    metadata: {
      analysisVersion: CURRENT_ANALYSIS_VERSION,

      filesScanned: tree.filter((entry) => entry.type === "blob").length,

      filesSelected: importantFiles.length,
    },

    analyzedAt: new Date(),
  };
}

export type NormalizedRepositoryAnalysis = ReturnType<
  typeof normalizeRepositoryAnalysis
>;

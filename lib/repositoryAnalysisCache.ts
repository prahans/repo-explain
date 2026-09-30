import "server-only";

import { connectToDatabase } from "@/lib/mongodb";
import {
  CURRENT_ANALYSIS_VERSION,
  type NormalizedRepositoryAnalysis,
} from "@/lib/normalizeRepositoryAnalysis";

import RepositoryAnalysis from "@/models/RepositoryAnalysis";

import type { AnalysisUpdate, ModelSection } from "@/lib/analysisProtocol";

type CachedAnalysis = NormalizedRepositoryAnalysis;

export async function findCachedRepositoryAnalysis(
  repoKey: string,
  revision: string,
): Promise<CachedAnalysis | null> {
  await connectToDatabase();

  const document = await RepositoryAnalysis.findOne({
    "repository.repoKey": repoKey.toLowerCase(),
    "source.revision": revision,
    "metadata.analysisVersion": CURRENT_ANALYSIS_VERSION,
  }).lean();

  return document as unknown as CachedAnalysis | null;
}

/**
 * Replays a stored analysis using the exact progressive event format
 * already understood by RepoExplain.tsx.
 */
export function replayCachedRepositoryAnalysis(
  cached: CachedAnalysis,
  onUpdate?: (event: AnalysisUpdate) => void,
) {
  if (!onUpdate) return;

  const prepared = {
    tree: cached.analysis.structure.entries.map((entry) => ({
      path: entry.path,
      type: entry.type,
    })),

    importantFiles: cached.analysis.importantFiles.map((file) => ({
      path: file.path,
      type: file.type,
    })),

    fileContents: cached.analysis.importantFiles.map((file) => ({
      path: file.path,
      truncated: file.truncated,
      error: file.error ?? null,
    })),

    technologies: cached.analysis.technologies,
  };

  onUpdate({
    type: "prepared",
    data: prepared,
  });

  const emitUnavailable = (
    section: ModelSection,
    status: "error" | "not-available",
  ) => {
    onUpdate({
      type: "section-status",
      section,
      status,
    });
  };

  /* ---------------------------------------------------------------------- */
  /* Overview                                                               */
  /* ---------------------------------------------------------------------- */

  if (cached.sectionStatuses.overview === "complete") {
    onUpdate({
      type: "section",
      section: "overview",
      data: {
        summary: cached.analysis.overview.summary,
        targetAudience: cached.analysis.overview.targetAudience,
        limitations: cached.analysis.overview.limitations,
      },
    });
  } else {
    emitUnavailable("overview", cached.sectionStatuses.overview);
  }

  /* ---------------------------------------------------------------------- */
  /* Tech stack                                                             */
  /* ---------------------------------------------------------------------- */

  if (cached.sectionStatuses.techStack === "complete") {
    onUpdate({
      type: "section",
      section: "techStack",
      data: cached.analysis.technologies,
    });
  } else {
    emitUnavailable("techStack", cached.sectionStatuses.techStack);
  }

  /* ---------------------------------------------------------------------- */
  /* Project structure                                                      */
  /* ---------------------------------------------------------------------- */

  if (cached.sectionStatuses.projectStructure === "complete") {
    onUpdate({
      type: "section",
      section: "projectStructure",
      data: cached.analysis.structure.entries.map((entry) => entry.path),
    });
  } else {
    emitUnavailable(
      "projectStructure",
      cached.sectionStatuses.projectStructure,
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Important files                                                        */
  /* ---------------------------------------------------------------------- */

  if (cached.sectionStatuses.importantFiles === "complete") {
    onUpdate({
      type: "section",
      section: "importantFiles",
      data: cached.analysis.importantFiles
        .filter(
          (
            file,
          ): file is typeof file & {
            purpose: string;
            significance: string;
          } =>
            file.explanationStatus === "available" &&
            typeof file.purpose === "string" &&
            typeof file.significance === "string",
        )
        .map((file) => ({
          path: file.path,
          purpose: file.purpose,
          significance: file.significance,
        })),
    });
  } else {
    emitUnavailable("importantFiles", cached.sectionStatuses.importantFiles);
  }

  /* ---------------------------------------------------------------------- */
  /* Architecture                                                           */
  /* ---------------------------------------------------------------------- */

  if (cached.sectionStatuses.architecture === "complete") {
    onUpdate({
      type: "section",
      section: "architecture",
      data: cached.analysis.architecture,
    });
  } else {
    emitUnavailable("architecture", cached.sectionStatuses.architecture);
  }

  /* ---------------------------------------------------------------------- */
  /* Improvements                                                           */
  /* ---------------------------------------------------------------------- */

  if (
    cached.sectionStatuses.improvements === "complete" &&
    cached.analysis.improvements
  ) {
    onUpdate({
      type: "section",
      section: "improvements",
      data: {
        summary: cached.analysis.improvements.summary,
        improvements: cached.analysis.improvements.items,
      },
    });
  } else {
    emitUnavailable(
      "improvements",
      cached.sectionStatuses.improvements === "complete"
        ? "not-available"
        : cached.sectionStatuses.improvements,
    );
  }
}

/**
 * Rebuilds the legacy JSON response consumed by mapRepositoryResponse().
 *
 * This is used for non-streaming requests.
 */
export function cachedAnalysisToResponse(cached: CachedAnalysis) {
  const repository = {
    name: cached.repository.name,
    fullName: cached.repository.fullName,
    description: cached.repository.description,
    language: cached.repository.language,
    defaultBranch: cached.repository.defaultBranch,
    url: cached.repository.url,

    ...(cached.repository.stars !== null
      ? { stars: cached.repository.stars }
      : {}),

    license: cached.repository.license,
  };

  const importantFiles = cached.analysis.importantFiles.map((file) => ({
    path: file.path,
    type: file.type,
  }));

  const fileContents = cached.analysis.importantFiles.map((file) => ({
    path: file.path,
    truncated: file.truncated,
    error: file.error ?? null,
  }));

  const fileExplanations = cached.analysis.importantFiles
    .filter(
      (
        file,
      ): file is typeof file & {
        purpose: string;
        significance: string;
      } =>
        file.explanationStatus === "available" &&
        typeof file.purpose === "string" &&
        typeof file.significance === "string",
    )
    .map((file) => ({
      path: file.path,
      purpose: file.purpose,
      significance: file.significance,
    }));

  return {
    repository,

    technologies: cached.analysis.technologies,

    tree: cached.analysis.structure.entries,

    importantFiles,

    fileContents,

    overview: {
      summary: cached.analysis.overview.summary,

      targetAudience: cached.analysis.overview.targetAudience,

      limitations: cached.analysis.overview.limitations,

      fileExplanations,

      architecture: cached.analysis.architecture,

      improvements: cached.analysis.improvements
        ? {
            summary: cached.analysis.improvements.summary,

            improvements: cached.analysis.improvements.items,
          }
        : undefined,

      improvementsStatus: cached.sectionStatuses.improvements,

      sectionStatuses: cached.sectionStatuses,
    },
  };
}

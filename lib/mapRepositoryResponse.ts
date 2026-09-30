import * as z from "zod";
import { buildProjectTree } from "@/lib/projectTree";
import { parseImprovements } from "./improvements";
import { fileMetadataSchema, fileSchema, repositorySchema, sectionNavigation, sectionOrder, sectionSchemas, type ModelSection, type PreparedRepository, type RepositoryMetadata } from "./analysisProtocol";
import type { FileExplanation, GeneratedAnalysisSection, ImportantFile, SectionStatus, Technology } from "@/types/analysis";
import type { LiveRepositoryAnalysis } from "@/types/live-analysis";

// Keep legacy final JSON responses supported alongside progressive section events.
const responseSchema = z.object({
  repository: repositorySchema,
  technologies: z.array(z.string()),
  tree: z.array(fileSchema),
  importantFiles: z.array(fileSchema),
  fileContents: z.array(fileMetadataSchema).default([]),
  overview: sectionSchemas.overview.extend({
    fileExplanations: z.array(z.object({ path: z.string(), purpose: z.string(), significance: z.string() })).default([]),
    architecture: sectionSchemas.architecture.default([]),
    improvements: z.unknown().optional(),
    improvementsStatus: z.enum(["complete", "error", "not-available"]).optional(),
    sectionStatuses: z.record(z.enum(sectionOrder), z.enum(["complete", "error", "not-available"])).optional(),
  }),
});

export function mapSectionStatuses(
  statuses: Partial<Record<ModelSection, SectionStatus>> = {},
  fallback: SectionStatus = "complete",
): Record<GeneratedAnalysisSection, SectionStatus> {
  return Object.fromEntries(sectionOrder.map((name) => [sectionNavigation[name], statuses[name] ?? fallback])) as Record<GeneratedAnalysisSection, SectionStatus>;
}

export function repositoryFramework(technologies: string[]): string {
  const frameworks = new Set(["Next.js", "React", "Vue", "Angular", "Svelte", "Express", "Django", "Flask", "FastAPI"]);
  return technologies.find((name) => frameworks.has(name)) ?? "Not identified";
}

export function mapRepositoryMetadata(repository: RepositoryMetadata, technologies: string[] = []): LiveRepositoryAnalysis["repository"] {
  return {
    name: repository.name,
    owner: repository.fullName.split("/")[0],
    description: repository.description ?? "No repository description provided.",
    language: repository.language ?? "Not reported",
    framework: repositoryFramework(technologies),
    stars: repository.stars?.toLocaleString("en-US") ?? "Unknown",
    branch: repository.defaultBranch,
    url: repository.url,
    license: repository.license === undefined ? "Unknown" : repository.license ?? "Not specified",
  };
}

export function mapTechnologies(names: string[]): Technology[] {
  return [...new Set(names)].map((name) => ({
    name, category: "Detected technology",
    description: "Detected from repository metadata, dependencies, or file paths.",
    mark: name.slice(0, 2).toUpperCase(), color: "ink",
  }));
}

export function mapImportantFiles(
  files: PreparedRepository["importantFiles"],
  fileContents: PreparedRepository["fileContents"],
  candidates: FileExplanation[],
): ImportantFile[] {
  const details = new Map(fileContents.map((file) => [file.path, file]));
  const paths = new Set(files.map((file) => file.path));
  const explanations = new Map<string, FileExplanation>();
  for (const item of candidates) {
    const purpose = item.purpose.trim();
    const significance = item.significance.trim();
    if (paths.has(item.path) && !details.get(item.path)?.error && !explanations.has(item.path) && purpose && significance) {
      explanations.set(item.path, { path: item.path, purpose, significance });
    }
  }
  return files.map((file) => {
    const explanation = explanations.get(file.path);
    return {
      path: file.path, type: file.type,
      purpose: explanation?.purpose ?? "No file explanation available.",
      significance: explanation?.significance ?? (details.get(file.path)?.error
        ? "The file could not be read for this analysis."
        : "The analysis did not return an explanation for this file."),
      explanationStatus: explanation ? "available" : "unavailable",
      truncated: details.get(file.path)?.truncated ?? false,
    };
  });
}

export function mapRepositoryResponse(value: unknown): LiveRepositoryAnalysis {
  const parsed = responseSchema.safeParse(value);
  if (!parsed.success) throw new Error("The server returned an incomplete analysis. Please try again.");
  const data = parsed.data;
  const improvements = parseImprovements(
    data.overview.improvements === null && data.overview.improvementsStatus === "not-available" ? undefined : data.overview.improvements,
    new Set([...data.tree, ...data.importantFiles].map((file) => file.path)),
  );
  const improvementsStatus = data.overview.improvementsStatus === "error" ? "error" : improvements.status;
  const importantFiles = mapImportantFiles(data.importantFiles, data.fileContents, data.overview.fileExplanations);
  return {
    repository: mapRepositoryMetadata(data.repository, data.technologies),
    overview: {
      summary: data.overview.summary, targetAudience: data.overview.targetAudience, limitations: data.overview.limitations,
      fileExplanations: importantFiles.filter((file) => file.explanationStatus === "available").map(({ path, purpose, significance }) => ({ path, purpose, significance })),
    },
    technologies: mapTechnologies(data.technologies),
    structure: buildProjectTree(data.repository.name, data.tree),
    importantFiles,
    architecture: data.overview.architecture,
    steps: [],
    improvements: improvementsStatus === "complete" ? improvements.data?.improvements ?? [] : [],
    improvementsSummary: improvementsStatus === "complete" ? improvements.data?.summary : undefined,
    sectionStatuses: { ...mapSectionStatuses(data.overview.sectionStatuses), improvements: improvementsStatus },
    sectionErrors: {},
    selectedFileCount: data.importantFiles.length,
  };
}

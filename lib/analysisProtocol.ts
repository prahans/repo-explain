import * as z from "zod";
import { improvementsSchema } from "./improvements";

export const sectionOrder = ["overview", "techStack", "projectStructure", "importantFiles", "architecture", "improvements"] as const;
export type ModelSection = (typeof sectionOrder)[number];
export const sectionNavigation = {
  overview: "overview", techStack: "tech-stack", projectStructure: "project-structure",
  importantFiles: "important-files", architecture: "architecture", improvements: "improvements",
} as const;

export const repositorySchema = z.object({
  name: z.string().min(1), fullName: z.string().regex(/^[^/]+\/[^/]+$/),
  description: z.string().nullable(), language: z.string().nullable(),
  defaultBranch: z.string().min(1), url: z.url(),
  stars: z.number().int().nonnegative().optional(), license: z.string().nullable().optional(),
});
export type RepositoryMetadata = z.infer<typeof repositorySchema>;

export const fileSchema = z.object({ path: z.string(), type: z.string() });
export const fileMetadataSchema = z.object({
  path: z.string(), truncated: z.boolean().default(false), error: z.string().nullable().default(null),
});
export const preparedSchema = z.object({
  tree: z.array(fileSchema), importantFiles: z.array(fileSchema),
  fileContents: z.array(fileMetadataSchema), technologies: z.array(z.string()),
});
export type PreparedRepository = z.infer<typeof preparedSchema>;

export const sectionSchemas = {
  overview: z.object({
    summary: z.string().trim().min(1).describe("Explain what the project does in 2–4 beginner-friendly sentences."),
    targetAudience: z.string().trim().min(1).describe("Describe the intended users in 1–2 sentences. State if uncertain."),
    limitations: z.array(z.string().trim().min(1)).describe("List gaps caused by missing, unreadable, or truncated content."),
  }),
  techStack: z.array(z.string().trim().min(1)).describe("Copy the supplied technologies list exactly; do not invent dependencies."),
  projectStructure: z.array(z.string().min(1)).describe("Copy the supplied structure.paths exactly; never invent or rename paths."),
  importantFiles: z.array(z.object({
    path: z.string().min(1).describe("The exact relative path from selectedFiles."),
    purpose: z.string().trim().min(1).describe("Explain what this file does in one or two short sentences."),
    significance: z.string().trim().min(1).describe("Explain why this file matters to understanding the project."),
  })),
  architecture: z.array(z.object({
    name: z.string().trim().min(1).describe("A short name for a major part of the application."),
    description: z.string().trim().min(1).describe("Explain responsibilities and connections. Mention supporting file paths when available."),
    layer: z.enum(["Browser", "Server", "External service", "Output"]),
  })).max(6),
  improvements: improvementsSchema,
};
export const modelAnalysisSchema = z.object(sectionSchemas);
export type ModelAnalysis = z.infer<typeof modelAnalysisSchema>;

// Each discriminated variant validates a whole section, never a partial token.
const sectionEventSchema = z.discriminatedUnion("section", [
  z.object({ type: z.literal("section"), section: z.literal("overview"), data: sectionSchemas.overview }),
  z.object({ type: z.literal("section"), section: z.literal("techStack"), data: sectionSchemas.techStack }),
  z.object({ type: z.literal("section"), section: z.literal("projectStructure"), data: sectionSchemas.projectStructure }),
  z.object({ type: z.literal("section"), section: z.literal("importantFiles"), data: sectionSchemas.importantFiles }),
  z.object({ type: z.literal("section"), section: z.literal("architecture"), data: sectionSchemas.architecture }),
  z.object({ type: z.literal("section"), section: z.literal("improvements"), data: improvementsSchema }),
]);
export type SectionEvent = z.infer<typeof sectionEventSchema>;
export const preparationStageSchema = z.enum([
  "connecting", "loading_repository", "scanning_files", "selecting_files", "preparing_context", "generating_analysis",
]);
export type PreparationStage = z.infer<typeof preparationStageSchema>;

export const analysisUpdateSchema = z.union([
  z.object({ type: z.literal("repository"), data: repositorySchema }),
  z.object({ type: z.literal("prepared"), data: preparedSchema }),
  z.object({ type: z.literal("status"), stage: preparationStageSchema,
    filesScanned: z.number().int().nonnegative().optional(), filesSelected: z.number().int().nonnegative().optional() }),
  sectionEventSchema,
  z.object({ type: z.literal("section-status"), section: z.enum(sectionOrder),
    status: z.enum(["generating", "error", "not-available"]), message: z.string().optional() }),
]);
export type AnalysisUpdate = z.infer<typeof analysisUpdateSchema>;
export type AnalysisStreamEvent = AnalysisUpdate
  | { type: "complete" }
  | { type: "error"; message: string; status: number };

import * as z from "zod";

const improvementSchema = z.object({
  id: z.string().trim().min(1).describe("A unique, short identifier for this recommendation."),
  title: z.string().trim().min(1),
  category: z.enum([
    "architecture",
    "code-quality",
    "performance",
    "security",
    "testing",
    "developer-experience",
  ]),
  priority: z.enum(["high", "medium", "low"]),
  description: z.string().trim().min(1).describe("The specific pattern observed in the supplied repository context."),
  reason: z.string().trim().min(1).describe("Why this pattern matters, with uncertainty stated where appropriate."),
  recommendation: z.string().trim().min(1).describe("A concrete, actionable change supported by the evidence."),
  relatedFiles: z
    .array(z.string().min(1))
    .describe("Exact paths from the supplied context. Return an empty array when no specific file applies."),
});

// Provider-native strict output requires every key, including relatedFiles.
export const improvementsSchema = z.object({
  summary: z.string().trim().min(1),
  improvements: z.array(improvementSchema).max(8),
});

// Older responses and file-independent recommendations may omit relatedFiles.
const improvementsParsingSchema = improvementsSchema.extend({
  improvements: z.array(improvementSchema.extend({
    relatedFiles: improvementSchema.shape.relatedFiles.optional(),
  })).max(8),
});

export type ImprovementsData = z.infer<typeof improvementsParsingSchema>;
export type Improvement = ImprovementsData["improvements"][number];
export type ImprovementCategory = Improvement["category"];
export type ImprovementPriority = Improvement["priority"];

type ImprovementsResult =
  | { status: "complete"; data: ImprovementsData }
  | { status: "error" | "not-available"; data: null };

/** Validate independently so an unusable recommendation cannot hide the report. */
export function parseImprovements(
  value: unknown,
  allowedPaths: ReadonlySet<string>,
): ImprovementsResult {
  if (value === undefined) return { status: "not-available", data: null };

  const result = improvementsParsingSchema.safeParse(value);
  if (!result.success) return { status: "error", data: null };

  const seenIds = new Set<string>();
  for (const item of result.data.improvements) {
    if (
      seenIds.has(item.id) ||
      item.relatedFiles?.some((path) => !allowedPaths.has(path))
    ) {
      // Do not display recommendations backed by invented paths, or silently
      // turn invalid recommendations into a successful empty analysis.
      return { status: "error", data: null };
    }
    seenIds.add(item.id);
  }

  return {
    status: "complete",
    data: {
      ...result.data,
      improvements: result.data.improvements.map((item) => ({
        ...item,
        relatedFiles: [...new Set(item.relatedFiles ?? [])],
      })),
    },
  };
}

/** Only paths actually supplied to this generation may be cited. */
export function getContextPaths(context: Record<string, unknown>): Set<string> {
  const paths = new Set<string>();
  if (Array.isArray(context.selectedFiles)) {
    for (const file of context.selectedFiles) {
      if (file && typeof file === "object" && typeof file.path === "string") {
        paths.add(file.path);
      }
    }
  }
  const structure = context.structure;
  if (structure && typeof structure === "object" && "paths" in structure && Array.isArray(structure.paths)) {
    for (const path of structure.paths) {
      if (typeof path === "string") paths.add(path);
    }
  }
  return paths;
}

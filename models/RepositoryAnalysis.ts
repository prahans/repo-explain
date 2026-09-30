import "server-only";

import mongoose, { type InferSchemaType, type Model, Schema } from "mongoose";

const architectureLayers = [
  "Browser",
  "Server",
  "External service",
  "Output",
] as const;

const improvementCategories = [
  "architecture",
  "code-quality",
  "performance",
  "security",
  "testing",
  "developer-experience",
] as const;

const improvementPriorities = ["high", "medium", "low"] as const;

const persistedSectionStatuses = [
  "complete",
  "error",
  "not-available",
] as const;

/* -------------------------------------------------------------------------- */
/* Repository                                                                 */
/* -------------------------------------------------------------------------- */

const repositorySchema = new Schema(
  {
    owner: {
      type: String,
      required: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    repoKey: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    description: {
      type: String,
      default: null,
    },

    language: {
      type: String,
      default: null,
    },

    defaultBranch: {
      type: String,
      required: true,
    },

    url: {
      type: String,
      required: true,
    },

    stars: {
      type: Number,
      default: null,
      min: 0,
    },

    license: {
      type: String,
      default: null,
    },
  },
  {
    _id: false,
  },
);

/* -------------------------------------------------------------------------- */
/* Overview                                                                   */
/* -------------------------------------------------------------------------- */

const overviewSchema = new Schema(
  {
    summary: {
      type: String,
      required: true,
    },

    targetAudience: {
      type: String,
      required: true,
    },

    limitations: {
      type: [String],
      default: [],
    },
  },
  {
    _id: false,
  },
);

/* -------------------------------------------------------------------------- */
/* Repository structure                                                       */
/* -------------------------------------------------------------------------- */

const structureEntrySchema = new Schema(
  {
    path: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      required: true,
    },
  },
  {
    _id: false,
  },
);

const structureSchema = new Schema(
  {
    entries: {
      type: [structureEntrySchema],
      default: [],
    },

    totalEntries: {
      type: Number,
      required: true,
      min: 0,
    },

    truncated: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false,
  },
);

/* -------------------------------------------------------------------------- */
/* Important files                                                            */
/* -------------------------------------------------------------------------- */

const importantFileSchema = new Schema(
  {
    path: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      required: true,
    },

    purpose: {
      type: String,
      default: null,
    },

    significance: {
      type: String,
      default: null,
    },

    explanationStatus: {
      type: String,
      enum: ["available", "unavailable"],
      required: true,
    },

    truncated: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false,
  },
);

/* -------------------------------------------------------------------------- */
/* Architecture                                                               */
/* -------------------------------------------------------------------------- */

const architectureSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    layer: {
      type: String,
      enum: architectureLayers,
      required: true,
    },
  },
  {
    _id: false,
  },
);

/* -------------------------------------------------------------------------- */
/* Improvements                                                               */
/* -------------------------------------------------------------------------- */

const improvementSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      enum: improvementCategories,
      required: true,
    },

    priority: {
      type: String,
      enum: improvementPriorities,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    reason: {
      type: String,
      required: true,
    },

    recommendation: {
      type: String,
      required: true,
    },

    relatedFiles: {
      type: [String],
      default: [],
    },
  },
  {
    _id: false,
  },
);

const improvementsSchema = new Schema(
  {
    summary: {
      type: String,
      required: true,
    },

    items: {
      type: [improvementSchema],
      default: [],
    },
  },
  {
    _id: false,
  },
);

/* -------------------------------------------------------------------------- */
/* Complete analysis                                                          */
/* -------------------------------------------------------------------------- */

const analysisSchema = new Schema(
  {
    overview: {
      type: overviewSchema,
      required: true,
    },

    technologies: {
      type: [String],
      default: [],
    },

    structure: {
      type: structureSchema,
      required: true,
    },

    importantFiles: {
      type: [importantFileSchema],
      default: [],
    },

    architecture: {
      type: [architectureSchema],
      default: [],
    },

    improvements: {
      type: improvementsSchema,
      default: null,
    },
  },
  {
    _id: false,
  },
);

/* -------------------------------------------------------------------------- */
/* Section status                                                             */
/* -------------------------------------------------------------------------- */

const sectionStatusesSchema = new Schema(
  {
    overview: {
      type: String,
      enum: persistedSectionStatuses,
      required: true,
    },

    techStack: {
      type: String,
      enum: persistedSectionStatuses,
      required: true,
    },

    projectStructure: {
      type: String,
      enum: persistedSectionStatuses,
      required: true,
    },

    importantFiles: {
      type: String,
      enum: persistedSectionStatuses,
      required: true,
    },

    architecture: {
      type: String,
      enum: persistedSectionStatuses,
      required: true,
    },

    improvements: {
      type: String,
      enum: persistedSectionStatuses,
      required: true,
    },
  },
  {
    _id: false,
  },
);

/* -------------------------------------------------------------------------- */
/* Metadata                                                                   */
/* -------------------------------------------------------------------------- */

const metadataSchema = new Schema(
  {
    analysisVersion: {
      type: Number,
      required: true,
      min: 1,
    },

    filesScanned: {
      type: Number,
      min: 0,
      default: 0,
    },

    filesSelected: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    _id: false,
  },
);

/* -------------------------------------------------------------------------- */
/* Repository analysis document                                               */
/* -------------------------------------------------------------------------- */

const repositoryAnalysisSchema = new Schema(
  {
    repository: {
      type: repositorySchema,
      required: true,
    },

    analysis: {
      type: analysisSchema,
      required: true,
    },

    sectionStatuses: {
      type: sectionStatusesSchema,
      required: true,
    },

    status: {
      type: String,
      enum: ["completed", "partial"],
      required: true,
    },

    metadata: {
      type: metadataSchema,
      required: true,
    },

    analyzedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

/*
 * For now we use repoKey + analysisVersion.
 *
 * Later we'll add the Git commit/tree SHA so that RepoExplain can tell whether
 * the repository changed since the stored analysis was generated.
 */
repositoryAnalysisSchema.index({
  "repository.repoKey": 1,
  "metadata.analysisVersion": 1,
});

repositoryAnalysisSchema.index({
  analyzedAt: -1,
});

export type RepositoryAnalysisDocument = InferSchemaType<
  typeof repositoryAnalysisSchema
>;

const RepositoryAnalysis: Model<RepositoryAnalysisDocument> =
  mongoose.models.RepositoryAnalysis ??
  mongoose.model<RepositoryAnalysisDocument>(
    "RepositoryAnalysis",
    repositoryAnalysisSchema,
  );

export default RepositoryAnalysis;

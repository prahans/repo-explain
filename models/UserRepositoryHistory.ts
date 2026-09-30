import "server-only";

import mongoose, { type InferSchemaType, type Model, Schema } from "mongoose";

const userRepositoryHistorySchema = new Schema(
  {
    userId: {
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

    repositoryAnalysisId: {
      type: Schema.Types.ObjectId,
      ref: "RepositoryAnalysis",
      required: true,
    },

    visitCount: {
      type: Number,
      default: 1,
      min: 1,
    },

    firstVisitedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    lastVisitedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    isFavorite: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "userRepositoryHistory",
  },
);

userRepositoryHistorySchema.index(
  {
    userId: 1,
    repoKey: 1,
  },
  {
    unique: true,
  },
);

userRepositoryHistorySchema.index({
  userId: 1,
  lastVisitedAt: -1,
});

export type UserRepositoryHistoryDocument = InferSchemaType<
  typeof userRepositoryHistorySchema
>;

const UserRepositoryHistory: Model<UserRepositoryHistoryDocument> =
  mongoose.models.UserRepositoryHistory ??
  mongoose.model<UserRepositoryHistoryDocument>(
    "UserRepositoryHistory",
    userRepositoryHistorySchema,
  );

export default UserRepositoryHistory;

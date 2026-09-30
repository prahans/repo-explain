import "server-only";

import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import UserRepositoryHistory from "@/models/UserRepositoryHistory";

type RecordRepositoryVisitInput = {
  userId: string;
  repoKey: string;
  repositoryAnalysisId: Types.ObjectId | string;
};

export async function recordRepositoryVisit({
  userId,
  repoKey,
  repositoryAnalysisId,
}: RecordRepositoryVisitInput) {
  await connectToDatabase();

  const now = new Date();

  return UserRepositoryHistory.findOneAndUpdate(
    {
      userId,
      repoKey: repoKey.toLowerCase(),
    },

    {
      $set: {
        repositoryAnalysisId,
        lastVisitedAt: now,
      },

      $setOnInsert: {
        firstVisitedAt: now,
        isFavorite: false,
      },

      $inc: {
        visitCount: 1,
      },
    },

    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  ).lean();
}

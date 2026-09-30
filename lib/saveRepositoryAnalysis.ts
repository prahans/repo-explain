import "server-only";

import { connectToDatabase } from "@/lib/mongodb";
import type { NormalizedRepositoryAnalysis } from "@/lib/normalizeRepositoryAnalysis";
import RepositoryAnalysis from "@/models/RepositoryAnalysis";

export async function saveRepositoryAnalysis(
  document: NormalizedRepositoryAnalysis,
) {
  await connectToDatabase();

  return RepositoryAnalysis.findOneAndUpdate(
    {
      "repository.repoKey": document.repository.repoKey,
      "source.revision": document.source.revision,
      "metadata.analysisVersion": document.metadata.analysisVersion,
    },
    {
      $set: document,
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  ).lean();
}

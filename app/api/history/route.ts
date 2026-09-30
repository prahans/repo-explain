import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import RepositoryAnalysis from "@/models/RepositoryAnalysis";
import UserRepositoryHistory from "@/models/UserRepositoryHistory";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json(
      {
        message: "You must be signed in to view repository history.",
      },
      {
        status: 401,
      },
    );
  }

  try {
    await connectToDatabase();

    // Get the user's most recently visited repositories.
    const history = await UserRepositoryHistory.find({
      userId: session.user.id,
    })
      .sort({
        isFavorite: -1,
        lastVisitedAt: -1,
      })
      .limit(20)
      .lean();

    if (history.length === 0) {
      return Response.json({
        items: [],
      });
    }

    // Get the corresponding repository analysis documents.
    const analysisIds = history.map((item) => item.repositoryAnalysisId);

    const analyses = await RepositoryAnalysis.find({
      _id: {
        $in: analysisIds,
      },
    })
      .select({
        repository: 1,
        status: 1,
        analyzedAt: 1,
        source: 1,
      })
      .lean();

    // Makes looking up an analysis by ObjectId easy.
    const analysesById = new Map(
      analyses.map((analysis) => [analysis._id.toString(), analysis]),
    );

    const items = history.flatMap((historyItem) => {
      const analysis = analysesById.get(
        historyItem.repositoryAnalysisId.toString(),
      );

      // If the analysis was deleted but an old history
      // record still exists, simply don't return it.
      if (!analysis) {
        return [];
      }

      return [
        {
          id: historyItem._id.toString(),

          analysisId: analysis._id.toString(),

          repoKey: historyItem.repoKey,

          repository: {
            owner: analysis.repository.owner,

            name: analysis.repository.name,

            fullName: analysis.repository.fullName,

            description: analysis.repository.description,

            language: analysis.repository.language,

            url: analysis.repository.url,

            stars: analysis.repository.stars,

            license: analysis.repository.license,
          },

          visitCount: historyItem.visitCount,

          isFavorite: historyItem.isFavorite,

          firstVisitedAt: historyItem.firstVisitedAt,

          lastVisitedAt: historyItem.lastVisitedAt,

          analyzedAt: analysis.analyzedAt,

          status: analysis.status,
        },
      ];
    });

    return Response.json({
      items,
    });
  } catch (error) {
    console.error("Failed to load repository history:", error);

    return Response.json(
      {
        message: "Could not load repository history.",
      },
      {
        status: 500,
      },
    );
  }
}

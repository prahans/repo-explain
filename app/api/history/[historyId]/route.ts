import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import UserRepositoryHistory from "@/models/UserRepositoryHistory";
import mongoose from "mongoose";

type RouteContext = {
  params: Promise<{
    historyId: string;
  }>;
};

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json(
      {
        message: "You must be signed in.",
      },
      {
        status: 401,
      },
    );
  }

  const { historyId } = await params;

  if (!mongoose.Types.ObjectId.isValid(historyId)) {
    return Response.json(
      {
        message: "Invalid history item.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    await connectToDatabase();

    const deleted = await UserRepositoryHistory.findOneAndDelete({
      _id: historyId,

      // Important:
      // users may only delete THEIR OWN history.
      userId: session.user.id,
    }).lean();

    if (!deleted) {
      return Response.json(
        {
          message: "History item not found.",
        },
        {
          status: 404,
        },
      );
    }

    return Response.json({
      success: true,
    });
  } catch (error) {
    console.error("Failed to delete repository history:", error);

    return Response.json(
      {
        message: "Could not remove repository from history.",
      },
      {
        status: 500,
      },
    );
  }
}

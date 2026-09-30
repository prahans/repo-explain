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

export async function PATCH(request: Request, { params }: RouteContext) {
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

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        message: "Request body must be valid JSON.",
      },
      {
        status: 400,
      },
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("isFavorite" in body) ||
    typeof body.isFavorite !== "boolean"
  ) {
    return Response.json(
      {
        message: "Provide a valid isFavorite value.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    await connectToDatabase();

    const historyItem = await UserRepositoryHistory.findOneAndUpdate(
      {
        _id: historyId,

        // Important:
        // user may only update THEIR OWN history.
        userId: session.user.id,
      },
      {
        $set: {
          isFavorite: body.isFavorite,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    ).lean();

    if (!historyItem) {
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
      isFavorite: historyItem.isFavorite,
    });
  } catch (error) {
    console.error("Failed to update repository favorite:", error);

    return Response.json(
      {
        message: "Could not update favorite.",
      },
      {
        status: 500,
      },
    );
  }
}

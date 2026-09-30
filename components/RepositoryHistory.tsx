"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type HistoryItem = {
  id: string;
  analysisId: string;
  repoKey: string;

  repository: {
    owner: string;
    name: string;
    fullName: string;
    description: string | null;
    language: string | null;
    url: string;
    stars: number | null;
    license: string | null;
  };

  visitCount: number;
  isFavorite: boolean;

  firstVisitedAt: string;
  lastVisitedAt: string;
  analyzedAt: string;

  status: "completed" | "partial";
};

type HistoryResponse = {
  items: HistoryItem[];
};

export function RepositoryHistory() {
  const router = useRouter();

  const [items, setItems] = useState<HistoryItem[]>([]);
  const [search, setSearch] = useState("");

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [favoriteUpdatingId, setFavoriteUpdatingId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadHistory() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/history", {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
        });

        if (response.status === 401) {
          router.replace("/");
          return;
        }

        if (!response.ok) {
          throw new Error("Could not load repository history.");
        }

        const data = (await response.json()) as HistoryResponse;

        setItems(data.items);
      } catch (error) {
        if (controller.signal.aborted) return;

        console.error("Failed to load repository history:", error);

        setError("Could not load repository history.");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadHistory();

    return () => {
      controller.abort();
    };
  }, [router]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return items;
    }

    return items.filter((item) => {
      return (
        item.repository.fullName.toLowerCase().includes(query) ||
        item.repository.description?.toLowerCase().includes(query) ||
        item.repository.language?.toLowerCase().includes(query)
      );
    });
  }, [items, search]);

  async function toggleFavorite(item: HistoryItem) {
    if (favoriteUpdatingId) return;

    const nextValue = !item.isFavorite;

    setFavoriteUpdatingId(item.id);
    setError(null);

    try {
      const response = await fetch(`/api/history/${item.id}`, {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          isFavorite: nextValue,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);

        throw new Error(data?.message ?? "Could not update favorite.");
      }

      setItems((current) =>
        current
          .map((historyItem) =>
            historyItem.id === item.id
              ? {
                  ...historyItem,
                  isFavorite: nextValue,
                }
              : historyItem,
          )
          .sort((a, b) => {
            if (a.isFavorite !== b.isFavorite) {
              return Number(b.isFavorite) - Number(a.isFavorite);
            }

            return (
              new Date(b.lastVisitedAt).getTime() -
              new Date(a.lastVisitedAt).getTime()
            );
          }),
      );
    } catch (error) {
      console.error("Failed to update favorite:", error);

      setError(
        error instanceof Error ? error.message : "Could not update favorite.",
      );
    } finally {
      setFavoriteUpdatingId(null);
    }
  }

  async function removeHistoryItem(historyId: string) {
    if (deletingId) return;

    setDeletingId(historyId);
    setError(null);

    try {
      const response = await fetch(`/api/history/${historyId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);

        throw new Error(
          data?.message ?? "Could not remove repository from history.",
        );
      }

      setItems((current) => current.filter((item) => item.id !== historyId));
    } catch (error) {
      console.error("Failed to remove history item:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Could not remove repository from history.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  function openRepository(repositoryUrl: string) {
    router.push(`/?repo=${encodeURIComponent(repositoryUrl)}`);
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-line p-8 text-center">
        <p className="text-sm text-muted">Loading repository history…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-line p-10 text-center">
        <h2 className="font-semibold">No repository history yet</h2>

        <p className="mt-2 text-sm text-muted">
          Repositories you analyze while signed in will appear here.
        </p>
      </div>
    );
  }

  return (
    <section>
      <div className="mb-6">
        <label htmlFor="history-search" className="sr-only">
          Search repository history
        </label>

        <input
          id="history-search"
          type="search"
          placeholder="Search repositories…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-xl border border-line bg-transparent px-4 py-3 text-sm outline-none"
        />

        <p className="mt-2 text-xs text-muted">
          {filteredItems.length}{" "}
          {filteredItems.length === 1 ? "repository" : "repositories"}
        </p>
      </div>

      {error && (
        <div role="alert" className="mb-5 rounded-xl border border-line p-4">
          <p className="text-sm text-muted">{error}</p>
        </div>
      )}

      {filteredItems.length === 0 ? (
        <div className="rounded-xl border border-line p-8 text-center">
          <p className="text-sm text-muted">
            No repositories match your search.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredItems.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-line p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <button
                  type="button"
                  onClick={() => openRepository(item.repository.url)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate font-semibold">
                    {item.repository.fullName}
                  </p>

                  <p className="mt-2 line-clamp-2 text-sm text-muted">
                    {item.repository.description ??
                      "No repository description provided."}
                  </p>
                </button>

                <button
                  type="button"
                  aria-pressed={item.isFavorite}
                  aria-label={
                    item.isFavorite
                      ? `Remove ${item.repository.fullName} from favorites`
                      : `Add ${item.repository.fullName} to favorites`
                  }
                  title={
                    item.isFavorite
                      ? "Remove from favorites"
                      : "Add to favorites"
                  }
                  disabled={favoriteUpdatingId === item.id}
                  onClick={() => {
                    void toggleFavorite(item);
                  }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-lg disabled:opacity-50"
                >
                  {favoriteUpdatingId === item.id
                    ? "…"
                    : item.isFavorite
                      ? "★"
                      : "☆"}
                </button>
              </div>

              <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted">
                {item.repository.language && (
                  <span className="rounded-full border border-line px-2 py-1">
                    {item.repository.language}
                  </span>
                )}

                <span className="rounded-full border border-line px-2 py-1">
                  {item.status === "completed" ? "Ready" : "Partial"}
                </span>

                <span className="rounded-full border border-line px-2 py-1">
                  {item.visitCount} {item.visitCount === 1 ? "visit" : "visits"}
                </span>
              </div>

              <div className="mt-5 flex items-center justify-between gap-4 border-t border-line pt-4">
                <span className="text-xs text-muted">
                  {formatRelativeDate(item.lastVisitedAt)}
                </span>

                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => openRepository(item.repository.url)}
                    className="text-link text-sm"
                  >
                    Open
                  </button>

                  <button
                    type="button"
                    disabled={deletingId === item.id}
                    onClick={() => {
                      void removeHistoryItem(item.id);
                    }}
                    className="text-sm text-muted hover:text-foreground disabled:opacity-50"
                  >
                    {deletingId === item.id ? "Removing…" : "Remove"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function formatRelativeDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const difference = Date.now() - date.getTime();

  const minutes = Math.floor(difference / 60_000);

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString();
}

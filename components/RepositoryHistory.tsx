"use client";

import { useEffect, useState } from "react";

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

type RepositoryHistoryProps = {
  onSelect: (url: string) => void;

  /**
   * Change this value whenever a repository analysis completes
   * so the component fetches fresh history.
   */
  refreshKey?: number;

  disabled?: boolean;
};

export function RepositoryHistory({
  onSelect,
  refreshKey = 0,
  disabled = false,
}: RepositoryHistoryProps) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
          setIsSignedIn(false);
          setItems([]);
          return;
        }

        if (!response.ok) {
          throw new Error("Could not load repository history.");
        }

        const data = (await response.json()) as HistoryResponse;

        setIsSignedIn(true);
        setItems(data.items);
      } catch (error) {
        if (controller.signal.aborted) return;

        console.error("Failed to load repository history:", error);

        setError("Could not load recent repositories.");
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
  }, [refreshKey]);

  // Don't show history to anonymous users.
  if (!isSignedIn) {
    return null;
  }

  if (isLoading) {
    return (
      <section className="page-width py-5">
        <p className="text-sm text-muted">Loading recent repositories…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-width py-5">
        <p className="text-sm text-muted">{error}</p>
      </section>
    );
  }

  if (items.length === 0) {
    return null;
  }

  async function removeHistoryItem(historyId: string) {
    if (deletingId) return;

    setDeletingId(historyId);
    setError(null);

    try {
      const response = await fetch(`/api/history/${historyId}`, {
        method: "DELETE",
      });

      if (response.status === 401) {
        setIsSignedIn(false);
        setItems([]);
        return;
      }

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

  return (
    <section
      className="page-width py-5"
      aria-labelledby="recent-repositories-heading"
    >
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <h2
            id="recent-repositories-heading"
            className="text-sm font-semibold"
          >
            Recent repositories
          </h2>

          <p className="mt-1 text-xs text-muted">
            Reopen repositories you previously analyzed.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-line p-4">
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelect(item.repository.url)}
                className="min-w-0 flex-1 text-left disabled:cursor-not-allowed disabled:opacity-60"
              >
                <p className="truncate text-sm font-semibold">
                  {item.repository.fullName}
                </p>

                <p className="mt-1 line-clamp-2 text-xs text-muted">
                  {item.repository.description ??
                    "No repository description provided."}
                </p>
              </button>

              <span className="shrink-0 rounded-full border border-line px-2 py-1 text-[11px] text-muted">
                {item.status === "completed" ? "Ready" : "Partial"}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                {item.repository.language && (
                  <span>{item.repository.language}</span>
                )}

                <span>
                  {item.visitCount} {item.visitCount === 1 ? "visit" : "visits"}
                </span>

                <span>{formatRelativeDate(item.lastVisitedAt)}</span>
              </div>

              <button
                type="button"
                disabled={disabled || deletingId === item.id}
                onClick={() => {
                  void removeHistoryItem(item.id);
                }}
                className="text-xs text-muted hover:text-foreground disabled:opacity-50"
              >
                {deletingId === item.id ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        ))}
      </div>
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

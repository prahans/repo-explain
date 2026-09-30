"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import styles from "./RepositoryHistory.module.css";

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
      <div role="status" aria-busy="true">
        <p className="mb-4 text-sm text-muted">Loading repository history…</p>
        <div className={styles.grid} aria-hidden="true">
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className={`${styles.card} ${styles.skeleton}`}>
              <span />
              <span />
              <span />
              <span />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0 && !error) {
    return (
      <div className="workspace-card state-surface">
        <div className="state-icon"><Icon name="repository" size={25} /></div>
        <h2 className="font-semibold">No repository history yet</h2>

        <p className="mt-2 text-sm text-muted">
          Repositories you analyze while signed in will appear here.
        </p>
        <Link href="/" className="primary-button">
          Back to RepoExplain <Icon name="arrow" size={15} />
        </Link>
      </div>
    );
  }

  return (
    <section aria-label="Repository history">
      <div className={styles.toolbar}>
        <label htmlFor="history-search" className="sr-only">
          Search repository history
        </label>

        <input
          id="history-search"
          type="search"
          placeholder="Search repositories…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className={styles.search}
        />

        <p role="status" className={styles.count}>
          {filteredItems.length}{" "}
          {filteredItems.length === 1 ? "repository" : "repositories"}
        </p>
      </div>

      {error && (
        <div role="alert" className={styles.error}>
          <Icon name="alert" size={20} className="shrink-0" />
          <p className="text-sm text-muted">{error}</p>
        </div>
      )}

      {items.length === 0 && error ? (
        <div className="workspace-card state-surface">
          <h2>History is unavailable</h2>
          <p>Please try visiting this page again later.</p>
          <Link href="/" className="secondary-button">Back to RepoExplain</Link>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="workspace-card state-surface">
          <div className="state-icon"><Icon name="search" size={25} /></div>
          <p className="text-sm text-muted">
            No repositories match your search.
          </p>
          <button className="secondary-button" type="button" onClick={() => setSearch("")}>Clear search</button>
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredItems.map((item) => (
            <article
              key={item.id}
              className={styles.card}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className={styles.repositoryName}>
                    <button
                      type="button"
                      onClick={() => openRepository(item.repository.url)}
                      className="text-left hover:text-accent"
                    >
                      {item.repository.fullName}
                    </button>
                  </h2>

                  <p className={styles.description}>
                    {item.repository.description ??
                      "No repository description provided."}
                  </p>
                </div>

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
                  className={styles.favorite}
                >
                  {favoriteUpdatingId === item.id ? (
                    <span className="loading-spinner" aria-hidden="true" />
                  ) : (
                    <Icon name="star" size={18} fill={item.isFavorite ? "currentColor" : "none"} />
                  )}
                </button>
              </div>

              <div className={styles.metadata}>
                <span>{item.repository.language ?? "Language not listed"}</span>

                <span className={styles.status} data-status={item.status}>
                  {item.status === "completed" ? "Ready" : "Partial"}
                </span>

                <span>
                  {item.visitCount} {item.visitCount === 1 ? "visit" : "visits"}
                </span>
              </div>

              <div className={styles.cardFooter}>
                <span className="text-xs text-muted">
                  Last visited{" "}
                  <time dateTime={item.lastVisitedAt} title={new Date(item.lastVisitedAt).toLocaleString()}>
                    {formatRelativeDate(item.lastVisitedAt)}
                  </time>
                </span>

                <div className={styles.actions}>
                  <button
                    type="button"
                    onClick={() => openRepository(item.repository.url)}
                    className="secondary-button"
                    aria-label={`Open ${item.repository.fullName}`}
                  >
                    Open <Icon name="arrow" size={14} />
                  </button>

                  <button
                    type="button"
                    disabled={deletingId === item.id}
                    onClick={() => {
                      void removeHistoryItem(item.id);
                    }}
                    className={styles.remove}
                    aria-label={`Remove ${item.repository.fullName} from history`}
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

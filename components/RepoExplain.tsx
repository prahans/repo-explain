"use client";

import { useState } from "react";
import { Hero } from "@/components/Hero";
import { RepositoryForm } from "@/components/RepositoryForm";
import { ExampleRepositories } from "@/components/ExampleRepositories";
import { EmptyState } from "@/components/analysis/EmptyState";
import { AnalysisReport } from "@/components/analysis/AnalysisReport";
import { AnalysisLoading } from "@/components/analysis/AnalysisLoading";
import { ErrorState } from "@/components/analysis/ErrorState";
import { loadingStages, mockAnalysis, mockErrors } from "@/data/mock-analysis";
import type { ErrorKind } from "@/types/analysis";

type PreviewState = "empty" | "result" | "loading" | ErrorKind;

const previews: { id: PreviewState; label: string }[] = [
  { id: "empty", label: "Empty" },
  { id: "result", label: "Sample analysis" },
  { id: "loading", label: "Loading" },
  { id: "not-found", label: "Not found" },
  { id: "private", label: "Private repository" },
  { id: "invalid-url", label: "Invalid URL" },
  { id: "failed", label: "Analysis failed" },
];

export function RepoExplain() {
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [preview, setPreview] = useState<PreviewState>("empty");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function extractRepoInfo(url: string) {
    try {
      const parsedUrl = new URL(url);

      if (parsedUrl.hostname !== "github.com") {
        setPreview("invalid-url");
        return null;
      }

      const parts = parsedUrl.pathname.split("/").filter(Boolean);

      if (parts.length < 2) {
        setPreview("invalid-url");
        return null;
      }

      const username = parts[0];
      const repo = parts[1];

      return { username, repo };
    } catch {
      setPreview("invalid-url");
      return null;
    }
  }

  // Fetch repository data, then show the sample report.
  async function showExample() {
    setErrorMessage(null);
    const repoInfo = extractRepoInfo(repositoryUrl);

    if (!repoInfo) {
      return;
    }

    const { username, repo } = repoInfo;

    try {
      setPreview("loading");

      const response = await fetch("/api/github/repository", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          repo,
        }),
      });

      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          data && typeof data === "object" && "message" in data &&
          typeof data.message === "string"
            ? data.message
            : `Repository request failed (HTTP ${response.status}). Please try again.`;
        throw new Error(message);
      }

      if (!data || typeof data !== "object" || !("repository" in data)) {
        throw new Error("The server returned an empty or invalid response. Please try again.");
      }

      console.log("API RESPONSE:", data);
      setPreview("result");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load the repository. Please try again.");
      setPreview("failed");
    }

    document
      .getElementById("workspace-heading")
      ?.focus({ preventScroll: true });

    document.getElementById("workspace")?.scrollIntoView({
      block: "start",
    });
  }

  function resetPreview() {
    setErrorMessage(null);
    setPreview("empty");
    document.getElementById("repository-url")?.focus();
  }

  return (
    <>
      <Hero>
        <RepositoryForm
          value={repositoryUrl}
          onChange={setRepositoryUrl}
          onPreview={showExample}
        />
        <ExampleRepositories onSelect={setRepositoryUrl} />
      </Hero>
      <section
        id="workspace"
        className="workspace page-width"
        aria-label="Repository explanation"
      >
        <div className="workspace-label">
          <h2 id="workspace-heading" className="eyebrow" tabIndex={-1}>
            {preview === "result" ? "Example analysis" : "Your workspace"}
          </h2>
          {preview === "empty" ? (
            <span className="text-xs text-muted">
              A clearer view of the code
            </span>
          ) : (
            <span className="sample-badge">Mock preview</span>
          )}
        </div>
        <div className="workspace-card">
          {preview === "empty" && <EmptyState onViewExample={showExample} />}
          {preview === "result" && <AnalysisReport analysis={mockAnalysis} />}
          {preview === "loading" && <AnalysisLoading stages={loadingStages} />}
          {preview !== "empty" &&
            preview !== "result" &&
            preview !== "loading" && (
              <ErrorState
                {...mockErrors[preview]}
                description={preview === "failed" && errorMessage ? errorMessage : mockErrors[preview].description}
                onRetry={resetPreview}
              />
            )}
        </div>
        <p role="status" className="sr-only">
          {preview === "result"
            ? "Showing the sample analysis for username/repo-explain. The entered URL has not been analyzed."
            : ""}
        </p>
        <details className="preview-details">
          <summary>Preview interface states</summary>
          <div className="preview-options" aria-label="Mock interface states">
            {previews.map(({ id, label }) => (
              <button
                type="button"
                key={id}
                aria-pressed={preview === id}
                onClick={() => setPreview(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </details>
      </section>
    </>
  );
}

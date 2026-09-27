"use client";

import { useRef, useState } from "react";
import { Hero } from "@/components/Hero";
import { RepositoryForm } from "@/components/RepositoryForm";
import { ExampleRepositories } from "@/components/ExampleRepositories";
import { EmptyState } from "@/components/analysis/EmptyState";
import { AnalysisReport } from "@/components/analysis/AnalysisReport";
import { AnalysisLoading } from "@/components/analysis/AnalysisLoading";
import { ErrorState } from "@/components/analysis/ErrorState";
import { Icon } from "@/components/ui/Icon";
import { loadingStages } from "@/data/mock-analysis";
import { mapRepositoryResponse } from "@/lib/mapRepositoryResponse";
import type { ErrorContent, ErrorKind } from "@/types/analysis";
import type { LiveRepositoryAnalysis } from "@/types/live-analysis";
import styles from "./RepoExplain.module.css";

type ViewState = "empty" | "result" | "loading" | ErrorKind;

const errors: Record<ErrorKind, ErrorContent> = {
  "not-found": {
    title: "Repository unavailable",
    description:
      "Check the URL. The repository may not exist or may not be accessible.",
  },
  private: {
    title: "Repository unavailable",
    description: "This repository could not be accessed.",
  },
  "invalid-url": {
    title: "Enter a GitHub repository URL",
    description: "Use a URL such as https://github.com/owner/repository.",
  },
  failed: {
    title: "Analysis failed",
    description: "Could not analyze the repository. Please try again.",
  },
};

function extractRepoInfo(value: string) {
  try {
    const url = new URL(value.trim());
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.hostname.toLowerCase() !== "github.com" ||
      url.username ||
      url.password ||
      url.port
    )
      return null;

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;

    const username = parts[0];
    const repo = parts[1].replace(/\.git$/i, "");
    if (!/^[a-zA-Z0-9-]+$/.test(username) || !/^[a-zA-Z0-9_.-]+$/.test(repo)) {
      return null;
    }
    if (repo === "." || repo === "..") return null;
    return { username, repo };
  } catch {
    return null;
  }
}

export function RepoExplain() {
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [view, setView] = useState<ViewState>("empty");
  const [analysis, setAnalysis] = useState<LiveRepositoryAnalysis | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestPending = useRef(false);

  function focusWorkspace() {
    document
      .getElementById("workspace-heading")
      ?.focus({ preventScroll: true });
    document.getElementById("workspace")?.scrollIntoView({ block: "start" });
  }

  async function analyzeRepository(url: string) {
    if (requestPending.current) return;

    setErrorMessage(null);
    setAnalysis(null);
    const repoInfo = extractRepoInfo(url);

    if (!repoInfo) {
      setView("invalid-url");
      focusWorkspace();
      return;
    }

    requestPending.current = true;
    setView("loading");

    try {
      const response = await fetch("/api/github/repository", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(repoInfo),
      });
      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          data &&
          typeof data === "object" &&
          "message" in data &&
          typeof data.message === "string"
            ? data.message
            : `Repository request failed (HTTP ${response.status}). Please try again.`;
        setErrorMessage(message);
        setView(response.status === 404 ? "not-found" : "failed");
        return;
      }

      // Store the real report instead of rendering mockAnalysis.
      setAnalysis(mapRepositoryResponse(data));
      setView("result");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not load the repository. Please try again.",
      );
      setView("failed");
    } finally {
      requestPending.current = false;
      focusWorkspace();
    }
  }

  function showExample() {
    if (requestPending.current) return;
    const exampleUrl = "https://github.com/prahans/wanderLust";
    setRepositoryUrl(exampleUrl);
    void analyzeRepository(exampleUrl);
  }

  function resetView() {
    setErrorMessage(null);
    setAnalysis(null);
    setView("empty");
    document.getElementById("repository-url")?.focus();
  }

  return (
    <>
      <Hero>
        <RepositoryForm
          value={repositoryUrl}
          isLoading={view === "loading"}
          onChange={setRepositoryUrl}
          onPreview={() => {
            void analyzeRepository(repositoryUrl);
          }}
        />
        <ExampleRepositories
          onSelect={setRepositoryUrl}
          disabled={view === "loading"}
        />
      </Hero>
      <section
        id="workspace"
        className="workspace page-width"
        aria-label="Repository explanation"
        aria-busy={view === "loading"}
      >
        <div className={styles.workspaceHeader}>
          <div className={styles.workspaceTitle}>
            <span className={styles.workspaceIcon}>
              <Icon name="overview" size={18} />
            </span>
            <div>
              <h2 id="workspace-heading" className="eyebrow" tabIndex={-1}>
                {view === "result" ? "Repository analysis" : "Your workspace"}
              </h2>
              <p className={styles.workspaceSubtitle}>
                Structure, stack, and context in one place.
              </p>
            </div>
          </div>
          <span className={styles.status} data-state={view}>
            <span className={styles.statusDot} />
            {view === "loading"
              ? "Analyzing repository"
              : view === "result"
                ? "Analysis ready"
                : view === "empty"
                  ? "Ready to explore"
                  : "Needs attention"}
          </span>
        </div>
        <div className={`workspace-card ${styles.workspaceCard}`}>
          {view === "empty" && <EmptyState onViewExample={showExample} />}
          {view === "result" && analysis && (
            <AnalysisReport
              key={`${analysis.repository.owner}/${analysis.repository.name}`}
              analysis={analysis}
            />
          )}
          {view === "loading" && <AnalysisLoading stages={loadingStages} />}
          {view !== "empty" && view !== "result" && view !== "loading" && (
            <ErrorState
              {...errors[view]}
              description={errorMessage ?? errors[view].description}
              onRetry={resetView}
            />
          )}
        </div>
        <p role="status" className="sr-only">
          {view === "loading"
            ? "Analyzing the repository."
            : view === "result" && analysis
              ? `Showing analysis for ${analysis.repository.owner}/${analysis.repository.name}.`
              : ""}
        </p>
      </section>
    </>
  );
}

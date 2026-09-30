"use client";

import { useEffect, useRef, useState } from "react";
import { Hero } from "@/components/Hero";
import { RepositoryForm } from "@/components/RepositoryForm";
import { ExampleRepositories } from "@/components/ExampleRepositories";
import { EmptyState } from "@/components/analysis/EmptyState";
import { AnalysisReport } from "@/components/analysis/AnalysisReport";
import { AnalysisLoading } from "@/components/analysis/AnalysisLoading";
import { ErrorState } from "@/components/analysis/ErrorState";
import { Icon } from "@/components/ui/Icon";
import { mapRepositoryResponse } from "@/lib/mapRepositoryResponse";
import {
  AnalysisResponseError,
  readAnalysisResponse,
} from "@/lib/readAnalysisResponse";
import { analysisStages, preparationStageIndex } from "@/data/analysis-stages";
import { applyAnalysisUpdate, createProgressiveAnalysis, finishAnalysis } from "@/lib/progressiveAnalysis";
import type { PreparedRepository } from "@/lib/analysisProtocol";
import type { ErrorContent, ErrorKind } from "@/types/analysis";
import type { LiveRepositoryAnalysis } from "@/types/live-analysis";
import styles from "./RepoExplain.module.css";

type ViewState = "empty" | "result" | "loading" | ErrorKind;

const ANALYSIS_TIMEOUT_MS = 180_000;

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
  const [loadingRepository, setLoadingRepository] = useState("");
  const [loadingStage, setLoadingStage] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fileCounts, setFileCounts] = useState<{ filesScanned?: number; filesSelected?: number }>({});
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      const request = activeRequest.current;
      activeRequest.current = null;
      request?.abort();
    };
  }, []);

  function focusWorkspace() {
    document
      .getElementById("workspace-heading")
      ?.focus({ preventScroll: true });
    document.getElementById("workspace")?.scrollIntoView({ block: "start" });
  }

  async function analyzeRepository(url: string) {
    if (activeRequest.current) return;

    setErrorMessage(null);
    setAnalysis(null);
    setFileCounts({});
    const repoInfo = extractRepoInfo(url);

    if (!repoInfo) {
      setView("invalid-url");
      focusWorkspace();
      return;
    }

    const request = new AbortController();
    activeRequest.current = request;
    setIsAnalyzing(true);
    setLoadingRepository(`${repoInfo.username}/${repoInfo.repo}`);
    setLoadingStage(0);
    setView("loading");
    focusWorkspace();

    const timeoutId = window.setTimeout(() => {
      request.abort(new DOMException("Analysis timed out", "TimeoutError"));
    }, ANALYSIS_TIMEOUT_MS);

    let report: LiveRepositoryAnalysis | null = null;
    let prepared: PreparedRepository | undefined;
    try {
      const response = await fetch("/api/github/repository", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/x-ndjson",
          "X-Analysis-Request-ID": crypto.randomUUID(),
        },
        body: JSON.stringify(repoInfo),
        signal: request.signal,
      });
      const data = await readAnalysisResponse(
        response,
        (stage) => {
          if (activeRequest.current === request && !request.signal.aborted) {
            setLoadingStage(stage);
          }
        },
        request.signal,
        (event) => {
          if (activeRequest.current !== request || request.signal.aborted) return;
          if (event.type === "status") {
            setLoadingStage(preparationStageIndex[event.stage]);
            setFileCounts((current) => ({
              filesScanned: event.filesScanned ?? current.filesScanned,
              filesSelected: event.filesSelected ?? current.filesSelected,
            }));
          } else if (event.type === "repository") {
            report = createProgressiveAnalysis(event.data);
            setAnalysis(report);
            setView("result");
          } else if (report) {
            if (event.type === "prepared") prepared = event.data;
            report = applyAnalysisUpdate(report, event, prepared);
            setAnalysis(report);
          }
        },
      );

      // A cancelled or older response must never replace a newer analysis.
      if (activeRequest.current !== request) return;
      request.signal.throwIfAborted();

      if (data !== undefined) report = mapRepositoryResponse(data);
      if (!report) throw new Error("The analysis ended before repository information arrived.");
      report = finishAnalysis(report);
      setAnalysis(report);
      setView("result");
      if (Object.values(report.sectionStatuses).some((status) => status === "error")) {
        setErrorMessage("Some sections could not be completed. Available sections are still readable.");
      }
    } catch (error) {
      if (activeRequest.current !== request) return;

      const message = request.signal.aborted
        ? "This analysis took too long. Please try again."
        : error instanceof Error
          ? error.message
          : "Could not load the repository. Please try again.";
      setErrorMessage(message);
      if (report) {
        setAnalysis(finishAnalysis(report, message));
        setView("result");
      } else {
        setView(
          error instanceof AnalysisResponseError && error.status === 404
            ? "not-found"
            : "failed",
        );
      }
    } finally {
      window.clearTimeout(timeoutId);
      if (activeRequest.current === request) {
        activeRequest.current = null;
        setIsAnalyzing(false);
      }
    }
  }

  function showExample() {
    if (activeRequest.current) return;
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

  function cancelAnalysis() {
    const request = activeRequest.current;
    activeRequest.current = null;
    request?.abort();
    setIsAnalyzing(false);
    if (analysis) {
      const message = "Analysis cancelled. Completed sections are still available.";
      setAnalysis(finishAnalysis(analysis, message));
      setErrorMessage(message);
    } else resetView();
  }

  return (
    <>
      <Hero>
        <RepositoryForm
          value={repositoryUrl}
          isLoading={isAnalyzing}
          onChange={setRepositoryUrl}
          onPreview={() => {
            void analyzeRepository(repositoryUrl);
          }}
        />
        <ExampleRepositories
          onSelect={setRepositoryUrl}
          disabled={isAnalyzing}
        />
      </Hero>
      <section
        id="workspace"
        className="workspace page-width"
        aria-label="Repository explanation"
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
          <span className={styles.status} data-state={isAnalyzing ? "loading" : errorMessage ? "failed" : view}>
            <span className={styles.statusDot} />
            {isAnalyzing
              ? "Analyzing repository"
              : view === "result" && errorMessage
                ? "Analysis incomplete"
                : view === "result"
                  ? "Analysis ready"
                  : view === "empty"
                    ? "Ready to explore"
                    : "Needs attention"}
          </span>
        </div>
        <div
          className={`workspace-card ${styles.workspaceCard}`}
          aria-busy={view === "loading"}
        >
          {view === "empty" && <EmptyState onViewExample={showExample} />}
          {view === "result" && analysis && (
            <>
              {isAnalyzing && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-7 py-4">
                  <div role="status" className="min-w-0 text-sm text-muted">
                    <p className="flex items-center gap-2"><span className="loading-spinner shrink-0" aria-hidden="true" />{analysisStages[loadingStage]}</p>
                    {(fileCounts.filesScanned !== undefined || fileCounts.filesSelected !== undefined) && (
                      <p className="mt-1 text-xs">
                        {fileCounts.filesScanned !== undefined && `${fileCounts.filesScanned.toLocaleString("en-US")} files discovered`}
                        {fileCounts.filesSelected !== undefined && ` · ${fileCounts.filesSelected.toLocaleString("en-US")} files selected`}
                      </p>
                    )}
                  </div>
                  <button type="button" className="text-link" onClick={cancelAnalysis}>Stop analysis</button>
                </div>
              )}
              {errorMessage && !isAnalyzing && (
                <div className="border-b border-line px-7 py-4" role="alert">
                  <p className="text-sm text-muted">{errorMessage}</p>
                  <button type="button" className="text-link mt-2" onClick={() => void analyzeRepository(repositoryUrl)}>Start a new analysis</button>
                </div>
              )}
              <AnalysisReport
                key={`${analysis.repository.owner}/${analysis.repository.name}`}
                analysis={analysis}
              />
            </>
          )}
          {view === "loading" && (
            <AnalysisLoading
              repositoryName={loadingRepository}
              activeStage={loadingStage}
              onCancel={cancelAnalysis}
            />
          )}
          {view !== "empty" && view !== "result" && view !== "loading" && (
            <ErrorState
              {...errors[view]}
              description={errorMessage ?? errors[view].description}
              onRetry={resetView}
            />
          )}
        </div>
      </section>
      <p role="status" className="sr-only">
        {isAnalyzing
          ? `${analysisStages[loadingStage]} for ${loadingRepository}. You can cancel while waiting.`
          : view === "result" && analysis
            ? `Showing analysis for ${analysis.repository.owner}/${analysis.repository.name}.`
            : ""}
      </p>
    </>
  );
}

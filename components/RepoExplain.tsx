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

  // Only changes the visible mock component. The input is not parsed or sent anywhere.
  function showExample() {
    setPreview("result");
    document.getElementById("workspace-heading")?.focus({ preventScroll: true });
    document.getElementById("workspace")?.scrollIntoView({ block: "start" });
  }

  return (
    <>
      <Hero>
        <RepositoryForm value={repositoryUrl} onChange={setRepositoryUrl} onPreview={showExample} />
        <ExampleRepositories onSelect={setRepositoryUrl} />
      </Hero>
      <section id="workspace" className="workspace page-width" aria-label="Repository explanation">
        <div className="workspace-label"><h2 id="workspace-heading" className="eyebrow" tabIndex={-1}>{preview === "result" ? "Example analysis" : "Your workspace"}</h2>{preview === "empty" ? <span className="text-xs text-muted">A clearer view of the code</span> : <span className="sample-badge">Mock preview</span>}</div>
        <div className="workspace-card">
          {preview === "empty" && <EmptyState onViewExample={showExample} />}
          {preview === "result" && <AnalysisReport analysis={mockAnalysis} />}
          {preview === "loading" && <AnalysisLoading stages={loadingStages} />}
          {preview !== "empty" && preview !== "result" && preview !== "loading" && <ErrorState {...mockErrors[preview]} onRetry={() => setPreview("empty")} />}
        </div>
        <p role="status" className="sr-only">{preview === "result" ? "Showing the sample analysis for username/repo-explain. The entered URL has not been analyzed." : ""}</p>
        <details className="preview-details"><summary>Preview interface states</summary><div className="preview-options" aria-label="Mock interface states">{previews.map(({ id, label }) => <button type="button" key={id} aria-pressed={preview === id} onClick={() => setPreview(id)}>{label}</button>)}</div></details>
      </section>
    </>
  );
}

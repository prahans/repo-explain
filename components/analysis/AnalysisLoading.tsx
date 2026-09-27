"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { analysisStages } from "@/data/analysis-stages";
import styles from "./AnalysisLoading.module.css";

export function AnalysisLoading({
  repositoryName,
  activeStage = 0,
  onCancel,
}: {
  repositoryName: string;
  activeStage?: number;
  onCancel: () => void;
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const elapsed = `${Math.floor(elapsedSeconds / 60)}:${String(
    elapsedSeconds % 60,
  ).padStart(2, "0")}`;

  return (
    <div className={styles.surface}>
      <div className={styles.symbol} aria-hidden="true">
        <span className={styles.ring} />
        <Icon name="sparkles" size={25} />
      </div>
      <h3 className={styles.title}>Getting to know the codebase</h3>
      <p className={styles.description}>
        Reading repository files and preparing a clear explanation of the project.
      </p>
      <div className={styles.repository}>
        <Icon name="github" size={14} />
        <span>{repositoryName}</span>
      </div>
      <ol className={styles.stages} aria-label="Analysis steps">
        {analysisStages.map((stage, index) => {
          const active = index === activeStage;
          const complete = index < activeStage;

          return (
            <li
              key={stage}
              className={`${styles.step} ${active ? styles.active : complete ? styles.complete : ""}`}
              aria-current={active ? "step" : undefined}
            >
              <span className={styles.stepIcon} aria-hidden="true">
                {complete ? (
                  <Icon name="check" size={14} />
                ) : active ? (
                  <span className="loading-spinner" />
                ) : (
                  index + 1
                )}
              </span>
              <span className={styles.stepLabel}>{stage}</span>
              <span className={styles.stepState}>
                {complete ? "Complete" : active ? "In progress" : "Waiting"}
              </span>
            </li>
          );
        })}
      </ol>
      <div className={styles.progressMeta}>
        <span>Step {activeStage + 1} of {analysisStages.length}</span>
        <span role="timer" aria-live="off">{elapsed} elapsed</span>
      </div>
      <p className={styles.note}>
        {elapsedSeconds >= 45
          ? "Still working. Larger repositories can take a little longer."
          : "This may take a moment. Your explanation will appear here when ready."}
      </p>
      <button type="button" className={styles.cancel} onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import styles from "./AnalysisLoading.module.css";

export function AnalysisLoading({
  repositoryName,
  onCancel,
}: {
  repositoryName: string;
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
      <div className={styles.activity}>
        <div
          className={styles.progress}
          role="progressbar"
          aria-label="Repository analysis in progress"
        >
          <span />
        </div>
        <div className={styles.progressMeta}>
          <span>Analysis in progress</span>
          <span role="timer" aria-live="off">{elapsed} elapsed</span>
        </div>
      </div>
      <div className={styles.skeleton} aria-hidden="true">
        <div className={styles.skeletonCard}>
          <span className={styles.skeletonHeading} />
          <span />
          <span />
          <span className={styles.shortLine} />
        </div>
        <div className={styles.skeletonCard}>
          <span className={styles.skeletonHeading} />
          <span />
          <span className={styles.shortLine} />
        </div>
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

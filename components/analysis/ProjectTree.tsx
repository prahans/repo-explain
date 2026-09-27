"use client";

import { useId, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { filterProjectTree } from "@/lib/projectTree";
import type { ProjectNode } from "@/types/analysis";
import styles from "./ProjectTree.module.css";

const PREVIEW_PAGE_SIZE = 8;
const EXPLORER_PAGE_SIZE = 30;

function TreeNode({
  node,
  path,
  compact,
}: {
  node: ProjectNode;
  path: string;
  compact: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const childrenId = useId();
  const isFolder = node.children !== undefined;
  const children = node.children ?? [];
  const label = (
    <>
      <Icon
        name={isFolder ? "folder" : "file"}
        size={16}
        className={isFolder ? styles.folderIcon : styles.fileIcon}
      />
      <span className={styles.name}>{node.name}</span>
      {isFolder && (
        <span className={styles.childCount}>
          <span aria-hidden="true">{children.length}</span>
          <span className="sr-only">{children.length} items</span>
        </span>
      )}
      {!compact && node.description && (
        <span className={styles.description}>{node.description}</span>
      )}
    </>
  );

  return (
    <li>
      {isFolder && children.length > 0 ? (
        <>
          <button
            type="button"
            className={`${styles.row} ${styles.folderRow}`}
            aria-expanded={expanded}
            aria-controls={expanded ? childrenId : undefined}
            onClick={() => setExpanded((value) => !value)}
            title={path}
          >
            <Icon name="chevron" size={12} className={styles.chevron} />
            {label}
          </button>
          {expanded && (
            <TreeLevel
              id={childrenId}
              nodes={children}
              path={path}
              compact={compact}
              nested
            />
          )}
        </>
      ) : (
        <div className={`${styles.row} ${styles.fileRow}`} title={path}>
          {label}
        </div>
      )}
    </li>
  );
}

function TreeLevel({
  nodes,
  path,
  compact,
  nested = false,
  id,
}: {
  nodes: ProjectNode[];
  path: string;
  compact: boolean;
  nested?: boolean;
  id?: string;
}) {
  const pageSize = compact ? PREVIEW_PAGE_SIZE : EXPLORER_PAGE_SIZE;
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const remaining = nodes.length - visibleCount;

  return (
    <ul
      id={id}
      className={nested ? styles.children : styles.root}
      aria-label={nested ? path : `${path} file structure`}
    >
      {nodes.slice(0, visibleCount).map((node) => (
        <TreeNode
          key={node.name}
          node={node}
          path={`${path}/${node.name}`}
          compact={compact}
        />
      ))}
      {nodes.length > pageSize && (
        <li>
          <button
            type="button"
            className={styles.showMore}
            aria-disabled={remaining === 0}
            tabIndex={remaining === 0 ? -1 : 0}
            onClick={() => {
              if (remaining > 0) {
                setVisibleCount((count) => Math.min(count + pageSize, nodes.length));
              }
            }}
          >
            <Icon name={remaining > 0 ? "arrowDown" : "check"} size={13} />
            {remaining > 0 ? (
              <>
                Show {Math.min(remaining, pageSize)} more
                <span className={styles.remaining}>
                  ({remaining.toLocaleString("en-US")} remaining)
                </span>
              </>
            ) : (
              "All items shown"
            )}
          </button>
        </li>
      )}
    </ul>
  );
}

export function ProjectTree({
  structure,
  compact = false,
}: {
  structure: ProjectNode;
  compact?: boolean;
}) {
  const [showExcluded, setShowExcluded] = useState(false);
  const [collapseVersion, setCollapseVersion] = useState(0);
  const filtered = useMemo(() => filterProjectTree(structure), [structure]);
  const { root, fileCount, folderCount } = useMemo(
    () => (showExcluded ? filterProjectTree(structure, true) : filtered),
    [structure, showExcluded, filtered],
  );

  return (
    <div className={`${styles.explorer} ${compact ? styles.compact : ""}`}>
      <div className={styles.header}>
        <span className={styles.repositoryIcon}>
          <Icon name="repository" size={17} />
        </span>
        <div className={styles.heading}>
          <span className={styles.repositoryName} title={structure.name}>
            {structure.name}
          </span>
          <span className={styles.meta}>
            {fileCount.toLocaleString("en-US")} {fileCount === 1 ? "file" : "files"}
            <span aria-hidden="true"> · </span>
            {folderCount.toLocaleString("en-US")} {folderCount === 1 ? "folder" : "folders"}
          </span>
        </div>
        {!compact && (
          <button
            type="button"
            className={styles.collapseButton}
            onClick={() => setCollapseVersion((version) => version + 1)}
          >
            Collapse all
          </button>
        )}
      </div>
      {!compact && filtered.hiddenCount > 0 && (
        <div className={styles.toolbar}>
          <span className={styles.viewLabel}>
            <span className={styles.viewDot} />
            {showExcluded ? "All repository files" : "Source view"}
          </span>
          <button
            type="button"
            className={styles.filterButton}
            aria-pressed={showExcluded}
            title="Include dependencies, build output, caches, lockfiles, and editor metadata"
            onClick={() => setShowExcluded((value) => !value)}
          >
            {showExcluded && <Icon name="check" size={12} />}
            Include hidden items
          </button>
        </div>
      )}
      <div
        className={styles.viewport}
        role="region"
        aria-label={`${structure.name} ${compact ? "structure preview" : "file explorer"}`}
        tabIndex={0}
      >
        {root.children?.length ? (
          <TreeLevel
            key={`${showExcluded}-${collapseVersion}`}
            nodes={root.children}
            path={structure.name}
            compact={compact}
          />
        ) : (
          <div className={styles.empty}>
            <Icon name="folder" size={23} />
            <p>
              {filtered.hiddenCount > 0
                ? "No source files to preview."
                : "No files returned for this repository."}
            </p>
            {filtered.hiddenCount > 0 && (
              <span>
                {compact
                  ? "Explore the project structure to view all files."
                  : "Show hidden items to see the available files."}
              </span>
            )}
          </div>
        )}
      </div>
      <div className={styles.footer}>
        <Icon
          name={filtered.hiddenCount > 0 && !showExcluded ? "layers" : "info"}
          size={13}
        />
        <span>
          {filtered.hiddenCount > 0 && !showExcluded
            ? `${filtered.hiddenCount.toLocaleString("en-US")} generated, dependency & extra ${filtered.hiddenCount === 1 ? "item" : "items"} hidden.`
            : "Repository files from GitHub. Open a folder to explore."}
        </span>
      </div>
    </div>
  );
}

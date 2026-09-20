import { Icon } from "@/components/ui/Icon";
import type { ProjectNode } from "@/types/analysis";

function TreeNode({ node, compact }: { node: ProjectNode; compact: boolean }) {
  const isFolder = node.children !== undefined;
  const label = <><Icon name={isFolder ? "folder" : "file"} size={15} className={isFolder ? "text-[#b69155]" : "text-[#8296ad]"} /><span>{node.name}</span>{!compact && node.description && <span className="tree-description">{node.description}</span>}</>;

  return (
    <li>
      {isFolder && node.children && node.children.length > 0 ? (
        <details open>
          <summary className="tree-row"><Icon name="chevron" size={12} className="tree-chevron" />{label}</summary>
          <ul className="tree-children">{node.children.map((child) => <TreeNode key={child.name} node={child} compact={compact} />)}</ul>
        </details>
      ) : <div className="tree-row pl-4">{label}</div>}
    </li>
  );
}

export function ProjectTree({ structure, compact = false }: { structure: ProjectNode; compact?: boolean }) {
  return (
    <div className={`project-tree ${compact ? "tree-compact" : ""}`}>
      <div className="tree-title"><span className="flex items-center gap-2"><Icon name="folder" size={14} />{structure.name}</span><span className="font-mono text-xs text-[#9da69a]">/</span></div>
      <ul className="tree-root" aria-label={`${structure.name} file structure`}>{structure.children?.map((node) => <TreeNode key={node.name} node={node} compact={compact} />)}</ul>
      {!compact && <div className="tree-footer"><Icon name="info" size={13} />Illustrative structure, including planned folders.</div>}
    </div>
  );
}

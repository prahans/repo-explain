import { Icon, type IconName } from "@/components/ui/Icon";
import type { ArchitectureNode } from "@/types/analysis";

const layerIcons: Record<ArchitectureNode["layer"], IconName> = {
  Browser: "code",
  Server: "terminal",
  "External service": "globe",
  Output: "file",
};

export function ArchitectureSection({ nodes }: { nodes: ArchitectureNode[] }) {
  return (
    <section>
      <h2 className="section-heading">How the pieces connect</h2>
      <p className="section-description">
        A visual map of the planned journey, from URL to explanation.
      </p>
      <div className="architecture-canvas">
        <ol className="architecture-flow">
          {nodes.map((node, index) => (
            <li key={node.name}>
              <div className="architecture-node">
                <span className="architecture-icon">
                  <Icon name={layerIcons[node.layer]} size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold">{node.name}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    {node.description}
                  </p>
                </div>
                <span className="tag hidden sm:inline-flex">{node.layer}</span>
              </div>
              {index < nodes.length - 1 && (
                <Icon
                  name="arrowDown"
                  size={23}
                  className="architecture-arrow"
                />
              )}
            </li>
          ))}
        </ol>
      </div>
      <p className="section-note">
        <Icon name="info" size={14} />
        Conceptual architecture only. External services are not connected.
      </p>
    </section>
  );
}

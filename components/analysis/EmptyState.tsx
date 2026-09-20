import { Icon } from "@/components/ui/Icon";

export function EmptyState({ onViewExample }: { onViewExample?: () => void }) {
  return (
    <div className="state-surface">
      <div className="state-icon"><Icon name="repository" size={28} /></div>
      <h2>Your repository explanation will appear here</h2>
      <p>Every codebase has a story. Add a repository above to find your starting point, or take a look at an example.</p>
      {onViewExample && <button type="button" className="secondary-button" onClick={onViewExample}>Explore an example<Icon name="arrow" size={15} /></button>}
      <div className="empty-features"><span><Icon name="layers" size={15} />See the big picture</span><span><Icon name="folder" size={15} />Find your way around</span><span><Icon name="code" size={15} />Make it click</span></div>
    </div>
  );
}

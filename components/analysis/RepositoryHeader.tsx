import { Icon } from "@/components/ui/Icon";
import type { RepositoryAnalysis } from "@/types/analysis";

export function RepositoryHeader({
  repository,
}: {
  repository: RepositoryAnalysis["repository"];
}) {
  return (
    <header className="repository-header">
      <div className="flex min-w-0 items-start gap-3.5">
        <span className="repo-avatar">
          <Icon name="repository" size={24} />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="repo-name">
              <span>{repository.owner} / </span>
              {repository.name}
            </h3>
            <span className="tag">Public</span>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            {repository.description}
          </p>
          <div className="repo-metadata">
            <span>
              <span className="size-2 rounded-full bg-[#4288bd]" />
              {repository.language}
            </span>
            <span>
              <Icon name="branch" size={13} />
              {repository.branch}
            </span>
            <span>
              <Icon name="star" size={13} />
              {repository.stars}
            </span>
            <span>{repository.license} license</span>
          </div>
        </div>
      </div>
      <button
        className="secondary-button shrink-0 text-muted"
        type="button"
        disabled
        title="Sample repository link — connect your own URL later"
      >
        <Icon name="github" size={15} />
        View on GitHub
        <Icon name="external" size={12} />
      </button>
    </header>
  );
}

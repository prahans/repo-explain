import { Icon } from "@/components/ui/Icon";
import type {
  Improvement,
  ImprovementCategory,
  ImprovementsStatus,
} from "@/types/analysis";

const categoryLabels: Record<ImprovementCategory, string> = {
  architecture: "Architecture",
  "code-quality": "Code Quality",
  performance: "Performance",
  security: "Security",
  testing: "Testing",
  "developer-experience": "Developer Experience",
};

function ImprovementCard({ item }: { item: Improvement }) {
  return (
    <article className="panel-card min-w-0 wrap-anywhere">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`priority priority-${item.priority}`}>
          <span
            className="size-1.5 rounded-full bg-current"
            aria-hidden="true"
          />
          {item.priority.toUpperCase()}
        </span>
        <span className="tag whitespace-normal">
          {categoryLabels[item.category]}
        </span>
      </div>
      <h3 className="small-heading mt-4 flex items-start gap-2">
        <Icon name="bulb" size={18} className="mt-0.5 shrink-0 text-muted" />
        {item.title}
      </h3>
      <p className="body-copy mt-3">{item.description}</p>
      <dl className="mt-4 grid gap-4">
        <div>
          <dt className="text-sm font-medium">Why this matters</dt>
          <dd className="body-copy mt-1">{item.reason}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium">Recommendation</dt>
          <dd className="body-copy mt-1">{item.recommendation}</dd>
        </div>
      </dl>
      {!!item.relatedFiles?.length && (
        <div className="mt-4 border-t border-line pt-4">
          <h4 className="text-sm font-medium">Related files</h4>
          <ul className="mt-2 grid gap-2">
            {item.relatedFiles.map((path) => (
              <li
                key={path}
                className="flex min-w-0 items-start gap-2 text-muted"
              >
                <Icon name="file" size={14} className="mt-0.5 shrink-0" />
                <code className="min-w-0 break-all font-mono text-xs leading-5">
                  {path}
                </code>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

function ImprovementsPending({ generating }: { generating: boolean }) {
  return (
    <div className="mt-6" role="status">
      <p className="flex items-center gap-2 text-sm text-muted">
        {generating ? (
          <span className="loading-spinner shrink-0" aria-hidden="true" />
        ) : (
          <Icon name="clock" size={16} />
        )}
        {generating
          ? "Reviewing the repository for potential improvements..."
          : "Waiting for analysis"}
      </p>
      {generating && (
        <>
          <div className="mt-4 grid gap-4" aria-hidden="true">
            {[0, 1].map((index) => (
              <div className="panel-card" key={index}>
                <div className="loading-skeleton">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Analyzing architecture, maintainability, testing, performance, and
            other areas...
          </p>
        </>
      )}
    </div>
  );
}

export function ImprovementsSection({
  improvements,
  summary,
  status,
}: {
  improvements: Improvement[];
  summary?: string;
  status: ImprovementsStatus;
}) {
  return (
    <section aria-busy={status === "waiting" || status === "generating"}>
      <h2 className="section-heading">Improvements</h2>
      <p className="section-description">
        Potential improvements identified from the analyzed repository.
      </p>
      {(status === "waiting" || status === "generating") && (
        <ImprovementsPending generating={status === "generating"} />
      )}
      {status === "error" && (
        <div className="panel-card mt-6" role="alert">
          <h3 className="small-heading flex items-center gap-2">
            <Icon name="alert" size={18} className="shrink-0 text-accent" />
            Improvements could not be displayed
          </h3>
          <p className="body-copy mt-2">
            The response did not contain valid recommendations. The rest of your
            repository analysis is still available.
          </p>
        </div>
      )}
      {status === "not-available" && (
        <p className="body-copy mt-6">
          This analysis finished without improvements data.
        </p>
      )}
      {status === "complete" && (
        <>
          {summary && <p className="body-copy mt-5 wrap-anywhere">{summary}</p>}
          {improvements.length > 0 ? (
            <div className="mt-6 grid gap-4">
              {improvements.map((item) => (
                <ImprovementCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="panel-card mt-6">
              <h3 className="small-heading">
                No major improvements were identified from the repository files
                analyzed.
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                This does not mean the repository has no possible improvements;
                repoExplain only evaluates the files included in the analysis.
              </p>
            </div>
          )}
        </>
      )}
      <p className="section-note">
        <Icon name="info" size={14} />
        Improvements are based on the repository files analyzed by repoExplain.
        They should be treated as recommendations to investigate rather than
        definitive issues.
      </p>
    </section>
  );
}

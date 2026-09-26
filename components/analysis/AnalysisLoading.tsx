import { Icon } from "@/components/ui/Icon";

// Presentation only: the caller chooses the stage; there are no timers or requests.
export function AnalysisLoading({
  stages,
  activeStage = 1,
}: {
  stages: string[];
  activeStage?: number;
}) {
  return (
    <div className="state-surface loading-surface">
      <div className="state-icon text-accent">
        <Icon name="sparkles" size={26} />
      </div>
      <h2>Getting to know the codebase</h2>
      <p>
        A little context goes a long way. Here’s what an analysis will look
        like.
      </p>
      <p role="status" className="sr-only">
        Sample loading state: {stages[activeStage]}
      </p>
      <ol className="loading-stages">
        {stages.map((stage, index) => (
          <li
            key={stage}
            className={
              index === activeStage
                ? "stage-active"
                : index < activeStage
                  ? "stage-complete"
                  : ""
            }
            aria-current={index === activeStage ? "step" : undefined}
          >
            <span className="stage-indicator">
              {index < activeStage ? (
                <Icon name="check" size={13} />
              ) : index === activeStage ? (
                <span className="loading-spinner" />
              ) : (
                <span className="size-1.5 rounded-full bg-current" />
              )}
            </span>
            <span>{stage}</span>
            <span className="ml-auto text-xs">
              {index < activeStage
                ? "Complete"
                : index === activeStage
                  ? "In progress"
                  : "Waiting"}
            </span>
          </li>
        ))}
      </ol>
      <div className="loading-skeleton" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="text-xs text-muted">
        Static preview · No analysis is running
      </p>
    </div>
  );
}

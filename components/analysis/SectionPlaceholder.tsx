import { Icon } from "@/components/ui/Icon";
import type { SectionStatus } from "@/types/analysis";

export function SectionPlaceholder({ title, status, message }: { title: string; status: SectionStatus; message?: string }) {
  const pending = status === "waiting" || status === "generating";
  return (
    <section aria-busy={pending}>
      <h2 className="section-heading">{title}</h2>
      <div className="panel-card mt-6" role={status === "error" ? "alert" : "status"}>
        <p className="flex items-center gap-2 text-sm text-muted">
          {status === "generating" ? <span className="loading-spinner shrink-0" aria-hidden="true" /> : <Icon name={status === "error" ? "alert" : "clock"} size={16} />}
          {message ?? (status === "waiting" ? "Waiting for analysis"
            : status === "generating" ? `Generating ${title.toLowerCase()}...`
            : status === "error" ? "This section could not be completed. Other available sections are still readable."
            : "This analysis finished without data for this section.")}
        </p>
        {status === "generating" && (
          <div className="loading-skeleton" aria-hidden="true"><span /><span /><span /><span /></div>
        )}
      </div>
    </section>
  );
}

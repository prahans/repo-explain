import { Icon } from "@/components/ui/Icon";
import type { Improvement } from "@/types/analysis";

export function ImprovementsSection({
  improvements,
}: {
  improvements: Improvement[];
}) {
  return (
    <section>
      <h2 className="section-heading">A few ways to move forward</h2>
      <p className="section-description">
        Example recommendations to make the project more robust and
        approachable.
      </p>
      <div className="mt-6 grid gap-4">
        {improvements.map((item) => (
          <article className="panel-card" key={item.title}>
            <div className="flex items-start gap-3">
              <span className="improvement-icon">
                <Icon name="bulb" size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="small-heading">{item.title}</h3>
                  <span
                    className={`priority priority-${item.priority.toLowerCase()}`}
                  >
                    <span className="size-1.5 rounded-full bg-current" />
                    {item.priority} priority
                  </span>
                </div>
                <p className="body-copy mt-3">{item.description}</p>
                <p className="mt-3 text-xs text-muted">{item.category}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

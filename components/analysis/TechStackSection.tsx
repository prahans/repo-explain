import type { Technology } from "@/types/analysis";

export function TechnologyMark({ technology }: { technology: Technology }) {
  return <span className={`technology-mark technology-${technology.color}`} aria-hidden="true">{technology.mark}</span>;
}

export function TechStackSection({ technologies }: { technologies: Technology[] }) {
  return (
    <section>
      <h2 className="section-heading">The tools behind the code</h2>
      <p className="section-description">A modern web stack, with a clear role for every piece.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {technologies.map((technology) => (
          <article className="panel-card technology-card" key={technology.name}>
            <div className="mb-4 flex items-center gap-3"><TechnologyMark technology={technology} /><div><h3 className="small-heading">{technology.name}</h3><p className="mt-1 text-xs text-muted">{technology.category}</p></div></div>
            <p className="body-copy">{technology.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

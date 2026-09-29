import { Icon, type IconName } from "@/components/ui/Icon";
import type { LiveRepositoryAnalysis } from "@/types/live-analysis";

const analysisSteps: { title: string; description: string; icon: IconName }[] = [
  {
    title: "Repository Loaded",
    description:
      "repoExplain receives the repository and basic metadata such as repository name, branch, and language.",
    icon: "repository",
  },
  {
    title: "Files Scanned",
    description:
      "The project structure is scanned to identify source files, configuration files, documentation, dependency files, and other useful files.",
    icon: "folder",
  },
  {
    title: "Important Files Selected",
    description:
      "repoExplain selects the files that are most useful for understanding the project instead of sending every file for analysis.",
    icon: "file",
  },
  {
    title: "Project Analyzed",
    description:
      "Selected files are analyzed to understand the tech stack, project structure, important files, architecture, and relationships between major parts of the codebase.",
    icon: "architecture",
  },
  {
    title: "Explanation Generated",
    description:
      "The results are converted into the sections shown in the repoExplain interface.",
    icon: "overview",
  },
];

type HowItWorksProps = {
  repository?: Partial<
    Pick<LiveRepositoryAnalysis["repository"], "name" | "owner" | "branch" | "language">
  >;
  selectedFileCount?: number;
};

export function HowItWorks({ repository, selectedFileCount }: HowItWorksProps = {}) {
  const repositoryName = repository?.name?.trim();
  const language = repository?.language?.trim();
  const summary = [
    {
      label: "Repository",
      value: repositoryName
        ? [repository?.owner?.trim(), repositoryName].filter(Boolean).join("/")
        : undefined,
    },
    { label: "Branch", value: repository?.branch?.trim() },
    {
      label: "Primary language",
      // The response mapper uses this label when GitHub does not report a language.
      value: language === "Not reported" ? undefined : language,
    },
    {
      label: "Files selected for analysis",
      value:
        selectedFileCount !== undefined &&
        Number.isInteger(selectedFileCount) &&
        selectedFileCount >= 0
          ? selectedFileCount.toLocaleString("en-US")
          : undefined,
    },
  ].filter((item) => item.value);

  return (
    <section>
      <h2 className="section-heading">How It Works</h2>
      <p className="section-description">
        How repoExplain turns repository files into an understandable overview.
      </p>
      {summary.length > 0 && (
        <div className="panel-card mt-6">
          <h3 className="small-heading">This repository</h3>
          <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {summary.map(({ label, value }) => (
              <div key={label} className="min-w-0">
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="mt-1 text-sm font-medium [overflow-wrap:anywhere]">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      <ol className="how-timeline" aria-label="Repository analysis steps">
        {analysisSteps.map((step, index) => (
          <li key={step.title}>
            <span className="step-number" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <h3 className="flex items-center gap-2 text-base font-semibold">
                <Icon name={step.icon} size={16} className="shrink-0 text-muted" />
                {step.title}
              </h3>
              <p className="body-copy mt-2">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
      <aside className="takeaway" aria-labelledby="analysis-coverage-heading">
        <Icon name="info" size={18} />
        <div>
          <h3 id="analysis-coverage-heading" className="small-heading">
            Analysis coverage
          </h3>
          <p className="mt-2">
            repoExplain bases its explanation on selected repository files.
            Generated explanations may miss behavior hidden in unexamined files,
            runtime configuration, external services, or dynamically generated code.
          </p>
        </div>
      </aside>
    </section>
  );
}

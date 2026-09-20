export type AnalysisSection =
  | "overview"
  | "tech-stack"
  | "project-structure"
  | "important-files"
  | "architecture"
  | "how-it-works"
  | "improvements";

export type Technology = {
  name: string;
  category: string;
  description: string;
  mark: string;
  color: "ink" | "blue" | "cyan" | "green";
};

export type ProjectNode = {
  name: string;
  description?: string;
  children?: ProjectNode[];
};

export type ImportantFile = {
  path: string;
  type: string;
  purpose: string;
  significance: string;
};

export type ArchitectureNode = {
  name: string;
  description: string;
  layer: "Browser" | "Server" | "External service" | "Output";
};

export type ExplanationStep = { title: string; description: string };

export type Improvement = {
  title: string;
  description: string;
  priority: "High" | "Medium" | "Low";
  category: string;
};

export type RepositoryAnalysis = {
  repository: {
    name: string;
    owner: string;
    description: string;
    language: string;
    framework: string;
    stars: string;
    branch: string;
    license: string;
  };
  overview: {
    purpose: string;
    audience: string;
    complexity: string;
    complexityDescription: string;
    takeaway: string;
  };
  technologies: Technology[];
  structure: ProjectNode;
  importantFiles: ImportantFile[];
  architecture: ArchitectureNode[];
  steps: ExplanationStep[];
  improvements: Improvement[];
};

export type ErrorKind = "not-found" | "private" | "invalid-url" | "failed";
export type ErrorContent = { title: string; description: string };

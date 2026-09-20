import type { ErrorContent, ErrorKind, RepositoryAnalysis } from "@/types/analysis";

// This entire report is illustrative. It is never derived from the URL input.
// Replace this object with your own data when you build the application logic.
export const mockAnalysis: RepositoryAnalysis = {
  repository: {
    name: "repo-explain",
    owner: "username",
    description: "An AI-powered repository explanation tool.",
    language: "TypeScript",
    framework: "Next.js",
    stars: "128",
    branch: "main",
    license: "MIT",
  },
  overview: {
    purpose: "RepoExplain turns an unfamiliar GitHub repository into a clear, approachable guide. The planned application brings together a project's structure, key technologies, and important files so you can understand the big picture before diving into the code.",
    audience: "Developers exploring a new codebase, first-time open-source contributors, and curious learners who want a friendly starting point.",
    complexity: "Intermediate",
    complexityDescription: "A familiar React interface, with room to explore APIs and AI integrations as the project grows.",
    takeaway: "Think of it as a README that connects the dots: what the project does, where to look, and how the pieces fit together.",
  },
  technologies: [
    { name: "Next.js", category: "Framework", description: "Organizes the application into routes and renders the React interface.", mark: "N", color: "ink" },
    { name: "React", category: "Frontend", description: "Builds the interface from small, reusable components.", mark: "Re", color: "cyan" },
    { name: "TypeScript", category: "Language", description: "Describes the shape of data and catches mistakes during development.", mark: "TS", color: "blue" },
    { name: "Tailwind CSS", category: "Styling", description: "Provides utility classes for responsive layouts and consistent styling.", mark: "Tw", color: "cyan" },
    { name: "Node.js", category: "Runtime", description: "Runs the development tools and can support future server functionality.", mark: "JS", color: "green" },
  ],
  structure: {
    name: "repo-explain",
    children: [
      { name: "app", description: "Application routes", children: [
        { name: "api", description: "Planned API routes", children: [] },
        { name: "layout.tsx", description: "Shared page layout" },
        { name: "page.tsx", description: "Main application page" },
        { name: "globals.css", description: "Theme and global styles" },
      ] },
      { name: "components", description: "Reusable interface", children: [
        { name: "analysis", description: "Explanation panels", children: [] },
        { name: "RepositoryForm.tsx", description: "Repository input" },
      ] },
      { name: "lib", description: "Planned shared helpers", children: [] },
      { name: "public", description: "Static assets", children: [] },
      { name: "package.json", description: "Dependencies and scripts" },
      { name: "tsconfig.json", description: "TypeScript configuration" },
    ],
  },
  importantFiles: [
    { path: "app/page.tsx", type: "TSX", purpose: "Main application page.", significance: "Brings the repository input and explanation workspace together. Start here to understand what a visitor sees." },
    { path: "app/layout.tsx", type: "TSX", purpose: "Shared application layout.", significance: "Defines the document structure, fonts, and metadata used across the application." },
    { path: "components/RepositoryForm.tsx", type: "TSX", purpose: "Repository URL entry point.", significance: "Keeps the input and submit button together, ready for you to connect a handler later." },
    { path: "package.json", type: "JSON", purpose: "Dependencies and project scripts.", significance: "Shows which tools the project uses and the commands for development, linting, and production builds." },
  ],
  architecture: [
    { name: "User", description: "Provides a public repository URL", layer: "Browser" },
    { name: "Next.js UI", description: "Collects the input", layer: "Browser" },
    { name: "API Route", description: "Coordinates the planned analysis", layer: "Server" },
    { name: "GitHub API", description: "Provides repository contents", layer: "External service" },
    { name: "AI Model", description: "Interprets the selected context", layer: "External service" },
    { name: "Structured Explanation", description: "Groups findings into useful sections", layer: "Output" },
    { name: "UI", description: "Presents an approachable guide", layer: "Browser" },
  ],
  steps: [
    { title: "Enter a repository URL", description: "Start with a public GitHub repository you'd like to understand." },
    { title: "Explore the repository files", description: "The planned analysis will examine the file structure and project configuration." },
    { title: "Select the important context", description: "Entry points, dependencies, and key files will provide the most useful context." },
    { title: "Connect the dots with AI", description: "An AI model will turn that context into a beginner-friendly explanation." },
    { title: "Get a clearer view", description: "Explore the overview, architecture, important files, and next steps in one place." },
  ],
  improvements: [
    { title: "Improve error handling", description: "Give users clear, actionable feedback when a repository is unavailable or an analysis cannot finish.", priority: "High", category: "Reliability" },
    { title: "Add tests for core flows", description: "Cover repository input, analysis states, and navigation as the application grows.", priority: "High", category: "Testing" },
    { title: "Improve documentation", description: "Add a setup guide and a short walkthrough so first-time contributors can find their footing.", priority: "Medium", category: "Developer experience" },
    { title: "Cache repeat analyses", description: "Consider reusing recent results for unchanged repositories once real analysis is connected.", priority: "Low", category: "Performance" },
  ],
};

export const mockErrors: Record<ErrorKind, ErrorContent> = {
  "not-found": { title: "Repository not found", description: "We couldn't find that repository. Check the owner and repository name, then try again." },
  private: { title: "This repository is private", description: "Private repositories aren't supported yet. Try a public GitHub repository instead." },
  "invalid-url": { title: "Invalid GitHub URL", description: "Use a repository URL in the format github.com/owner/repository." },
  failed: { title: "Analysis couldn't be completed", description: "Something went wrong while preparing the explanation. Please try again in a moment." },
};

export const loadingStages = [
  "Reading repository",
  "Understanding project structure",
  "Finding important files",
  "Generating explanation",
];

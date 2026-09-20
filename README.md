# RepoExplain

A frontend-only Next.js application for exploring how a GitHub repository explanation tool could look. Built with the App Router, TypeScript, React, and the existing Tailwind CSS setup. No additional packages were added.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. On Windows, use `npm.cmd` if PowerShell blocks `npm.ps1`.

## Explore the interface

- The workspace starts with an empty state.
- **Explain Repository** and **Explore an example** display the same sample report for `username/repo-explain`. The entered URL is never analyzed.
- Example repository chips only fill the input.
- The report navigation displays seven mock sections: Overview, Tech Stack, Project Structure, Important Files, Architecture, How It Works, and Improvements.
- Folders in the sample file tree expand and collapse.
- **Preview interface states** below the workspace exposes the empty state, static loading stages, sample analysis, and all four error variants.
- The error state's retry button returns to the empty state and focuses the URL input.
- GitHub buttons are disabled placeholders until you supply real project links.

## Where to work

```text
app/
  page.tsx                 Page composition
  layout.tsx               Document layout and metadata
  globals.css              Theme tokens, component styles, responsive rules
components/
  RepoExplain.tsx          Local UI state and preview switching
  Navbar.tsx
  Hero.tsx
  RepositoryForm.tsx
  ExampleRepositories.tsx
  analysis/                Reusable result sections and loading/error/empty states
  ui/Icon.tsx              Local SVG icons; no icon dependency
data/mock-analysis.ts     All example report content and error messages
types/analysis.ts         Shared TypeScript data types
```

The report takes a typed `RepositoryAnalysis` object as a prop. When you implement your own application logic, replace the `mockAnalysis` passed into `AnalysisReport` in `components/RepoExplain.tsx`. The other section components also receive their content through props.

`showExample` is only a placeholder handler. No network requests, repository parsing, API routes, AI SDKs, authentication, database, or server actions are implemented. The architecture diagram and walkthrough describe a possible future implementation.

The UI uses locally available system fonts so development and production builds do not need to download fonts. Reduced-motion preferences, keyboard focus styles, accessible input labels, status announcements, and mobile navigation are included.

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```
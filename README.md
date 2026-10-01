# RepoExplain

**Understand unfamiliar GitHub repositories without reading every file first.**

RepoExplain analyzes a public GitHub repository and turns its codebase into a structured, beginner-friendly explanation of its technologies, project structure, important files, architecture, and possible improvements.

Paste a GitHub repository URL, and RepoExplain fetches the repository data, selects useful files, builds a bounded analysis context, and streams an AI-generated report back to the browser.

**Live demo:** https://repo-explain-gamma.vercel.app/

---

## What RepoExplain does

When you submit a public GitHub repository, RepoExplain:

- fetches repository metadata from the GitHub API
- scans the repository tree
- detects technologies from the repository structure and dependencies
- selects important files instead of sending the entire repository to the model
- reads relevant source files, `README.md`, and `package.json`
- builds a bounded repository context
- generates a structured AI explanation
- streams analysis sections to the UI as they become available
- validates generated output before displaying it
- caches analyses by repository revision
- stores completed and partial analyses in MongoDB
- records repository history for signed-in users

The goal is not to replace reading the code. RepoExplain is intended to give you a useful mental model of an unfamiliar codebase before you start exploring it yourself.

---

## Analysis output

A repository analysis is divided into six sections:

### Overview

A plain-language summary of what the project appears to do, who it is for, and any limitations in the available evidence.

### Tech Stack

Technologies detected from repository metadata, dependency files, and repository structure.

### Project Structure

A view of the repository layout to help identify the major directories and files.

### Important Files

Explanations of selected files that are likely to be useful starting points when reading the codebase.

### Architecture

A high-level explanation of the major parts of the application and how they connect.

### Improvements

Repository-specific suggestions related to areas such as:

- architecture
- code quality
- performance
- security
- testing
- developer experience

Recommendations are generated only when the supplied repository evidence supports them.

---

## How it works

```text
GitHub repository URL
        │
        ▼
Validate owner/repository
        │
        ▼
GitHub REST API
        │
        ├── Repository metadata
        ├── Root contents
        └── Recursive repository tree
        │
        ▼
Check cached analysis
using repository tree revision
        │
        ├── Cache hit ──────────────► Return stored analysis
        │
        ▼
Select important files
        │
        ├── README.md
        ├── package.json
        ├── configuration files
        ├── entry points
        └── selected source files
        │
        ▼
Detect technologies
        │
        ▼
Build bounded AI context
        │
        ▼
Gemini or OpenAI
        │
        ▼
Structured + validated sections
        │
        ▼
NDJSON streaming response
        │
        ▼
Progressive analysis UI
        │
        ▼
MongoDB persistence
        │
        └── Signed-in user history
```

---

## Repository analysis pipeline

### 1. Repository validation

The client accepts GitHub repository URLs in the form:

```text
https://github.com/<owner>/<repository>
```

The URL is validated before the analysis request is sent.

RepoExplain currently targets **public GitHub repositories**.

### 2. GitHub metadata and tree

The server retrieves:

- repository name
- full repository name
- description
- primary language
- default branch
- GitHub URL
- star count
- license
- root files and folders
- recursive Git tree

The tree SHA is used as the repository revision for cache invalidation.

### 3. Cache lookup

Before generating a new analysis, RepoExplain checks MongoDB for an existing result matching:

```text
repository + tree revision + analysis version
```

If the repository has not changed since the stored analysis was generated, the cached result can be reused and replayed through the same progressive UI.

### 4. Important-file selection

RepoExplain does not send every file in a repository to the AI model.

It deterministically selects up to **20 important files**, prioritizing files such as:

- `README.md`
- `package.json`
- Next.js and Vite configuration
- Prisma schema files
- common application entry points
- routes
- controllers
- models
- middleware
- services
- configuration files

Generated directories, dependencies, coverage output, fixtures, and similar paths are excluded from this selection.

### 5. Technology detection

Technology detection is performed separately from the language model.

RepoExplain currently recognizes evidence for technologies including:

- Next.js
- React
- Express
- NestJS
- Vue
- Nuxt
- Svelte
- SvelteKit
- TypeScript
- JavaScript
- Python
- Go
- Rust
- Java
- Ruby
- Tailwind CSS
- MongoDB
- PostgreSQL
- MySQL
- SQLite
- Redis
- Prisma

Detection uses information such as the GitHub primary language, repository paths, dependencies, and development dependencies.

### 6. Bounded context construction

To keep analysis focused and limit unnecessary model input, RepoExplain bounds the context it sends to the AI.

The current implementation uses:

- up to **20 selected important files**
- up to **6,000 characters per selected file**
- up to **6,000 characters from the README**
- up to **200 repository structure paths**

Truncation information and file-reading errors are passed into the analysis context so the model can account for incomplete evidence.

### 7. AI analysis

RepoExplain supports:

- **Google Gemini**
- **OpenAI**

The provider is configured through environment variables.

The model is instructed to:

- use only supplied repository evidence
- avoid inventing functionality or architecture
- distinguish documented plans from implemented behavior
- acknowledge incomplete or truncated context
- explain only source files whose contents were actually supplied
- produce repository-specific improvements instead of generic advice

Repository contents are explicitly treated as **untrusted data rather than instructions**, reducing the risk of prompt instructions embedded inside source files or documentation affecting the analyzer.

### 8. Structured validation

AI output is not accepted as arbitrary text.

RepoExplain uses **Zod schemas** and additional checks to validate generated sections.

For example:

- technology names must match detected technologies
- project-structure paths must exist in the supplied context
- important-file explanations are restricted to selected readable files
- improvement file references must refer to supplied repository paths

Invalid or unsupported sections can be marked as errors without necessarily discarding sections that were successfully generated.

### 9. Progressive streaming

The analysis endpoint supports:

```text
application/x-ndjson
```

Status updates and completed sections are streamed to the browser while the analysis is running.

The UI can therefore show stages such as repository loading, file scanning, context preparation, and AI generation instead of waiting for the complete report before displaying anything.

Analysis can also be cancelled from the client.

### 10. Persistence

Generated analyses are normalized and persisted to MongoDB.

Stored analyses include information such as:

- repository metadata
- repository revision
- analysis version
- analysis sections
- individual section statuses
- completed/partial status
- files scanned
- files selected
- analysis timestamp

Persistence failures are handled separately from the generated response so an otherwise successful analysis does not have to be discarded solely because history storage failed.

---

## GitHub authentication and repository history

RepoExplain uses **Auth.js / NextAuth with GitHub OAuth**.

Authentication is not used to analyze private repositories. Repository analysis is currently limited to public repositories.

Signing in adds personal history features.

For authenticated users, RepoExplain records repositories they analyze and provides a dedicated history page where they can:

- reopen previous repositories
- search their history
- favorite repositories
- remove repositories from history
- see visit counts
- see the last visited time
- see whether a stored analysis is complete or partial

Sessions use the JWT strategy, and RepoExplain stores a stable identifier derived from the authenticated GitHub account for associating history records with a user.

---

## Tech stack

| Area            | Technology             |
| --------------- | ---------------------- |
| Framework       | Next.js 16             |
| UI              | React 19               |
| Language        | TypeScript             |
| Styling         | Tailwind CSS 4         |
| Authentication  | Auth.js / NextAuth 5   |
| Database        | MongoDB                |
| ODM             | Mongoose               |
| AI              | Google Gemini / OpenAI |
| Validation      | Zod                    |
| Repository data | GitHub REST API        |
| Streaming       | NDJSON / Web Streams   |

---

## Project structure

```text
repo-explain/
├── app/
│   ├── api/
│   │   ├── auth/              # Auth.js route handlers
│   │   └── github/            # Repository analysis API
│   ├── history/               # Authenticated repository history
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── analysis/              # Analysis report sections and states
│   ├── AuthButton.tsx
│   ├── ExampleRepositories.tsx
│   ├── Hero.tsx
│   ├── Navbar.tsx
│   ├── RepoExplain.tsx        # Main client analysis workflow
│   ├── RepositoryForm.tsx
│   ├── RepositoryHistory.tsx
│   └── ui/
│
├── lib/
│   ├── analysisProtocol.ts
│   ├── analysisRequestGuard.ts
│   ├── detectTechnologies.ts
│   ├── generateOverview.ts
│   ├── getFileContent.ts
│   ├── getImportantFiles.ts
│   ├── mongodb.ts
│   ├── normalizeRepositoryAnalysis.ts
│   ├── recordRepositoryVisit.ts
│   ├── repositoryAnalysisCache.ts
│   ├── saveRepositoryAnalysis.ts
│   └── streamedJsonSections.ts
│
├── models/
│   ├── RepositoryAnalysis.ts
│   └── UserRepositoryHistory.ts
│
├── tests/
├── types/
├── auth.ts
├── package.json
└── tsconfig.json
```

---

## Getting started

### 1. Clone the repository

```bash
git clone https://github.com/prahans/repo-explain.git
cd repo-explain
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create:

```text
.env.local
```

At minimum, the application needs GitHub API access, MongoDB, an AI provider, and Auth.js configuration.

Example:

```env
# GitHub REST API
GITHUB_TOKEN=your_github_token

# MongoDB
MONGODB_URI=your_mongodb_connection_string

# AI provider
AI_PROVIDER=gemini

GEMINI_API_KEY=your_gemini_api_key
# GEMINI_MODEL=optional_model_override

# OpenAI alternative
# AI_PROVIDER=openai
# OPENAI_API_KEY=your_openai_api_key
# OPENAI_MODEL=optional_model_override

# Auth.js / GitHub OAuth
AUTH_SECRET=your_auth_secret
AUTH_GITHUB_ID=your_github_oauth_client_id
AUTH_GITHUB_SECRET=your_github_oauth_client_secret
```

`GPT_6_LUNA_API_KEY` is also accepted by the current implementation as an alternative OpenAI API-key environment variable.

Supported values for `AI_PROVIDER` are:

```text
auto
gemini
openai
```

`auto` currently uses the primary Gemini path. RepoExplain intentionally performs **one provider invocation per analysis** and does not automatically retry with or fall back to another AI provider.

### 4. Configure GitHub OAuth

Create a GitHub OAuth application and use this callback URL for local development:

```text
http://localhost:3000/api/auth/callback/github
```

For production, replace the origin with your deployed application's domain:

```text
https://your-domain.com/api/auth/callback/github
```

### 5. Start development

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## Available scripts

```bash
npm run dev
```

Starts the Next.js development server.

```bash
npm run build
```

Creates a production build.

```bash
npm start
```

Starts the production server after building.

```bash
npm run lint
```

Runs ESLint.

For an explicit TypeScript check:

```bash
npx tsc --noEmit
```

---

## Caching

Repository analyses are cached using:

```text
repository key
+
Git tree revision
+
analysis version
```

Using the Git tree SHA means a cached analysis can be reused while the repository remains unchanged.

When the default branch changes and GitHub returns a new tree revision, RepoExplain generates a new analysis rather than treating an older result as current.

---

## Reliability and failure handling

RepoExplain is designed so that repository analysis is not treated as one opaque request.

The implementation includes handling for:

- malformed repository URLs
- invalid repository owner/name values
- inaccessible or missing repositories
- GitHub API failures
- duplicate analysis submissions
- analysis queue saturation
- client cancellation
- AI request timeouts
- malformed or unsupported generated sections
- partial analyses
- database/cache failures

When individual AI sections cannot be validated, successfully generated sections can still remain available rather than automatically discarding the entire report.

---

## Current limitations

RepoExplain is still a beta project.

Some important limitations of the current implementation are:

- only public GitHub repositories are supported through the product UI
- RepoExplain does **not** read every file in a repository
- important-file selection currently favors common JavaScript/TypeScript project patterns
- selected file contents are intentionally truncated before being sent to the model
- only the first bounded subset of repository paths is supplied as architecture context
- GitHub itself may return a truncated recursive tree for very large repositories
- AI explanations can still be imperfect even though output is grounded and validated
- there is no automatic AI-provider retry or fallback
- the application is intended as an onboarding and exploration aid, not as a replacement for code review, static analysis, or security auditing

---

## Design principles

### Prefer evidence over guesses

The analyzer is explicitly told not to invent functionality that is not supported by repository content.

### Deterministic facts before AI

Technology detection, important-file selection, repository metadata, and structure extraction are handled by application code rather than asking the model to infer everything.

### Send useful context, not the entire repository

RepoExplain deliberately selects and bounds source material instead of blindly uploading the complete codebase.

### Validate model output

Generated content is parsed against structured schemas and checked against known repository data before being accepted.

### Keep the interface responsive

Analysis status and completed sections are streamed progressively so users can see what is happening during longer repository analyses.

### Reuse work when the repository has not changed

Revision-aware caching avoids regenerating the same analysis unnecessarily.

---

## Who is RepoExplain for?

RepoExplain is primarily designed for developers who need to quickly orient themselves in an unfamiliar codebase, including:

- developers joining a new project
- students learning from open-source repositories
- contributors exploring a project before making their first change
- developers evaluating libraries or example applications
- anyone who wants a high-level map before reading source files directly

---

## Repository

Source code:

https://github.com/prahans/repo-explain

Live application:

https://repo-explain-gamma.vercel.app/

---

## Status

The analysis pipeline, caching behavior, supported repository patterns, and AI output format may continue to evolve.

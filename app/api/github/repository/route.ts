import { detectTechnologies } from "@/lib/detectTechnologies";
import { getImportantFiles } from "@/lib/getImportantFiles";
import {
  getFileContent,
  type RepositoryFileContent,
} from "@/lib/getFileContent";

import {
  generateOverview,
  type RepositoryOverview,
} from "@/lib/generateOverview";
import { randomUUID } from "node:crypto";
import { claimAnalysisRequest } from "@/lib/analysisRequestGuard";
import { preparedSchema, repositorySchema, type AnalysisStreamEvent, type AnalysisUpdate, type PreparationStage } from "@/lib/analysisProtocol";

type GitHubContentItem = {
  name: string;
  path: string;
  type: string;
};

type GitHubTreeItem = {
  path: string;
  type: string;
};

type GitHubTreeResponse = {
  tree: GitHubTreeItem[];
};

type GitHubFileResponse = {
  content?: string;
};

type RepositoryRequestOptions = {
  signal?: AbortSignal;
  onUpdate?: (event: AnalysisUpdate) => void;
};

const repositoryRequestError =
  "Could not retrieve repository data from GitHub. Please try again.";

const githubHeaders = {
  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  Accept: "application/vnd.github+json",
};

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { message: "Request body must be valid JSON" },
      { status: 400 },
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("username" in body) ||
    !("repo" in body) ||
    typeof body.username !== "string" ||
    typeof body.repo !== "string" ||
    !body.username.trim() ||
    !body.repo.trim()
  ) {
    return Response.json(
      { message: "Provide a username and repository name" },
      { status: 400 },
    );
  }

  const username = body.username.trim();
  const repo = body.repo.trim();
  if (!/^[a-zA-Z0-9-]+$/.test(username) || !/^[a-zA-Z0-9_.-]+$/.test(repo) || repo === "." || repo === "..") {
    return Response.json({ message: "Invalid repository owner or name" }, { status: 400 });
  }
  const requestId = request.headers.get("X-Analysis-Request-ID") ?? randomUUID();
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(requestId)) {
    return Response.json({ message: "Invalid analysis request ID" }, { status: 400 });
  }
  let finish: (() => void) | null;
  try {
    finish = claimAnalysisRequest(requestId);
  } catch {
    return Response.json({ message: "The analysis queue is full. Please try again later." }, { status: 503 });
  }
  if (!finish) {
    return Response.json({ message: "This analysis submission has already been received. Start a new analysis to try again." }, { status: 409 });
  }

  if (request.headers.get("accept")?.includes("application/x-ndjson")) {
    return streamRepositoryResponse(request, username, repo, finish);
  }

  try {
    return await getRepositoryResponse(username, repo, {
      signal: request.signal,
    });
  } catch (error) {
    if (request.signal.aborted) {
      return new Response(null, { status: 499 });
    }

    console.error("GitHub repository request failed:", error);

    return Response.json(
      { message: repositoryRequestError },
      { status: 502 },
    );
  } finally {
    finish();
  }
}

function streamRepositoryResponse(
  request: Request,
  username: string,
  repo: string,
  finish: () => void,
) {
  const encoder = new TextEncoder();
  const cancellation = new AbortController();
  const signal = AbortSignal.any([request.signal, cancellation.signal]);
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const close = () => {
        signal.removeEventListener("abort", close);
        finish();

        if (!closed) {
          closed = true;
          controller.close();
        }
      };

      const send = (event: AnalysisStreamEvent) => {
        if (!closed && !signal.aborted) {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        }
      };

      signal.addEventListener("abort", close, { once: true });

      if (signal.aborted) {
        close();
        return;
      }

      void (async () => {
        try {
          const response = await getRepositoryResponse(username, repo, {
            signal,
            onUpdate: send,
          });

          signal.throwIfAborted();
          const data = await response.json();

          if (response.ok) {
            send({ type: "complete" });
          } else {
            send({
              type: "error",
              message: data.message || repositoryRequestError,
              status: response.status,
            });
          }
        } catch (error) {
          if (!signal.aborted) {
            console.error("GitHub repository request failed:", error);
            send({
              type: "error",
              message: repositoryRequestError,
              status: 502,
            });
          }
        } finally {
          close();
        }
      })();
    },
    cancel(reason) {
      // The consumer already closed the stream; abort pending GitHub reads.
      closed = true;
      cancellation.abort(reason);
      finish();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
      "X-Accel-Buffering": "no",
    },
  });
}

async function getRepositoryResponse(
  username: string,
  repo: string,
  { signal, onUpdate }: RepositoryRequestOptions = {},
) {
  const reportProgress = (stage: PreparationStage, counts: { filesScanned?: number; filesSelected?: number } = {}) => {
    signal?.throwIfAborted();
    onUpdate?.({ type: "status", stage, ...counts });
  };

  // --------------------------------
  // 1. Repository information
  // --------------------------------

  reportProgress("loading_repository");

  const response = await fetch(
    `https://api.github.com/repos/${username}/${repo}`,
    {
      headers: githubHeaders,
      signal,
    },
  );

  const data = await response.json();

  if (!response.ok) {
    return Response.json(
      {
        message: data.message || "Failed to fetch repository",
      },
      {
        status: response.status,
      },
    );
  }

  const repository = {
    name: data.name,
    fullName: data.full_name,
    description: data.description,
    language: data.language,
    defaultBranch: data.default_branch,
    url: data.html_url,

    // Add these two fields:
    stars: data.stargazers_count,
    license: data.license?.name ?? null,
  };
  onUpdate?.({ type: "repository", data: repositorySchema.parse(repository) });

  // --------------------------------
  // 2. Root files/folders
  // --------------------------------

  reportProgress("scanning_files");

  const contentsResponse = await fetch(
    `https://api.github.com/repos/${username}/${repo}/contents`,
    {
      headers: githubHeaders,
      signal,
    },
  );

  if (!contentsResponse.ok) {
    return Response.json(
      {
        message: "Failed to fetch repository contents",
      },
      {
        status: contentsResponse.status,
      },
    );
  }

  const contentsData: GitHubContentItem[] = await contentsResponse.json();

  const files = contentsData.map((item) => ({
    name: item.name,
    path: item.path,
    type: item.type,
  }));

  // --------------------------------
  // 3. Full repository tree
  // --------------------------------

  const treeResponse = await fetch(
    `https://api.github.com/repos/${username}/${repo}/git/trees/${data.default_branch}?recursive=1`,
    {
      headers: githubHeaders,
      signal,
    },
  );

  if (!treeResponse.ok) {
    return Response.json(
      {
        message: "Failed to fetch repository tree",
      },
      {
        status: treeResponse.status,
      },
    );
  }

  const treeData: GitHubTreeResponse = await treeResponse.json();

  const tree = treeData.tree.map((item) => ({
    path: item.path,
    type: item.type,
  }));

  // --------------------------------
  // 4. Find important files
  // --------------------------------

  const filesScanned = tree.filter((item) => item.type === "blob").length;
  reportProgress("selecting_files", { filesScanned });

  const importantPaths = new Set(getImportantFiles(tree));

  const importantFiles = tree.filter((item) => importantPaths.has(item.path));
  reportProgress("preparing_context", { filesScanned, filesSelected: importantFiles.length });

  // --------------------------------
  // 5. README - OPTIONAL
  // --------------------------------

  let readmeContent: string | null = null;

  const readmeResponse = await fetch(
    `https://api.github.com/repos/${username}/${repo}/contents/README.md?ref=${data.default_branch}`,
    {
      headers: githubHeaders,
      signal,
    },
  );

  if (readmeResponse.ok) {
    const readmeData: GitHubFileResponse = await readmeResponse.json();

    if (readmeData.content) {
      readmeContent = Buffer.from(readmeData.content, "base64").toString(
        "utf-8",
      );
    }
  } else if (readmeResponse.status !== 404) {
    return Response.json(
      {
        message: "Failed to read README.md",
      },
      {
        status: readmeResponse.status,
      },
    );
  }

  // --------------------------------
  // 6. package.json - OPTIONAL
  // --------------------------------

  let packageContent: string | null = null;

  const packageInfo = {
    name: null as string | null,
    scripts: {} as Record<string, string>,
    dependencies: {} as Record<string, string>,
    devDependencies: {} as Record<string, string>,
  };

  const packageResponse = await fetch(
    `https://api.github.com/repos/${username}/${repo}/contents/package.json?ref=${data.default_branch}`,
    {
      headers: githubHeaders,
      signal,
    },
  );

  if (packageResponse.ok) {
    const packageData: GitHubFileResponse = await packageResponse.json();

    if (packageData.content) {
      packageContent = Buffer.from(
        packageData.content,
        "base64",
      ).toString("utf-8");

      const packageJson = JSON.parse(packageContent);

      packageInfo.name = packageJson.name ?? null;
      packageInfo.scripts = packageJson.scripts ?? {};
      packageInfo.dependencies = packageJson.dependencies ?? {};
      packageInfo.devDependencies = packageJson.devDependencies ?? {};
    }
  } else if (packageResponse.status !== 404) {
    return Response.json(
      {
        message: "Failed to read package.json",
      },
      {
        status: packageResponse.status,
      },
    );
  }

  // --------------------------------
  // 7. Detect technologies
  // --------------------------------

  const technologies = detectTechnologies(
    repository.language,
    tree,
    packageInfo.dependencies,
    packageInfo.devDependencies,
  );

  const MAX_SOURCE_CHARACTERS = 6_000;
  const fileContents: RepositoryFileContent[] = [];
  const previouslyReadFiles = new Map<string, string | null>([
    ["README.md", readmeContent],
    ["package.json", packageContent],
  ]);

  for (const file of importantFiles) {
    // Reuse these reads as file-level evidence without another GitHub request.
    if (previouslyReadFiles.has(file.path)) {
      const content = previouslyReadFiles.get(file.path) ?? null;
      fileContents.push({
        path: file.path,
        content: content?.slice(0, MAX_SOURCE_CHARACTERS) ?? null,
        truncated: (content?.length ?? 0) > MAX_SOURCE_CHARACTERS,
        error: content === null ? "File content is unavailable" : null,
      });
      continue;
    }

    const result = await getFileContent({
      username,
      repo,
      branch: repository.defaultBranch,
      path: file.path,
      headers: githubHeaders,
      signal,
    });

    fileContents.push(result);
  }

  // --------------------------------
  // 8. Build context for the AI
  // --------------------------------

  const MAX_STRUCTURE_PATHS = 200;
  const MAX_README_CHARACTERS = 6_000;

  // Prefer paths closer to the repository root.
  const structurePaths = tree
    .map((item) => item.path)
    .sort((a, b) => {
      const depthDifference = a.split("/").length - b.split("/").length;

      return depthDifference || a.localeCompare(b);
    });

  const repositoryContext = {
    repository,

    technologies,

    readme: {
      content: readmeContent?.slice(0, MAX_README_CHARACTERS) ?? null,

      truncated: (readmeContent?.length ?? 0) > MAX_README_CHARACTERS,
    },

    packageInfo: {
      name: packageInfo.name,
      scripts: packageInfo.scripts,
      dependencies: packageInfo.dependencies,
      devDependencies: packageInfo.devDependencies,
    },

    structure: {
      paths: structurePaths.slice(0, MAX_STRUCTURE_PATHS),
      totalEntries: structurePaths.length,
      truncated: structurePaths.length > MAX_STRUCTURE_PATHS,
    },

    selectedFiles: fileContents.map((file) => ({
      path: file.path,

      content: file.content?.slice(0, MAX_SOURCE_CHARACTERS) ?? null,

      truncated:
        file.truncated || (file.content?.length ?? 0) > MAX_SOURCE_CHARACTERS,

      error: file.error,
    })),
  };

  // --------------------------------
  // 9. Generate the AI overview
  // --------------------------------

  onUpdate?.({ type: "prepared", data: preparedSchema.parse({ tree, importantFiles, fileContents, technologies }) });
  reportProgress("generating_analysis", { filesScanned, filesSelected: importantFiles.length });

  let overview: RepositoryOverview;

  try {
    overview = await generateOverview(repositoryContext, { signal, onUpdate });
  } catch (error) {
    signal?.throwIfAborted();
    console.error("AI overview generation failed:", error);

    return Response.json(
      { message: "Repository data was fetched, but AI analysis failed." },
      { status: 502 },
    );
  }

  // --------------------------------
  // 10. Return everything
  // --------------------------------

  signal?.throwIfAborted();

  return Response.json({
    repository,
    files,
    tree,
    importantFiles,
    readmeContent,
    packageInfo,
    technologies,
    fileContents,
    repositoryContext,
    overview,
  });
}

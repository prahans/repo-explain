import { detectTechnologies } from "@/lib/detectTechnologies";
import { getImportantFiles } from "@/lib/getImportantFiles";
import {
  getFileContent,
  type RepositoryFileContent,
} from "@/lib/getFileContent";

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

  try {
    return await getRepositoryResponse(body.username.trim(), body.repo.trim());
  } catch (error) {
    console.error("GitHub repository request failed:", error);

    return Response.json(
      {
        message:
          "Could not retrieve repository data from GitHub. Please try again.",
      },
      { status: 502 },
    );
  }
}

async function getRepositoryResponse(username: string, repo: string) {
  // --------------------------------
  // 1. Repository information
  // --------------------------------

  const response = await fetch(
    `https://api.github.com/repos/${username}/${repo}`,
    {
      headers: githubHeaders,
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
  };

  // --------------------------------
  // 2. Root files/folders
  // --------------------------------

  const contentsResponse = await fetch(
    `https://api.github.com/repos/${username}/${repo}/contents`,
    {
      headers: githubHeaders,
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

  const importantPaths = new Set(getImportantFiles(tree));

  const importantFiles = tree.filter((item) => importantPaths.has(item.path));

  // --------------------------------
  // 5. README - OPTIONAL
  // --------------------------------

  let readmeContent: string | null = null;

  const readmeResponse = await fetch(
    `https://api.github.com/repos/${username}/${repo}/contents/README.md?ref=${data.default_branch}`,
    {
      headers: githubHeaders,
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
    },
  );

  if (packageResponse.ok) {
    const packageData: GitHubFileResponse = await packageResponse.json();

    if (packageData.content) {
      const packageContent = Buffer.from(
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

  const fileContents: RepositoryFileContent[] = [];

  for (const file of importantFiles) {
    // These root files were already fetched in sections 5 and 6.
    if (file.path === "README.md" || file.path === "package.json") {
      continue;
    }

    const result = await getFileContent({
      username,
      repo,
      branch: repository.defaultBranch,
      path: file.path,
      headers: githubHeaders,
    });

    fileContents.push(result);
  }

  // --------------------------------
  // 8. Return everything
  // --------------------------------

  return Response.json({
    repository,
    files,
    tree,
    importantFiles,
    readmeContent,
    packageInfo,
    technologies,
  });
}

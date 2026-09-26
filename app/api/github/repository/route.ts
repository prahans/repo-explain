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

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Request body must be valid JSON" }, { status: 400 });
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
    return Response.json({ message: "Provide a username and repository name" }, { status: 400 });
  }

  try {
    return await getRepositoryResponse(body.username.trim(), body.repo.trim());
  } catch (error) {
    console.error("GitHub repository request failed:", error);
    return Response.json(
      { message: "Could not retrieve repository data from GitHub. Please try again." },
      { status: 502 },
    );
  }
}

async function getRepositoryResponse(username: string, repo: string) {

  // 1. Get repository information
  const response = await fetch(
    `https://api.github.com/repos/${username}/${repo}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
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

  // 2. Get root files and folders
  const contentsResponse = await fetch(
    `https://api.github.com/repos/${username}/${repo}/contents`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
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

  const treeResponse = await fetch(
    `https://api.github.com/repos/${username}/${repo}/git/trees/${data.default_branch}?recursive=1`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
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

  const importantFiles = tree.filter((item) => {
    return item.path === "README.md" || item.path === "package.json";
  });

  const readmeResponse = await fetch(
    `https://api.github.com/repos/${username}/${repo}/contents/README.md?ref=${data.default_branch}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
    },
  );

  const readmeData = await readmeResponse.json();

  if (!readmeResponse.ok) {
    return Response.json(
      { message: "Failed to read README.md" },
      { status: readmeResponse.status },
    );
  }

  const readmeContent = Buffer.from(readmeData.content, "base64").toString(
    "utf-8",
  );

  const packageResponse = await fetch(
    `https://api.github.com/repos/${username}/${repo}/contents/package.json?ref=${data.default_branch}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
    },
  );

  const packageData = await packageResponse.json();

  if (!packageResponse.ok) {
    return Response.json(
      { message: "Failed to read package.json" },
      { status: packageResponse.status },
    );
  }

  const packageContent = Buffer.from(packageData.content, "base64").toString(
    "utf-8",
  );

  const packageJson = JSON.parse(packageContent);

  return Response.json({
    repository,
    files,
    tree,
    importantFiles,
    readmeContent,
    packageJson,
  });
}

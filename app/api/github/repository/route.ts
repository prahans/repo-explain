type GitHubContentItem = {
  name: string;
  path: string;
  type: string;
};

export async function POST(request: Request) {
  const { username, repo } = await request.json();

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

  return Response.json({
    repository,
    files,
  });
}

type GetFileContentOptions = {
  username: string;
  repo: string;
  branch: string;
  path: string;
  headers: Record<string, string>;
};

type GitHubFileResponse = {
  type?: string;
  content?: string;
  encoding?: string;
};

export type RepositoryFileContent = {
  path: string;
  content: string | null;
  truncated: boolean;
  error: string | null;
};

const MAX_CHARACTERS_PER_FILE = 6_000;

export async function getFileContent({
  username,
  repo,
  branch,
  path,
  headers,
}: GetFileContentOptions): Promise<RepositoryFileContent> {
  // Encode each segment while preserving folder separators.
  const encodedPath = path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  const url =
    `https://api.github.com/repos/` +
    `${encodeURIComponent(username)}/${encodeURIComponent(repo)}` +
    `/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`;

  const response = await fetch(url, { headers });

  if (response.status === 404) {
    return {
      path,
      content: null,
      truncated: false,
      error: "File not found",
    };
  }

  if (!response.ok) {
    throw new Error(
      `Failed to read ${path}: GitHub returned ${response.status}`,
    );
  }

  const data: GitHubFileResponse = await response.json();

  if (
    data.type !== "file" ||
    data.encoding !== "base64" ||
    typeof data.content !== "string"
  ) {
    return {
      path,
      content: null,
      truncated: false,
      error: "File content is unavailable in the supported format",
    };
  }

  const content = Buffer.from(data.content, "base64").toString("utf-8");

  return {
    path,
    content: content.slice(0, MAX_CHARACTERS_PER_FILE),
    truncated: content.length > MAX_CHARACTERS_PER_FILE,
    error: null,
  };
}

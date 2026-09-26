// Helper utility to pause execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getRepository(username: string, repo: string) {
  // Wait for 5000 milliseconds (5 seconds)
  await delay(5000);
  const response = await fetch(
    `https://api.github.com/repos/${username}/${repo}`,
  );

  if (!response.ok) {
    throw new Error("Repository not found");
  }

  const data = await response.json();

  return data;
}

// Repository-specific fixtures for transport, validation, and rendering checks.
// These are test responses, never production recommendations.
export const repositoryWithOpportunities = {
  structure: { paths: ["src/search.ts", "src/report.ts", "package.json"], truncated: false },
  selectedFiles: [
    { path: "src/search.ts", content: "export async function search(query) { return db.query(`SELECT * FROM items WHERE name = '${query}'`); }", error: null },
    { path: "src/report.ts", content: "export async function report() { const users = await fetch('/users'); const orders = await fetch('/orders'); return [await users.json(), await orders.json()]; }", error: null },
    { path: "package.json", content: '{"scripts":{"test":"echo no-tests-configured"}}', error: null },
  ],
};

export const severalImprovements = {
  summary: "The supplied query and report code suggest several changes worth investigating.",
  improvements: [
    {
      id: "parameterize-search",
      title: "Parameterize the search query",
      category: "security",
      priority: "high",
      description: "The search function interpolates its query argument into SQL text.",
      reason: "If this argument comes from a user, it may change the meaning of the query.",
      recommendation: "Use the database driver's bound parameters and verify the query input's source.",
      relatedFiles: ["src/search.ts"],
    },
    {
      id: "check-report-responses",
      title: "Check report response status",
      category: "code-quality",
      priority: "high",
      description: "The report function parses both responses without checking their HTTP status.",
      reason: "An unsuccessful response could be returned as report data.",
      recommendation: "Check response.ok and return a useful error before parsing each response.",
      relatedFiles: ["src/report.ts"],
    },
    {
      id: "parallel-report-reads",
      title: "Consider fetching report inputs concurrently",
      category: "performance",
      priority: "medium",
      description: "The two independent report requests currently run sequentially.",
      reason: "Waiting for one before starting the other adds its network wait to the total.",
      recommendation: "Use Promise.all for these independent reads after defining failure behavior.",
      relatedFiles: ["src/report.ts"],
    },
    {
      id: "configure-test-command",
      title: "Replace the placeholder test command",
      category: "testing",
      priority: "low",
      description: "The provided package script only prints a placeholder message.",
      reason: "Running this command cannot check the query or report behavior.",
      recommendation: "Wire the test command to checks for parameter binding and failed report responses.",
      relatedFiles: ["package.json"],
    },
  ],
};

export const smallRepository = {
  selectedFiles: [{ path: "sum.ts", content: "export const sum = (values: number[]) => values.reduce((a, b) => a + b);", error: null }],
  structure: { paths: ["sum.ts"], truncated: false },
};
export const smallImprovements = {
  summary: "The small utility has one visible edge case to address.",
  improvements: [{
    id: "handle-empty-sums",
    title: "Handle an empty input array",
    category: "code-quality",
    priority: "medium",
    description: "The reducer has no initial value.",
    reason: "Calling the utility with an empty array throws instead of returning a total.",
    recommendation: "Supply 0 as the initial reducer value and check empty input behavior.",
    relatedFiles: ["sum.ts"],
  }],
};

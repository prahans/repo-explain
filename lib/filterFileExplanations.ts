import type { FileExplanation } from "../types/analysis";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Keep explanations only when they refer to readable evidence supplied to the model. */
export function filterFileExplanations(
  explanations: unknown,
  selectedFiles: unknown,
): FileExplanation[] {
  if (!Array.isArray(explanations) || !Array.isArray(selectedFiles)) {
    return [];
  }

  const readablePaths = new Set<string>();

  for (const file of selectedFiles) {
    if (
      isRecord(file) &&
      typeof file.path === "string" &&
      file.path.length > 0 &&
      typeof file.content === "string" &&
      file.content.trim().length > 0 &&
      file.error == null
    ) {
      readablePaths.add(file.path);
    }
  }

  const seenPaths = new Set<string>();
  const validExplanations: FileExplanation[] = [];

  for (const explanation of explanations) {
    if (
      !isRecord(explanation) ||
      typeof explanation.path !== "string" ||
      !readablePaths.has(explanation.path) ||
      seenPaths.has(explanation.path) ||
      typeof explanation.purpose !== "string" ||
      typeof explanation.significance !== "string"
    ) {
      continue;
    }

    const purpose = explanation.purpose.trim();
    const significance = explanation.significance.trim();

    if (!purpose || !significance) {
      continue;
    }

    seenPaths.add(explanation.path);
    validExplanations.push({ path: explanation.path, purpose, significance });
  }

  return validExplanations;
}

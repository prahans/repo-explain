export const analysisStages = [
  "Connecting to repository",
  "Loading repository",
  "Scanning files",
  "Selecting important files",
  "Preparing repository context",
  "Generating repository explanation",
] as const;

export const preparationStageIndex = {
  connecting: 0, loading_repository: 1, scanning_files: 2,
  selecting_files: 3, preparing_context: 4, generating_analysis: 5,
} as const;

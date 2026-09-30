type Claim = { finishedAt: number | null };
const globalState = globalThis as typeof globalThis & { repoExplainRequests?: Map<string, Claim> };
const requests = globalState.repoExplainRequests ??= new Map<string, Claim>();
const RETENTION_MS = 10 * 60_000;
const MAX_REQUESTS = 1_000;

/** Atomic within this server process; retain completed IDs to block POST replays. */
export function claimAnalysisRequest(id: string, now = Date.now()): (() => void) | null {
  for (const [key, claim] of requests) {
    if (claim.finishedAt !== null && now - claim.finishedAt >= RETENTION_MS) requests.delete(key);
  }
  if (requests.has(id)) return null;
  if (requests.size >= MAX_REQUESTS) throw new Error("The analysis queue is full. Please try again later.");
  const claim: Claim = { finishedAt: null };
  requests.set(id, claim);
  return () => { claim.finishedAt = Date.now(); };
}

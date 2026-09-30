import { analysisUpdateSchema, type AnalysisUpdate } from "./analysisProtocol";

export class AnalysisResponseError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AnalysisResponseError";
    this.status = status;
  }
}

type AnalysisEvent =
  | AnalysisUpdate
  | { type: "complete" }
  | { type: "progress"; stage: number }
  | { type: "result"; data: unknown }
  | { type: "error"; message: string; status: number };

const invalidResponse =
  "The server returned an invalid analysis response. Please try again.";

function parseEvent(line: string): AnalysisEvent {
  let event: unknown;
  try {
    event = JSON.parse(line);
  } catch {
    throw new Error(invalidResponse);
  }

  if (event && typeof event === "object" && !Array.isArray(event)) {
    if ("type" in event && event.type === "complete") return { type: "complete" };
    if (
      "type" in event &&
      event.type === "progress" &&
      "stage" in event &&
      typeof event.stage === "number" &&
      Number.isInteger(event.stage) &&
      event.stage >= 0 &&
      event.stage <= 3
    ) {
      return { type: "progress", stage: event.stage };
    }
    if ("type" in event && event.type === "result" && "data" in event) {
      return { type: "result", data: event.data };
    }
    if (
      "type" in event &&
      event.type === "error" &&
      "message" in event &&
      typeof event.message === "string" &&
      event.message.trim() &&
      "status" in event &&
      typeof event.status === "number" &&
      Number.isInteger(event.status) &&
      event.status >= 400 &&
      event.status <= 599
    ) {
      return { type: "error", message: event.message, status: event.status };
    }
  }
  const update = analysisUpdateSchema.safeParse(event);
  if (update.success) return update.data;
  throw new Error(invalidResponse);
}

// A pending read must settle on cancellation even if a custom stream or proxy
// never closes. Always remove this read's listener once either side settles.
function abortable<T>(operation: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return operation;
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      signal.removeEventListener("abort", onAbort);
      reject(signal.reason ?? new DOMException("Analysis cancelled", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
    operation.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
    if (signal.aborted) onAbort();
  });
}

export async function readAnalysisResponse(
  response: Response,
  onProgress: (stage: number) => void,
  signal?: AbortSignal,
  onUpdate?: (event: AnalysisUpdate) => void,
): Promise<unknown> {
  signal?.throwIfAborted();
  const contentType = response.headers.get("content-type")?.split(";")[0].trim();

  if (!response.ok || contentType?.toLowerCase() !== "application/x-ndjson") {
    const data: unknown = await abortable(
      response.json().catch(() => null),
      signal,
    );
    signal?.throwIfAborted();
    if (!response.ok) {
      const message =
        data &&
        typeof data === "object" &&
        "message" in data &&
        typeof data.message === "string" &&
        data.message.trim()
          ? data.message
          : `Repository request failed (HTTP ${response.status}). Please try again.`;
      throw new AnalysisResponseError(message, response.status);
    }
    if (data === null) throw new Error(invalidResponse);
    return data;
  }

  if (!response.body) {
    throw new Error("The server returned an empty analysis response. Please try again.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let buffer = "";
  let receivedEvent = false;

  try {
    while (true) {
      signal?.throwIfAborted();
      const { done, value } = await abortable(reader.read(), signal);
      signal?.throwIfAborted();
      try {
        buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
        if (buffer.length > 20_000_000) throw new Error(invalidResponse);
      } catch {
        throw new Error(invalidResponse);
      }

      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0 || (done && buffer.length > 0)) {
        signal?.throwIfAborted();
        const line = (newline >= 0 ? buffer.slice(0, newline) : buffer).trim();
        buffer = newline >= 0 ? buffer.slice(newline + 1) : "";
        if (!line) continue;
        const event = parseEvent(line);
        receivedEvent = true;
        if (event.type === "progress") {
          onProgress(event.stage);
        } else if (event.type === "result") {
          return event.data;
        } else if (event.type === "complete") {
          return undefined;
        } else if (event.type === "error") {
          throw new AnalysisResponseError(event.message, event.status);
        } else {
          onUpdate?.(event);
        }
      }

      if (done) {
        throw new Error(
          receivedEvent
            ? "The analysis ended before a result arrived. Please try again."
            : "The server returned an empty analysis response. Please try again.",
        );
      }
    }
  } finally {
    // Do not wait for the producer to acknowledge cancellation before finishing.
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

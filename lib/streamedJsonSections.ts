/** Incrementally read complete top-level JSON properties, independent of chunks. */
export class StreamedJsonSections {
  private started = false;
  private ended = false;
  private depth = 0;
  private inString = false;
  private escaped = false;
  private segment = "";
  private totalLength = 0;
  private count = 0;

  constructor(
    private readonly order: readonly string[],
    private readonly onSection: (name: string, value: unknown) => void,
  ) {}

  push(chunk: string): void {
    this.totalLength += chunk.length;
    if (this.totalLength > 2_000_000) throw new Error("The model response exceeded the analysis size limit.");
    for (const char of chunk) {
      if (this.ended) {
        if (char.trim()) throw new Error("Unexpected content after the analysis object.");
        continue;
      }
      if (!this.started) {
        if (!char.trim()) continue;
        if (char !== "{") throw new Error("The model did not return a JSON analysis object.");
        this.started = true;
        this.depth = 1;
        continue;
      }
      if (this.inString) {
        this.segment += char;
        if (this.escaped) this.escaped = false;
        else if (char === "\\") this.escaped = true;
        else if (char === '"') this.inString = false;
        continue;
      }
      if (char === '"') this.inString = true;
      if (char === "{" || char === "[") this.depth++;
      if (char === "}" || char === "]") this.depth--;
      if ((char === "," && this.depth === 1) || (char === "}" && this.depth === 0)) {
        this.emitSection();
        if (char === "}") this.ended = true;
      } else {
        if (this.depth < 1) throw new Error("Malformed analysis JSON.");
        this.segment += char;
      }
    }
  }

  private emitSection(): void {
    let entry: unknown;
    try {
      entry = JSON.parse(`{${this.segment}}`);
    } catch {
      // A balanced but invalid value can fail its own section without losing
      // subsequent sections. Unbalanced/truncated JSON still fails at finish().
      const key = /^\s*"([a-zA-Z]+)"\s*:/.exec(this.segment)?.[1];
      if (key === this.order[this.count]) {
        this.segment = "";
        this.count++;
        this.onSection(key, undefined);
        return;
      }
      throw new Error("A model section contained malformed JSON.");
    }
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error("Invalid analysis section.");
    const pairs = Object.entries(entry);
    if (pairs.length !== 1 || pairs[0][0] !== this.order[this.count]) {
      throw new Error("The model returned analysis sections in an unexpected order.");
    }
    this.segment = "";
    this.count++;
    this.onSection(pairs[0][0], pairs[0][1]);
  }

  finish(): void {
    if (!this.ended || this.inString || this.count !== this.order.length) {
      throw new Error("The analysis stream ended before all sections arrived.");
    }
  }
}

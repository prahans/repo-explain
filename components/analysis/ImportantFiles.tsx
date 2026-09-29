import { Icon } from "@/components/ui/Icon";
import type { ImportantFile } from "@/types/analysis";

export function ImportantFileCard({
  file,
  index,
}: {
  file: ImportantFile;
  index: number;
}) {
  return (
    <article className="panel-card important-file">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex min-w-0 items-center gap-2.5 font-mono text-sm font-medium">
          <Icon name="file" size={17} className="shrink-0 text-accent" />
          <span className="break-all">{file.path}</span>
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {file.explanationStatus === "unavailable" && (
            <span className="tag">Not explained</span>
          )}
          <span className="tag">{file.type}</span>
        </div>
      </div>
      <p className="mt-4 wrap-break text-base font-medium">{file.purpose}</p>
      <p className="body-copy mt-2 wrap-break">
        {file.explanationStatus !== "unavailable" && (
          <span className="font-medium text-foreground">Why it matters: </span>
        )}
        {file.significance}
      </p>
      {file.explanationStatus === "available" && file.truncated && (
        <p className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-muted">
          <Icon name="info" size={13} className="mt-1 shrink-0" />
          Based on the supplied excerpt; the full file was not analyzed.
        </p>
      )}
      <span className="file-index" aria-hidden="true">
        {String(index + 1).padStart(2, "0")}
      </span>
    </article>
  );
}

export function ImportantFiles({ files }: { files: ImportantFile[] }) {
  return (
    <section>
      <h2 className="section-heading">Good places to start</h2>
      <p className="section-description">
        What selected files do and why they matter to the project.
      </p>
      <div className="mt-6 grid gap-4">
        {files.map((file, index) => (
          <ImportantFileCard key={file.path} file={file} index={index} />
        ))}
      </div>
    </section>
  );
}

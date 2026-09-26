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
        <span className="tag">{file.type}</span>
      </div>
      <p className="mt-4 text-base font-medium">{file.purpose}</p>
      <p className="body-copy mt-2">
        <span className="font-medium text-foreground">Why it matters: </span>
        {file.significance}
      </p>
      <span className="file-index" aria-hidden="true">
        0{index + 1}
      </span>
    </article>
  );
}

export function ImportantFiles({ files }: { files: ImportantFile[] }) {
  return (
    <section>
      <h2 className="section-heading">Good places to start</h2>
      <p className="section-description">
        The files that help the rest of the codebase make sense.
      </p>
      <div className="mt-6 grid gap-4">
        {files.map((file, index) => (
          <ImportantFileCard key={file.path} file={file} index={index} />
        ))}
      </div>
    </section>
  );
}

"use client";

import { Icon } from "@/components/ui/Icon";

type RepositoryFormProps = {
  value: string;
  onChange: (value: string) => void;
  onPreview: () => void;
};

export function RepositoryForm({ value, onChange, onPreview }: RepositoryFormProps) {
  return (
    <form className="repository-form" onSubmit={(event) => { event.preventDefault(); onPreview(); }}>
      <label className="sr-only" htmlFor="repository-url">GitHub repository URL</label>
      <div className="input-shell">
        <Icon name="github" size={20} className="shrink-0 text-muted" />
        <input id="repository-url" name="repository-url" type="text" inputMode="url" autoCapitalize="none" autoComplete="off" spellCheck={false} className="repository-input" placeholder="https://github.com/username/repository" value={value} onChange={(event) => onChange(event.target.value)} aria-describedby="repository-helper" />
        <button className="primary-button" type="submit"><Icon name="sparkles" size={16} />Explain Repository<Icon name="arrow" size={15} /></button>
      </div>
      <p id="repository-helper" className="helper"><Icon name="globe" size={12} />Public GitHub repositories only for now.</p>
    </form>
  );
}

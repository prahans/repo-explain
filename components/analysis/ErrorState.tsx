import { Icon } from "@/components/ui/Icon";
import type { ErrorContent } from "@/types/analysis";

export function ErrorState({ title, description, onRetry }: ErrorContent & { onRetry?: () => void }) {
  return (
    <div className="state-surface">
      <div className="state-icon !border-[#f1d9ce] !bg-accent-soft !text-accent"><Icon name="alert" size={25} /></div>
      <div role="alert"><h2>{title}</h2><p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-muted">{description}</p></div>
      <button type="button" className="secondary-button mt-6" onClick={onRetry}><Icon name="retry" size={15} />Try again</button>
      <p className="!mb-0 !text-xs">Example error · No repository was checked</p>
    </div>
  );
}

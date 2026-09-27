import { Icon } from "@/components/ui/Icon";

const examples = ["facebook/react", "vercel/next.js", "expressjs/express"];

export function ExampleRepositories({
  onSelect,
  disabled = false,
}: {
  onSelect: (url: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="example-row">
      <span className="mr-1">Try an example</span>
      {examples.map((repository) => (
        <button
          key={repository}
          type="button"
          className="example-chip"
          disabled={disabled}
          onClick={() => onSelect(`https://github.com/${repository}`)}
        >
          <Icon name="repository" size={12} />
          {repository}
          <Icon name="arrow" size={12} className="text-[#a4a89d]" />
        </button>
      ))}
    </div>
  );
}

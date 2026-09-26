import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

export function Hero({ children }: { children: ReactNode }) {
  return (
    <section className="hero page-width" aria-labelledby="hero-heading">
      <div className="hero-eyebrow">
        <Icon name="sparkles" size={13} /> A little clarity for your next
        codebase
      </div>
      <h1 id="hero-heading">
        Understand any GitHub
        <br className="hidden sm:block" /> repository <span>with AI</span>
      </h1>
      <p className="hero-description">
        Paste a repository URL and get a clear explanation of its structure,
        technologies, important files, and how everything works together.
      </p>
      {children}
    </section>
  );
}

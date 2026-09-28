"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";

const heroMessages = [
  {
    eyebrow: "A little clarity for your next codebase",
    highlight: "with AI",
  },
  {
    eyebrow: "Explore unfamiliar code without the headache",
    highlight: "in seconds",
  },
  {
    eyebrow: "See how every piece fits together",
    highlight: "with clarity",
  },
  {
    eyebrow: "Turn repositories into conversations",
    highlight: "with context",
  },
];

export function Hero({ children }: { children: ReactNode }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setIndex((current) => (current + 1) % heroMessages.length);
    }, 4000);

    return () => window.clearInterval(interval);
  }, []);

  const message = heroMessages[index];

  return (
    <section className="hero page-width" aria-labelledby="hero-heading">
      <div className="hero-eyebrow">
        <Icon name="sparkles" size={13} />

        <span key={`eyebrow-${index}`} className="hero-changing-text">
          {message.eyebrow}
        </span>
      </div>

      <h1 id="hero-heading">
        Understand any GitHub
        <br className="hidden sm:block" /> repository{" "}
        <span
          key={`highlight-${index}`}
          className="hero-highlight hero-changing-text"
        >
          {message.highlight}
        </span>
      </h1>

      <p className="hero-description">
        Paste a repository URL and get a clear explanation of its structure,
        technologies, important files, and how everything works together.
      </p>

      {children}
    </section>
  );
}

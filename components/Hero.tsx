"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";

const heroMessages = [
  {
    eyebrow: "Get a clear overview before diving into the codebase",
    highlight: "with AI",
  },
  {
    eyebrow: "Understand the structure of an unfamiliar repository",
    highlight: "faster",
  },
  {
    eyebrow: "Discover the technologies used across the project",
    highlight: "at a glance",
  },
  {
    eyebrow: "Identify the important files worth looking at first",
    highlight: "with clarity",
  },
  {
    eyebrow: "See how the main parts of the repository fit together",
    highlight: "with context",
  },
  {
    eyebrow: "Turn a GitHub repository into an easier-to-understand overview",
    highlight: "in minutes",
  },
];

const ROTATION_INTERVAL_MS = 6000;

export function Hero({ children }: { children: ReactNode }) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let interval: number | undefined;

    function syncRotation() {
      window.clearInterval(interval);

      if (
        reducedMotion.matches ||
        document.hidden ||
        isPaused ||
        isInteracting
      ) {
        return;
      }

      interval = window.setInterval(() => {
        setIndex((current) => (current + 1) % heroMessages.length);
      }, ROTATION_INTERVAL_MS);
    }

    syncRotation();
    reducedMotion.addEventListener("change", syncRotation);
    document.addEventListener("visibilitychange", syncRotation);

    return () => {
      window.clearInterval(interval);
      reducedMotion.removeEventListener("change", syncRotation);
      document.removeEventListener("visibilitychange", syncRotation);
    };
  }, [isPaused, isInteracting]);

  return (
    <section className="hero page-width" aria-labelledby="hero-heading">
      <div className="hero-eyebrow-row">
        <div className="hero-eyebrow">
          <Icon name="sparkles" size={13} />
          <span className="hero-text-stack">
            {heroMessages.map((message, messageIndex) => (
              <span
                key={message.eyebrow}
                className="hero-changing-text"
                data-active={index === messageIndex}
                aria-hidden={index !== messageIndex}
              >
                {message.eyebrow}
              </span>
            ))}
          </span>
        </div>
        <button
          type="button"
          className="hero-rotation-toggle"
          aria-label={
            isPaused ? "Resume hero animation" : "Pause hero animation"
          }
          title={isPaused ? "Resume animation" : "Pause animation"}
          onClick={() => setIsPaused((paused) => !paused)}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden="true"
          >
            {isPaused ? (
              <path d="M5 3.5v9l7-4.5z" />
            ) : (
              <>
                <rect x="4" y="3" width="3" height="10" rx="1" />
                <rect x="9" y="3" width="3" height="10" rx="1" />
              </>
            )}
          </svg>
        </button>
      </div>

      <h1
        id="hero-heading"
        aria-label="Understand any GitHub repository with AI"
      >
        Understand any GitHub
        <br className="hidden sm:block" /> repository{" "}
        <span className="hero-highlight hero-text-stack" aria-hidden="true">
          {heroMessages.map((message, messageIndex) => (
            <span
              key={message.highlight}
              className="hero-changing-text"
              data-active={index === messageIndex}
            >
              {message.highlight}
            </span>
          ))}
        </span>
      </h1>

      <p className="hero-description">
        Paste a repository URL and get a clear explanation of its structure,
        technologies, important files, and how everything works together.
      </p>

      <div
        onFocusCapture={() => setIsInteracting(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setIsInteracting(false);
          }
        }}
      >
        {children}
      </div>
    </section>
  );
}

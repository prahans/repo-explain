"use client";

import { useState } from "react";

export function UserAvatar({
  image,
  name,
}: {
  image?: string | null;
  name: string;
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join("")
    .toUpperCase();

  return (
    <span className="user-avatar">
      {image && image !== failedImage ? (
        // OAuth avatars use the provider URL directly without image optimizer configuration.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={`${name}'s avatar`}
          width={32}
          height={32}
          onError={() => setFailedImage(image)}
          referrerPolicy="no-referrer"
        />
      ) : (
        <span role="img" aria-label={`${name}'s avatar`}>{initials}</span>
      )}
    </span>
  );
}

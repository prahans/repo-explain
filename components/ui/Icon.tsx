import type { SVGProps } from "react";

const paths = {
  code: <><path d="m8 8-4 4 4 4m8-8 4 4-4 4m-3-11-2 14" /></>,
  repository: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M5 17h14M9 3v8l3-2 3 2V3" /></>,
  github: <><path d="M9 19c-4.3 1.3-4.3-2.1-6-2.5m12 5v-3.4c0-1 .1-1.4-.5-2 3.3-.4 6.7-1.6 6.7-7.3a5.7 5.7 0 0 0-1.5-3.9 5.2 5.2 0 0 0-.1-3.9S18.3.6 15.5 2.5a13.4 13.4 0 0 0-7 0C5.7.6 4.4 1 4.4 1a5.2 5.2 0 0 0-.1 3.9 5.7 5.7 0 0 0-1.5 3.9c0 5.7 3.4 6.9 6.7 7.3-.6.6-.6 1.2-.5 2V22" /></>,
  sparkles: <><path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3ZM20 2v4m-2-2h4" /></>,
  arrow: <><path d="M4 12h16m-6-6 6 6-6 6" /></>,
  arrowDown: <><path d="M12 4v16m-6-6 6 6 6-6" /></>,
  external: <><path d="M14 3h7v7m0-7L10 14m0-11H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" /></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" /></>,
  overview: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  layers: <><path d="m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5" /></>,
  folder: <><path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></>,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 0v6h6M8 13h8m-8 4h5" /></>,
  architecture: <><rect x="9" y="2" width="6" height="6" rx="1" /><rect x="2" y="16" width="6" height="6" rx="1" /><rect x="16" y="16" width="6" height="6" rx="1" /><path d="M12 8v4M5 16v-4h14v4" /></>,
  play: <><circle cx="12" cy="12" r="9" /><path d="m10 8 6 4-6 4V8Z" /></>,
  bulb: <><path d="M9 18h6m-5 3h4M9 15v-1c-5-4-2-12 3-12s8 8 3 12v1" /></>,
  check: <><path d="m5 12 4 4L19 6" /></>,
  circleCheck: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
  star: <><path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z" /></>,
  branch: <><circle cx="6" cy="4" r="2" /><circle cx="6" cy="20" r="2" /><circle cx="18" cy="6" r="2" /><path d="M6 6v12m0-5h6a6 6 0 0 0 6-5" /></>,
  users: <><circle cx="9" cy="7" r="4" /><path d="M2 21v-3a7 7 0 0 1 14 0v3m0-18a4 4 0 0 1 0 8m3 4a6 6 0 0 1 3 5v1" /></>,
  terminal: <><rect x="2" y="3" width="20" height="18" rx="2" /><path d="m6 8 4 4-4 4m7 0h5" /></>,
  chevron: <><path d="m9 5 7 7-7 7" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18" /></>,
  alert: <><path d="m10.3 3-9 16a1.5 1.5 0 0 0 1.3 2h18.8a1.5 1.5 0 0 0 1.3-2l-9-16a2 2 0 0 0-3.4 0ZM12 9v4m0 4h.01" /></>,
  retry: <><path d="M3 10a9 9 0 1 1 2 9M3 3v7h7" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10h.01" /></>,
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 18, ...props }: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}

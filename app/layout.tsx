import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RepoExplain — Understand your next codebase",
  description:
    "A clear starting point for any GitHub repository. Explore its technologies, project structure, and architecture with RepoExplain.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

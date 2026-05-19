import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Synapse AI - Multi-Agent Research Assistant",
  description:
    "Intelligent business research powered by 4 specialized AI agents — Clarity, Research, Validator, and Synthesis.",
  keywords: ["AI research", "business intelligence", "LangGraph", "multi-agent"],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}

"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";

interface MarkdownRendererProps {
  content: string;
  variant?: "default" | "handwriting";
}

export function MarkdownRenderer({ content, variant = "default" }: MarkdownRendererProps) {
  const className =
    variant === "handwriting"
      ? "handwriting-prose max-w-none"
      : "prose prose-neutral dark:prose-invert max-w-none prose-headings:font-semibold prose-pre:bg-muted";

  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeKatex]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

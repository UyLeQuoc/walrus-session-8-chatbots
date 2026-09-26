import { marked } from "marked";
import { memo, useId, useMemo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

const components: Components = {
  p: ({ children }) => <p className="leading-relaxed [&:not(:first-child)]:mt-3">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
  a: ({ href, children }) => (
    <a href={href} className="underline underline-offset-2" target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
  code: ({ className, children }) => {
    const fenced = typeof className === "string" && className.includes("language-");
    if (fenced) return <code className={cn("font-mono text-xs", className)}>{children}</code>;
    return <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{children}</code>;
  },
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed">
      {children}
    </pre>
  ),
};

function blocksOf(markdown: string): string[] {
  try {
    return marked.lexer(markdown).map((token) => token.raw);
  } catch {
    return [markdown];
  }
}

const MarkdownBlock = memo(
  function MarkdownBlock({ content }: { content: string }) {
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
        {content}
      </ReactMarkdown>
    );
  },
  (prev, next) => prev.content === next.content,
);

export const Markdown = memo(function Markdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const blockId = useId();
  const blocks = useMemo(() => blocksOf(children), [children]);
  return (
    <div className={cn("max-w-none text-sm leading-relaxed", className)}>
      {blocks.map((block, index) => (
        <MarkdownBlock key={`${blockId}-${index}`} content={block} />
      ))}
    </div>
  );
});

"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { useState, useRef, useEffect } from "react";
import { Copy, Check } from "lucide-react";

/* ── Code block with copy button ── */
function CodeBlock({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  const language = className?.replace("hljs language-", "")?.replace("language-", "") || "";

  const handleCopy = async () => {
    const text = codeRef.current?.textContent || "";
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-3">
      {language && (
        <div className="flex items-center justify-between bg-zinc-800 text-zinc-400 text-xs px-4 py-1.5 rounded-t-lg">
          <span>{language}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 hover:text-zinc-200 transition-colors"
          >
            {copied ? (
              <><Check className="h-3 w-3" /> 已复制</>
            ) : (
              <><Copy className="h-3 w-3" /> 复制</>
            )}
          </button>
        </div>
      )}
      <pre className={`${language ? "!rounded-t-none !mt-0" : ""} overflow-x-auto`}>
        <code ref={codeRef} className={className} {...props}>
          {children}
        </code>
      </pre>
      {!language && (
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-1.5 rounded bg-zinc-700/50 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-zinc-200"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  );
}

/* ── Mermaid renderer ── */
function MermaidBlock({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function render() {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "neutral",
          securityLevel: "loose",
        });
        const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
        const { svg: rendered } = await mermaid.render(id, code);
        if (!cancelled) setSvg(rendered);
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Mermaid render failed");
      }
    }
    render();
    return () => { cancelled = true; };
  }, [code]);

  if (error) {
    return (
      <div className="my-3 p-3 border border-destructive/30 rounded-lg bg-destructive/5 text-sm text-destructive">
        Mermaid 渲染失败: {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-3 flex justify-center overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/* ── Main component ── */
export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Code blocks with mermaid support
          pre({ children }) {
            return <>{children}</>;
          },
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const isInline = !match && !className;
            const codeText = String(children).replace(/\n$/, "");

            // Mermaid diagram
            if (match?.[1] === "mermaid") {
              return <MermaidBlock code={codeText} />;
            }

            // Inline code
            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded bg-muted text-foreground text-sm font-mono"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            // Block code
            return (
              <CodeBlock className={className} {...props}>
                {children}
              </CodeBlock>
            );
          },
          // Styled table
          table({ children }) {
            return (
              <div className="my-3 overflow-x-auto">
                <table className="min-w-full border-collapse border border-border text-sm">
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="border border-border bg-muted px-3 py-2 text-left font-medium">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="border border-border px-3 py-2">{children}</td>
            );
          },
          // Links open in new tab
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {children}
              </a>
            );
          },
          // Task lists
          input({ checked, ...props }) {
            return (
              <input
                type="checkbox"
                checked={checked}
                readOnly
                className="mr-1.5 rounded"
                {...props}
              />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

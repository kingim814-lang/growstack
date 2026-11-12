"use client";

import { useState, isValidElement, Children } from "react";
import type { ReactNode } from "react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

import { Check, Copy } from "lucide-react";

type Props = {
  content: string;
};

// Extract plain text from React elements.
// This also handles syntax-highlighted code spans.
function getTextContent(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(getTextContent).join("");
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return getTextContent(node.props.children);
  }

  return "";
}

function MarkdownParagraph({
  children,
}: {
  children?: ReactNode;
}) {
  return (
    <p className="my-1 leading-6">
      {children}
    </p>
  );
}

// Code block with copy functionality
function CodeBlock({ children }: { children: ReactNode }) {
  const [copied, setCopied] = useState(false);

  const code = getTextContent(children).replace(/\n$/, "");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy code:", error);
    }
  }

  return (
    <div className="group relative my-1 overflow-hidden rounded-xl border border-[#424242] bg-[#171717]">
      {/* Code header */}
      <div className="flex items-center justify-between border-b border-[#424242] px-4 py-2">
        <span className="text-xs font-medium text-neutral-400">
          Code
        </span>

        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? "Code copied" : "Copy code"}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-neutral-300 transition-colors hover:bg-neutral-700 cursor-pointer"
        >
          {copied ? (
            <Check size={14} />
          ) : (
            <Copy size={14} />
          )}

          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {/* Code content */}
      <pre className="overflow-x-auto p-4 text-sm leading-6">
        {children}
      </pre>
    </div>
  );
}

// Main Markdown renderer
export default function MarkdownRenderer({ content }: Props) {
  return (
    <div className="markdown-content min-w-0 text-[15px] leading-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="mt-6 text-2xl font-bold tracking-tight">
              {children}
            </h1>
          ),

          h2: ({ children }) => (
            <h2 className="mt-6 text-xl font-semibold tracking-tight">
              {children}
            </h2>
          ),

          h3: ({ children }) => (
            <h3 className="mt-5 text-lg font-semibold">
              {children}
            </h3>
          ),

          h4: ({ children }) => (
            <h4 className="mt-4 font-semibold">
              {children}
            </h4>
          ),

          // Paragraphs
          p: MarkdownParagraph,

          // Ordered lists
          ol: ({ children }) => (
            <ol className="my-2 list-decimal space-y-1 pl-6">
              {children}
            </ol>
          ),

          // Unordered lists
          ul: ({ children }) => (
            <ul className="my-1 list-disc space-y-0 pl-6">
              {children}
            </ul>
          ),

          // List items
          li: ({ children }) => (
            <li className="pl-1 leading-6">
              {Children.map(children, (child) => {
                if (
                  isValidElement<{ children?: ReactNode }>(child) &&
                  child.type === MarkdownParagraph
                ) {
                  return child.props.children;
                }

                return child;
              })}
            </li>
          ),

          // Bold and italic
          strong: ({ children }) => (
            <strong className="font-semibold">
              {children}
            </strong>
          ),

          em: ({ children }) => (
            <em className="italic">
              {children}
            </em>
          ),

          // Blockquote
          blockquote: ({ children }) => (
            <blockquote className="my-4 border-l-4 border-neutral-400 pl-4 text-neutral-500 dark:border-neutral-600 dark:text-neutral-400">
              {children}
            </blockquote>
          ),

          // Links
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline underline-offset-4 transition-colors hover:text-blue-400"
            >
              {children}
            </a>
          ),

          // Tables
          table: ({ children }) => (
            <div className="my-5 overflow-x-auto rounded-lg border border-neutral-300 dark:border-neutral-700">
              <table className="w-full border-collapse text-sm">
                {children}
              </table>
            </div>
          ),

          thead: ({ children }) => (
            <thead className="bg-neutral-100 dark:bg-[#303030]">
              {children}
            </thead>
          ),

          tbody: ({ children }) => (
            <tbody>
              {children}
            </tbody>
          ),

          tr: ({ children }) => (
            <tr className="border-t border-neutral-200 dark:border-neutral-700">
              {children}
            </tr>
          ),

          th: ({ children }) => (
            <th className="border-b border-neutral-300 px-4 py-3 text-left font-semibold dark:border-neutral-700">
              {children}
            </th>
          ),

          td: ({ children }) => (
            <td className="px-4 py-3">
              {children}
            </td>
          ),

          // Code blocks
          pre: ({ children }) => (
            <CodeBlock>
              {children}
            </CodeBlock>
          ),

          // Inline code
          code: ({ children, className }) => (
            <code
              className={
                className ??
                "rounded-md bg-neutral-200 px-1.5 py-0.5 font-mono text-[0.9em] dark:bg-[#383838]"
              }
            >
              {children}
            </code>
          ),

          // Horizontal divider
          hr: () => (
            <hr className="my-6 border-neutral-300 dark:border-neutral-700" />
          ),

          // Images
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt ?? ""}
              loading="lazy"
              className="my-4 max-h-112.5 max-w-full rounded-xl object-contain"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
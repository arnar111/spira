import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Birtir markdown-svar Rósar (feitletrun, skáletur, yfirstrikun, listar).
 * Notað bæði í Heilsa- og Spjall-flipanum (4.4 skipting — áður í RosWindow.tsx).
 */
export function MarkdownText({ content }: { content: string }) {
  return (
    <div className="text-[13px] text-cream-100 leading-relaxed space-y-2 [overflow-wrap:anywhere]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-cream-50">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          del: ({ children }) => <del className="line-through opacity-80">{children}</del>,
          ul: ({ children }) => <ul className="list-disc pl-4 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          hr: () => <hr className="my-1.5 border-0 h-px bg-moss-700/40" />,
          h1: ({ children }) => <p className="font-semibold text-cream-50">{children}</p>,
          h2: ({ children }) => <p className="font-semibold text-cream-50">{children}</p>,
          h3: ({ children }) => <p className="font-semibold text-cream-50">{children}</p>,
          code: ({ children }) => (
            <code className="sp-mono text-[12px] px-1 py-0.5 rounded bg-moss-950/60">
              {children}
            </code>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="underline text-moss-300"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

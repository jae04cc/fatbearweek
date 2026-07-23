import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";

export function AnnouncementBody({ body }: { body: string }) {
  return (
    <div className="space-y-3 text-sm text-neutral-300">
      <Markdown
        remarkPlugins={[remarkBreaks]}
        components={{
          p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={alt ?? ""} className="w-full rounded-xl object-cover" />
          ),
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent-light underline">
              {children}
            </a>
          ),
          h1: ({ children }) => <h1 className="text-lg font-bold text-neutral-50">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold text-neutral-50">{children}</h2>,
          h3: ({ children }) => (
            <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-100">{children}</h3>
          ),
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-accent/40 pl-3 italic text-neutral-400">{children}</blockquote>
          ),
          code: ({ children }) => (
            <code className="rounded bg-black/30 px-1 py-0.5 font-mono text-xs text-neutral-200">{children}</code>
          ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-lg bg-black/30 p-3 font-mono text-xs text-neutral-200">
              {children}
            </pre>
          ),
          hr: () => <hr className="border-white/10" />,
        }}
      >
        {body}
      </Markdown>
    </div>
  );
}

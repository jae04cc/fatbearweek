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
        }}
      >
        {body}
      </Markdown>
    </div>
  );
}

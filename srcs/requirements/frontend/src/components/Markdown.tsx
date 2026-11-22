import React from "react";
import ReactMarkdown, {Components} from "react-markdown";

const components: Components = {
    h1: ({children}) => <p className="font-condensed uppercase text-3xl tracking-wide mt-4 first:mt-0">{children}</p>,
    h2: ({children}) => <p className="font-condensed uppercase text-2xl tracking-wide mt-4 first:mt-0">{children}</p>,
    h3: ({children}) => <p className="font-bold uppercase mt-3 first:mt-0">{children}</p>,
    p: ({children}) => <p className="mt-2 first:mt-0">{children}</p>,
    ul: ({children}) => <ul className="list-disc pl-5 mt-2 space-y-1">{children}</ul>,
    ol: ({children}) => <ol className="list-decimal pl-5 mt-2 space-y-1">{children}</ol>,
    a: ({href, children}) => <a href={href} target="_blank" rel="noreferrer" className="underline hover:text-accent">{children}</a>,
    blockquote: ({children}) => <blockquote className="border-l-2 pl-3 mt-2 text-gray">{children}</blockquote>,
    code: ({children}) => <code className="px-1 bg-dwhite-light border text-sm">{children}</code>,
    // eslint-disable-next-line @next/next/no-img-element
    img: ({src, alt}) => <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} loading="lazy" className="block max-w-full h-auto border mt-2"/>,
};

/** Markdown written in the admin: raw HTML is not rendered. */
export default function Markdown({children, className}: {children: string, className?: string}) {
    return (<div className={className}>
        <ReactMarkdown components={components}>{children}</ReactMarkdown>
    </div>);
}

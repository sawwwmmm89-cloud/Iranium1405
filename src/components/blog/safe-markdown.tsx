import { createElement, type ReactNode } from 'react';
import { parseMarkdown, type Inline } from '@/lib/safe-markdown';

function renderInline(inlines: Inline[]): ReactNode[] {
  return inlines.map((n, i) => {
    switch (n.t) {
      case 'bold': return <strong key={i}>{n.v}</strong>;
      case 'code': return <code key={i} className="rounded bg-ink/5 px-1 text-sm" dir="ltr">{n.v}</code>;
      case 'link': return <a key={i} href={n.href} rel="noopener noreferrer nofollow ugc" className="text-primary underline">{n.v}</a>;
      default: return <span key={i}>{n.v}</span>;
    }
  });
}

/** Renders the safe Markdown AST as React elements (text is always escaped by React). */
export function SafeMarkdown({ source }: { source: string }) {
  return (
    <div className="space-y-4 leading-8">
      {parseMarkdown(source).map((b, i) => {
        if (b.t === 'h') return createElement(`h${b.level}`, { key: i, className: 'mt-6 font-bold text-xl' }, renderInline(b.inlines));
        if (b.t === 'ul') return <ul key={i} className="list-disc space-y-1 ps-6">{b.items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}</ul>;
        return <p key={i}>{renderInline(b.inlines)}</p>;
      })}
    </div>
  );
}

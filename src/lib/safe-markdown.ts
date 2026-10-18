/**
 * Minimal, injection-proof Markdown subset. It produces an AST that React renders as elements, so user
 * text is never interpreted as HTML (no dangerouslySetInnerHTML anywhere). Supported: ##/###/#### headings,
 * paragraphs, "- " lists, **bold**, `code`, [text](http(s) or /relative url).
 */
export type Inline =
  | { t: 'text'; v: string }
  | { t: 'bold'; v: string }
  | { t: 'code'; v: string }
  | { t: 'link'; v: string; href: string };

export type Block =
  | { t: 'h'; level: 2 | 3 | 4; inlines: Inline[] }
  | { t: 'p'; inlines: Inline[] }
  | { t: 'ul'; items: Inline[][] };

export const isSafeHref = (href: string): boolean => /^(https?:\/\/[^\s]+|\/(?![/\\])[^\s]*)$/i.test(href);

const INLINE = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\))/g;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push({ t: 'text', v: text.slice(last, idx) });
    const tok = m[0];
    if (tok.startsWith('**')) out.push({ t: 'bold', v: tok.slice(2, -2) });
    else if (tok.startsWith('`')) out.push({ t: 'code', v: tok.slice(1, -1) });
    else {
      const parts = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok);
      const label = parts?.[1] ?? tok;
      const href = parts?.[2] ?? '';
      out.push(isSafeHref(href) ? { t: 'link', v: label, href } : { t: 'text', v: label }); // unsafe scheme => plain text
    }
    last = idx + tok.length;
  }
  if (last < text.length) out.push({ t: 'text', v: text.slice(last) });
  return out;
}

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: Inline[][] | null = null;
  const flushPara = () => {
    if (para.length) blocks.push({ t: 'p', inlines: parseInline(para.join(' ')) });
    para = [];
  };
  const flushList = () => {
    if (list) blocks.push({ t: 'ul', items: list });
    list = null;
  };
  for (const raw of source.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    const heading = /^(#{1,4})\s+(.+)$/.exec(line);
    const item = /^[-*]\s+(.+)$/.exec(line);
    if (!line) {
      flushPara();
      flushList();
    } else if (heading) {
      flushPara();
      flushList();
      const level = Math.min(4, Math.max(2, (heading[1] ?? '#').length)) as 2 | 3 | 4;
      blocks.push({ t: 'h', level, inlines: parseInline(heading[2] ?? '') });
    } else if (item) {
      flushPara();
      (list ??= []).push(parseInline(item[1] ?? ''));
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return blocks;
}

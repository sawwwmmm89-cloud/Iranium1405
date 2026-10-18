import { describe, expect, it } from 'vitest';
import { isSafeHref, parseInline, parseMarkdown } from '@/lib/safe-markdown';

describe('safe markdown (XSS)', () => {
  it('keeps raw HTML/script as inert text nodes', () => {
    const blocks = parseMarkdown('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>');
    expect(blocks).toEqual([
      { t: 'p', inlines: [{ t: 'text', v: '<script>alert(1)</script>' }] },
      { t: 'p', inlines: [{ t: 'text', v: '<img src=x onerror=alert(1)>' }] },
    ]);
  });
  it('only http(s) and root-relative links become links', () => {
    expect(isSafeHref('https://a.com/x')).toBe(true);
    expect(isSafeHref('/blog/x')).toBe(true);
    for (const bad of ['javascript:alert(1)', 'data:text/html,x', '//evil.com', '/\\evil.com', 'vbscript:x', ' https://a.com']) expect(isSafeHref(bad)).toBe(false);
    expect(parseInline('[click](javascript:alert(1))').some((n) => n.t === 'link')).toBe(false);
    expect(parseInline('[click](javascript:alert(1))')[0]).toEqual({ t: 'text', v: 'click' });
    expect(parseInline('[ok](https://a.com)')).toEqual([{ t: 'link', v: 'ok', href: 'https://a.com' }]);
  });
  it('supports headings, lists, bold and code', () => {
    const b = parseMarkdown('# عنوان\n\nمتن **پررنگ** و `کد`\n\n- یک\n- دو');
    expect(b[0]).toMatchObject({ t: 'h', level: 2 });
    expect(b[1]).toMatchObject({ t: 'p' });
    expect(b[2]).toMatchObject({ t: 'ul' });
    expect((b[2] as { items: unknown[] }).items).toHaveLength(2);
  });
});

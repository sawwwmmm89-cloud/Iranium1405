import { describe, expect, it } from 'vitest';
import { detectMime, sanitizeFileName, validateUpload } from '@/server/storage/file-policy';

const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a]);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]);
const text = (s: string) => new TextEncoder().encode(s);
const max = 1024 * 1024;

describe('detectMime (magic bytes)', () => {
  it('recognises allowed types', () => {
    expect(detectMime(pdf)).toBe('application/pdf');
    expect(detectMime(png)).toBe('image/png');
    expect(detectMime(jpeg)).toBe('image/jpeg');
    expect(detectMime(webp)).toBe('image/webp');
  });
  it('rejects scripts, HTML, SVG, executables and RIFF that is not WEBP', () => {
    for (const bad of ['<script>alert(1)</script>', '<!doctype html>', '<svg xmlns="http://www.w3.org/2000/svg"/>', 'MZ\u0090\u0000', '#!/bin/sh\n']) {
      expect(detectMime(text(bad))).toBeNull();
    }
    expect(detectMime(new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45]))).toBeNull(); // WAV
  });
});

describe('validateUpload', () => {
  it('accepts a real PDF and derives the extension from content', () => {
    expect(validateUpload({ name: 'جزوه.PDF', declaredMime: 'application/pdf', bytes: pdf, maxBytes: max })).toMatchObject({ mime: 'application/pdf', ext: 'pdf', displayName: 'جزوه.PDF' });
  });
  it('413 when too large, 422 when empty', () => {
    expect(() => validateUpload({ name: 'a.pdf', declaredMime: undefined, bytes: pdf, maxBytes: 4 })).toThrowError(expect.objectContaining({ status: 413 }));
    expect(() => validateUpload({ name: 'a.pdf', declaredMime: undefined, bytes: new Uint8Array(), maxBytes: max })).toThrowError(expect.objectContaining({ status: 422 }));
  });
  it('415 for a forged MIME: HTML renamed .pdf and declared as PDF', () => {
    expect(() => validateUpload({ name: 'evil.pdf', declaredMime: 'application/pdf', bytes: text('<html><script>1</script></html>'), maxBytes: max })).toThrowError(expect.objectContaining({ status: 415, code: 'UNSUPPORTED_FILE_TYPE' }));
  });
  it('415 when declared MIME or extension contradict the real content', () => {
    expect(() => validateUpload({ name: 'a.png', declaredMime: 'image/png', bytes: pdf, maxBytes: max })).toThrowError(expect.objectContaining({ code: 'MIME_MISMATCH' }));
    expect(() => validateUpload({ name: 'a.png', declaredMime: undefined, bytes: pdf, maxBytes: max })).toThrowError(expect.objectContaining({ code: 'EXTENSION_MISMATCH' }));
    expect(() => validateUpload({ name: 'a.exe', declaredMime: undefined, bytes: png, maxBytes: max })).toThrowError(expect.objectContaining({ code: 'EXTENSION_MISMATCH' }));
  });
  it('allows jpg and jpeg for JPEG content', () => {
    expect(validateUpload({ name: 'x.jpg', declaredMime: 'image/jpeg', bytes: jpeg, maxBytes: max }).mime).toBe('image/jpeg');
    expect(validateUpload({ name: 'x.jpeg', declaredMime: undefined, bytes: jpeg, maxBytes: max }).ext).toBe('jpg');
  });
});

describe('sanitizeFileName', () => {
  it('strips paths, control and bidi characters', () => {
    expect(sanitizeFileName('../../etc/passwd')).toBe('passwd');
    expect(sanitizeFileName('C:\\x\\y\\report.pdf')).toBe('report.pdf');
    expect(sanitizeFileName('a\u202eb\u0000c.pdf')).toBe('abc.pdf');
    expect(sanitizeFileName('"><img src=x onerror=1>.pdf')).not.toMatch(/[<>"]/);
  });
  it('falls back and limits length', () => {
    expect(sanitizeFileName('...')).toBe('file');
    expect(Array.from(sanitizeFileName('الف'.repeat(300))).length).toBeLessThanOrEqual(120);
  });
});

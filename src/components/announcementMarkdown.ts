/**
 * Announcement body rendering — the embed half of the parity contract.
 *
 * Raw HTML is escaped to visible text, never stripped and never honoured
 * (`sanitize: true` routes it through the parser's escape). Elements and
 * attributes outside the supported subset are unwrapped, keeping their text.
 *
 * Options are passed per call, NOT via Marked.setOptions: Marked.options is
 * static and BotBubble rewrites it on every render, so a global write here
 * would fight bot bubbles for shared state. Per-call options merge OVER that
 * global, so every option this module relies on is stated explicitly.
 *
 * The attribute allowlist is load-bearing for parity, not hygiene: this parser
 * adds `id="…"` to headings and marked does not, so stripping attributes is
 * what makes a supported `h3` agree across the two renderers.
 *
 * Canonical fixture: docs/announcement-markdown-fixture.md in mosaad_mcp.
 */
import { Marked } from '@ts-stack/markdown';

const ALLOWED_TAGS = ['STRONG', 'EM', 'A', 'UL', 'OL', 'LI', 'H3', 'H4', 'CODE', 'BLOCKQUOTE', 'P', 'BR'];
const ALLOWED_ATTRS = ['href', 'target', 'rel'];

const OPTIONS = { sanitize: true, isNoP: false, gfm: true, breaks: false };

const stripDisallowed = (element: Element): void => {
  for (const child of Array.from(element.children)) stripDisallowed(child);

  for (const attr of Array.from(element.attributes)) {
    if (!ALLOWED_ATTRS.includes(attr.name)) element.removeAttribute(attr.name);
  }

  if (!ALLOWED_TAGS.includes(element.tagName)) {
    element.replaceWith(...Array.from(element.childNodes));
  }
};

export const renderAnnouncementBody = (body: string): string => {
  if (!body) return '';

  const host = document.createElement('div');
  host.innerHTML = Marked.parse(body, OPTIONS);

  for (const child of Array.from(host.children)) stripDisallowed(child);

  host.querySelectorAll('a').forEach((anchor) => {
    anchor.setAttribute('target', '_blank');
    anchor.setAttribute('rel', 'noopener noreferrer');
  });

  return host.innerHTML.trim();
};

/**
 * Resolve a stored media url against the API host.
 *
 * Standard URL resolution covers both cases with one rule: a relative path takes
 * the base, and an absolute url ignores it — so no branch on media_id is needed.
 * Wrapped because a malformed stored value must not throw inside a render.
 */
export const resolveMediaUrl = (url: string, apiHost: string): string => {
  if (!url) return '';
  try {
    return new URL(url, apiHost || undefined).toString();
  } catch {
    return url;
  }
};

/**
 * Pure sanitization and markdown/math parsing helpers for safe question rendering.
 */

const SAFE_RASTER_DATA_IMAGE_RE = /^data:image\/(png|jpe?g|gif|webp|avif);/i;

/**
 * Validates whether an image URL is safe to bind to <img src>.
 * Allows https://, http://, root-relative paths (but NOT protocol-relative //),
 * and safe raster data URIs (explicitly excluding data:image/svg+xml).
 */
export function isSafeImageSrc(src?: string): boolean {
  if (!src) return false;
  const trimmed = src.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return true;
  }
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return true;
  }
  if (trimmed.startsWith('./') || trimmed.startsWith('../')) {
    return true;
  }
  if (SAFE_RASTER_DATA_IMAGE_RE.test(trimmed)) {
    return true;
  }
  return false;
}

/**
 * Sanitizes inline SVG diagrams bundled in question JSONs before rendering.
 * Strips dangerous elements, event handlers, scriptable URLs, external hrefs,
 * and CSS @import/url() payloads.
 */
export function sanitizeSvgMarkup(svg: string): string {
  if (!svg || !svg.trim()) return '';
  let clean = svg
    // Remove script, foreignObject, iframe, object, embed, link, meta, base blocks
    .replace(
      /<\s*(script|foreignObject|iframe|object|embed|link|meta|base|audio|video|applet)\b[\s\S]*?<\s*\/\s*\1\s*>/gi,
      '',
    )
    // Remove self-closing or unclosed dangerous tags
    .replace(
      /<\s*(script|foreignObject|iframe|object|embed|link|meta|base|audio|video|applet)\b[^>]*\/?\s*>/gi,
      '',
    )
    // Strip dangerous CSS directives inside <style> blocks
    .replace(/<\s*style\b[^>]*>([\s\S]*?)<\s*\/\s*style\s*>/gi, (_match, css: string) => {
      const safeCss = css
        .replace(/@import[\s\S]*?(;|$)/gi, '')
        .replace(/expression\s*\([^)]*\)/gi, '')
        .replace(/url\s*\(\s*(['"]?)\s*(?!#)[^)]*\1\s*\)/gi, 'none');
      return `<style>${safeCss}</style>`;
    })
    // Strip inline event handler attributes (onclick, onload, onerror, etc.)
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // Strip javascript:, vbscript:, data:text/html schemes in any attribute
    .replace(
      /\s+(href|xlink:href|src|action|formaction)\s*=\s*(?:"\s*(?:javascript|vbscript|data\s*:\s*text\/html|https?:|\/\/)[^"]*"|'\s*(?:javascript|vbscript|data\s*:\s*text\/html|https?:|\/\/)[^']*'|[^\s>]+)/gi,
      (match, attr: string) => {
        // Keep internal fragment references like href="#grad1"
        const valMatch = match.match(/=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/);
        const val = (valMatch?.[1] ?? valMatch?.[2] ?? valMatch?.[3] ?? '').trim();
        if (val.startsWith('#')) {
          return ` ${attr}="${val.replace(/"/g, '')}"`;
        }
        return '';
      },
    )
    // Strip javascript: / expression() inside inline style attributes
    .replace(/style\s*=\s*(?:"([^"]*)"|'([^']*)')/gi, (_match, dq?: string, sq?: string) => {
      const val = (dq ?? sq ?? '')
        .replace(/expression\s*\([^)]*\)/gi, '')
        .replace(/url\s*\(\s*(['"]?)\s*(?!#)[^)]*\1\s*\)/gi, 'none')
        .replace(/javascript\s*:/gi, '');
      return `style="${val.replace(/"/g, '&quot;')}"`;
    });

  // Ensure root markup is actually an <svg> element
  const trimmed = clean.trim();
  if (!/^<svg\b/i.test(trimmed)) {
    return '';
  }
  clean = trimmed;
  return clean;
}

/**
 * Splits a Markdown table row on `|` delimiters while ignoring pipes inside `$...$` math
 * or escaped `\|` sequences.
 */
export function splitMarkdownTableCells(row: string): string[] {
  const trimmed = row.trim();
  const stripped = trimmed.replace(/^\|/, '').replace(/\|$/, '');
  const cells: string[] = [];
  let current = '';
  let inInlineMath = false;

  for (let i = 0; i < stripped.length; i += 1) {
    const ch = stripped[i];
    if (ch === '\\' && i + 1 < stripped.length) {
      if (stripped[i + 1] === '|') {
        current += '|';
        i += 1;
        continue;
      }
      current += ch + stripped[i + 1];
      i += 1;
      continue;
    }
    if (ch === '$') {
      inInlineMath = !inInlineMath;
      current += ch;
      continue;
    }
    if (ch === '|' && !inInlineMath) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

export interface TextBlock {
  type: 'table' | 'display-math' | 'line';
  content: string;
  headers?: string[];
  rows?: string[][];
}

const TABLE_SEP_RE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/;

/**
 * Splits raw markdown/math text into structured blocks:
 * - Multi-line or single-line `$$...$$` display math blocks
 * - Markdown pipe tables (with math-aware cell splitting)
 * - Regular text lines
 */
export function parseContentBlocks(rawText: string): TextBlock[] {
  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  const blocks: TextBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Multi-line display math block starting with $$ on its own line
    if (trimmed === '$$') {
      const mathLines: string[] = [];
      let j = i + 1;
      let closed = false;
      while (j < lines.length) {
        if (lines[j].trim() === '$$') {
          closed = true;
          break;
        }
        mathLines.push(lines[j]);
        j += 1;
      }
      if (closed) {
        blocks.push({ type: 'display-math', content: mathLines.join('\n').trim() });
        i = j + 1;
        continue;
      }
    }

    // Markdown pipe table detection: header row + separator row
    if (
      line.includes('|') &&
      i + 1 < lines.length &&
      TABLE_SEP_RE.test(lines[i + 1])
    ) {
      const headers = splitMarkdownTableCells(line);
      const rows: string[][] = [];
      let j = i + 2;
      while (j < lines.length && lines[j].trim().includes('|') && lines[j].trim() !== '') {
        rows.push(splitMarkdownTableCells(lines[j]));
        j += 1;
      }
      blocks.push({ type: 'table', content: '', headers, rows });
      i = j;
      continue;
    }

    blocks.push({ type: 'line', content: line });
    i += 1;
  }

  return blocks;
}

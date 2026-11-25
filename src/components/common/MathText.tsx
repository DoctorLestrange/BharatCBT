import React, { useMemo } from 'react';
import katex from 'katex';
import { cn } from '../../utils/cn';
import {
  isSafeImageSrc,
  parseContentBlocks,
  sanitizeSvgMarkup,
} from '../../utils/sanitize';

interface MathTextProps {
  text: string;
  className?: string;
}

const KATEX_BASE_OPTIONS = {
  throwOnError: false,
  strict: 'ignore' as const,
  trust: false,
  maxExpand: 500,
};

function renderInlineFormatting(segment: string, keyPrefix: string): React.ReactNode[] {
  // Replace escaped \$ temporarily so literal currency amounts don't trigger math mode
  const ESCAPED_DOLLAR = '\uE000';
  const safeSegment = segment.replace(/\\\$/g, ESCAPED_DOLLAR);

  const nodes: React.ReactNode[] = [];
  const tokenRegex =
    /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\*\*[^*\n]+?\*\*|\*[^*\n]+?\*|`[^`\n]+?`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = tokenRegex.exec(safeSegment)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(safeSegment.slice(lastIndex, match.index).replaceAll(ESCAPED_DOLLAR, '$'));
    }
    const token = match[0];
    if (token.startsWith('$$') && token.endsWith('$$')) {
      const latex = token.slice(2, -2).trim().replaceAll(ESCAPED_DOLLAR, '\\$');
      const html = katex.renderToString(latex, {
        ...KATEX_BASE_OPTIONS,
        displayMode: true,
      });
      nodes.push(
        <span
          key={`${keyPrefix}-dm-${idx++}`}
          className="my-2 block overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    } else if (token.startsWith('$') && token.endsWith('$')) {
      const latex = token.slice(1, -1).trim().replaceAll(ESCAPED_DOLLAR, '\\$');
      const html = katex.renderToString(latex, {
        ...KATEX_BASE_OPTIONS,
        displayMode: false,
      });
      nodes.push(
        <span
          key={`${keyPrefix}-im-${idx++}`}
          className="inline-block align-middle"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(
        <strong key={`${keyPrefix}-b-${idx++}`} className="font-semibold">
          {renderInlineFormatting(
            token.slice(2, -2).replaceAll(ESCAPED_DOLLAR, '\\$'),
            `${keyPrefix}-bi-${idx}`
          )}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      nodes.push(
        <em key={`${keyPrefix}-i-${idx++}`} className="italic">
          {renderInlineFormatting(
            token.slice(1, -1).replaceAll(ESCAPED_DOLLAR, '\\$'),
            `${keyPrefix}-ii-${idx}`
          )}
        </em>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <code
          key={`${keyPrefix}-c-${idx++}`}
          className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[0.9em] text-slate-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-orange-200"
        >
          {token.slice(1, -1).replaceAll(ESCAPED_DOLLAR, '$')}
        </code>
      );
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < safeSegment.length) {
    nodes.push(safeSegment.slice(lastIndex).replaceAll(ESCAPED_DOLLAR, '$'));
  }
  return nodes;
}

export const MathText: React.FC<MathTextProps> = ({ text, className }) => {
  const renderedBlocks = useMemo(() => {
    if (!text) return null;
    const parsed = parseContentBlocks(text);
    const blocks: React.ReactNode[] = [];
    let i = 0;
    let blockKey = 0;

    while (i < parsed.length) {
      const item = parsed[i];

      if (item.type === 'display-math') {
        const html = katex.renderToString(item.content, {
          ...KATEX_BASE_OPTIONS,
          displayMode: true,
        });
        blocks.push(
          <div
            key={`dmblk-${blockKey++}`}
            className="my-2 overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
        i++;
        continue;
      }

      if (item.type === 'table' && item.headers) {
        const headers = item.headers;
        const rows = item.rows ?? [];
        const tblKey = blockKey++;
        blocks.push(
          <div key={`tbl-${tblKey}`} className="my-2.5 overflow-x-auto">
            <table className="min-w-full border-collapse border border-slate-300 text-sm dark:border-neutral-700">
              <thead className="bg-slate-100 dark:bg-neutral-800">
                <tr>
                  {headers.map((h, hIdx) => (
                    <th
                      key={hIdx}
                      className="border border-slate-300 px-3 py-1.5 text-left font-semibold text-slate-800 dark:border-neutral-700 dark:text-neutral-100"
                    >
                      {renderInlineFormatting(h, `th-${tblKey}-${hIdx}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className={
                      rIdx % 2 === 1
                        ? 'bg-slate-50/70 dark:bg-neutral-800/40'
                        : 'bg-white dark:bg-neutral-900/60'
                    }
                  >
                    {headers.map((_, cIdx) => (
                      <td
                        key={cIdx}
                        className="border border-slate-300 px-3 py-1.5 text-slate-800 dark:border-neutral-700 dark:text-neutral-200"
                      >
                        {renderInlineFormatting(row[cIdx] ?? '', `td-${tblKey}-${rIdx}-${cIdx}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        i++;
        continue;
      }

      const line = item.content;

      // Bullet list block
      if (/^\s*[-•]\s+/.test(line)) {
        const listItems: string[] = [];
        while (i < parsed.length && parsed[i].type === 'line' && /^\s*[-•]\s+/.test(parsed[i].content)) {
          listItems.push(parsed[i].content.replace(/^\s*[-•]\s+/, ''));
          i++;
        }
        const ulKey = blockKey++;
        blocks.push(
          <ul key={`ul-${ulKey}`} className="my-1.5 list-disc space-y-1 pl-5">
            {listItems.map((listItem, liIdx) => (
              <li key={liIdx}>{renderInlineFormatting(listItem, `li-${ulKey}-${liIdx}`)}</li>
            ))}
          </ul>
        );
        continue;
      }

      // Empty line spacer
      if (line.trim() === '') {
        blocks.push(<div key={`sp-${blockKey++}`} className="h-2" />);
        i++;
        continue;
      }

      // Regular paragraph line
      const pKey = blockKey++;
      blocks.push(
        <p key={`p-${pKey}`} className="leading-relaxed">
          {renderInlineFormatting(line, `p-${pKey}`)}
        </p>
      );
      i++;
    }

    return blocks;
  }, [text]);

  return <div className={cn('space-y-0.5 break-words', className)}>{renderedBlocks}</div>;
};

export const SafeDiagram: React.FC<{ svg?: string; image?: string; alt?: string }> = ({
  svg,
  image,
  alt = 'Question diagram',
}) => {
  const svgDataUri = useMemo(() => {
    if (!svg || !svg.trim()) return null;
    const sanitized = sanitizeSvgMarkup(svg);
    if (!sanitized) return null;
    const withXmlns = /\bxmlns=/.test(sanitized)
      ? sanitized
      : sanitized.replace(/^<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
    return `data:image/svg+xml;utf8,${encodeURIComponent(withXmlns)}`;
  }, [svg]);

  const validImage = image && isSafeImageSrc(image) ? image.trim() : null;

  if (!svgDataUri && !validImage) return null;

  return (
    <div className="my-3 flex flex-wrap gap-3">
      {svgDataUri && (
        <img
          src={svgDataUri}
          alt={alt}
          className="max-h-72 max-w-full rounded border border-slate-200 bg-white p-1.5 dark:border-neutral-700"
        />
      )}
      {validImage && (
        <img
          src={validImage}
          alt={alt}
          className="max-h-72 max-w-full rounded border border-slate-200 bg-white object-contain p-1 dark:border-neutral-700"
        />
      )}
    </div>
  );
};

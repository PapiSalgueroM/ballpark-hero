/**
 * Round 840: the one function that turns src/data/homeCopy.ts into the static
 * block in index.html. scripts/genHomeCopy.mjs writes its output into the
 * template, and scripts/simHomeCopy.mjs (section 6) calls the same function and
 * fails when the committed block is not exactly what it returns, so the
 * template and the app can only say the same thing.
 *
 * The markup is the plain shape the block has always had (h1, h2, h3, p, ul,
 * li, a), because simHomeCopy, simLoginReturn, playSoftFourOhFour and the
 * sitemap fingerprint all read that shape.
 */

/** The two comments the generated block sits between. Neither may contain a
    greater than sign: simHomeCopy strips tags with a plain pattern. */
export const HOME_COPY_START = '<!-- home-copy:start. Generated from src/data/homeCopy.ts by node scripts/genHomeCopy.mjs: edit the module, never this block -->';
export const HOME_COPY_END = '<!-- home-copy:end -->';

const text = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = s => text(s).replace(/"/g, '&quot;');

function line(parts) {
  return parts.map(part => {
    if (typeof part === 'string') return text(part);
    if (!part || typeof part.to !== 'string' || typeof part.text !== 'string') {
      throw new Error(`homeCopyHtml: a line part is neither words nor a link: ${JSON.stringify(part)}`);
    }
    return `<a href="${attr(part.to)}">${text(part.text)}</a>`;
  }).join('');
}

/** The block's lines, without the markers, one element per line. */
export function homeCopyLines(copy, indent = '      ') {
  const out = [];
  out.push(`${indent}<h1>${text(copy.h1)}</h1>`);
  out.push(`${indent}<p>${line(copy.intro)}</p>`);
  for (const section of copy.sections) {
    out.push(`${indent}<h2>${text(section.heading)}</h2>`);
    for (const b of section.blocks) {
      if (b.kind === 'p') out.push(`${indent}<p>${line(b.parts)}</p>`);
      else if (b.kind === 'question') out.push(`${indent}<h3>${text(b.text)}</h3>`);
      else if (b.kind === 'list') {
        out.push(`${indent}<ul>`);
        for (const item of b.items) out.push(`${indent}  <li>${line(item)}</li>`);
        out.push(`${indent}</ul>`);
      } else {
        throw new Error(`homeCopyHtml: unknown block ${JSON.stringify(b)}`);
      }
    }
  }
  out.push(`${indent}<p>${line(copy.closing)}</p>`);
  return out;
}

/** Splits the template at the markers. Null when either is missing, out of
    order, or present twice, so a caller can never write into the wrong place. */
export function splitAtMarkers(html) {
  const start = html.indexOf(HOME_COPY_START);
  const end = html.indexOf(HOME_COPY_END);
  if (start < 0 || end < 0 || end < start) return null;
  if (html.indexOf(HOME_COPY_START, start + 1) >= 0 || html.indexOf(HOME_COPY_END, end + 1) >= 0) return null;
  const innerFrom = start + HOME_COPY_START.length;
  return { before: html.slice(0, innerFrom), inner: html.slice(innerFrom, end), after: html.slice(end) };
}

/** The template with the block between the markers replaced by the module's,
    in the file's own line endings. */
export function withHomeCopy(html, copy) {
  const parts = splitAtMarkers(html);
  if (!parts) throw new Error('index.html does not carry exactly one pair of home-copy markers in order');
  const eol = html.includes('\r\n') ? '\r\n' : '\n';
  const indent = '      ';
  return parts.before + eol + homeCopyLines(copy, indent).join(eol) + eol + indent + parts.after;
}

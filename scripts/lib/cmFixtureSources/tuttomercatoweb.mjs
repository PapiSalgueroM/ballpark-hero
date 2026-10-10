/**
 * Round 1213 parser: TuttoMercatoWeb's article that prints a whole Serie A calendar on release day.
 *
 * The article is one paragraph a matchday:
 *   <p><strong>Giornata 7 (dd/mm/yyyy)</strong><br> Home-Away<br> Home-Away ... </p>
 * The matchday number is the one in the heading. A match is one line, the home
 * club before the hyphen. The date in the heading is never read into a row.
 *
 * A line with no hyphen or with more than one is refused outright rather than
 * split by a guess: a club whose name holds a hyphen would make the split
 * ambiguous, and this parser does not decide that for anybody.
 *
 * It throws, and the tool then writes nothing, on such a line, on an empty
 * club, or when the article holds no matchday paragraph.
 */
import { decodePage, lineCounter, textOf, titleOf } from './html.mjs';

export const roundBasis = 'labelled';

const MATCHDAY = /<p>\s*<strong>\s*Giornata\s+(\d+)[^<]*<\/strong>([\s\S]*?)<\/p>/g;

export function parse(pages) {
  if (pages.length !== 1) throw new Error(`tuttomercatoweb reads one page, got ${pages.length}`);
  const { text } = decodePage(pages[0]);
  const lineOf = lineCounter(text);
  const days = [...text.matchAll(MATCHDAY)];
  if (!days.length) throw new Error('tuttomercatoweb: no matchday paragraph in the article');
  const rows = [];
  for (const d of days) {
    const round = Number(d[1]);
    const bodyAt = d.index + d[0].indexOf('</strong>') + '</strong>'.length;
    const pieces = [];
    let start = 0;
    for (const br of d[2].matchAll(/<br\s*\/?>/gi)) {
      pieces.push([start, d[2].slice(start, br.index)]);
      start = br.index + br[0].length;
    }
    pieces.push([start, d[2].slice(start)]);
    for (const [offset, piece] of pieces) {
      const at = bodyAt + offset;
      const line = textOf(piece);
      if (!line) continue;
      const parts = line.split('-');
      if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) {
        throw new Error(`tuttomercatoweb: matchday ${round} holds a line that is not exactly Home-Away: "${line.slice(0, 60)}"`);
      }
      rows.push({ sourceLine: lineOf(at), ref: `offset ${at}`, round, home: parts[0].trim(), away: parts[1].trim() });
    }
  }
  return { rows, title: titleOf(text) };
}

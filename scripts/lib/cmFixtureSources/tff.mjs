/**
 * Round 1213 parser: the Turkish Football Federation's Super Lig fixture page (tff.org, pageID=198).
 *
 * The page prints the whole season, a small table a week. A week opens with
 *   <td class="belirginYazi" ...>7.Hafta</td>
 * and under it every match is a row of three cells of class altCizgi:
 *   home club | score or " - " | away club
 * The week number is the heading's. The middle cell is never read into a row.
 * The page also carries a tab strip that names the current week once more;
 * that strip has no such heading cell and is not read.
 *
 * The page is not UTF-8: it is decoded by the charset its response declares.
 *
 * It throws, and the tool then writes nothing, when a week number comes twice,
 * when a week's table cannot be found, when a row is not three cells, or when
 * a club cell is empty.
 */
import { decodePage, lineCounter, textOf, titleOf } from './html.mjs';

export const roundBasis = 'labelled';
/* A fixture page kept up to date: it shows the list as it stands on the day it is read. */
export const listAsOf = 'read day';

const WEEK = /<td class="belirginYazi"[^>]*>\s*(\d+)\s*\.\s*Hafta\s*<\/td>/g;
const ROW = /<tr>\s*((?:<td[^>]*class="altCizgi"[^>]*>[\s\S]*?<\/td>\s*)+)<\/tr>/g;

export function parse(pages) {
  if (pages.length !== 1) throw new Error(`tff reads one page, got ${pages.length}`);
  const { text } = decodePage(pages[0]);
  const lineOf = lineCounter(text);
  const weeks = [...text.matchAll(WEEK)];
  if (!weeks.length) throw new Error('tff: no week heading on the page');
  const seen = new Set();
  const rows = [];
  for (const w of weeks) {
    const round = Number(w[1]);
    if (seen.has(round)) throw new Error(`tff: week ${round} is printed twice`);
    seen.add(round);
    const tableAt = text.indexOf('<table', w.index);
    const tableEnd = tableAt < 0 ? -1 : text.indexOf('</table>', tableAt);
    if (tableAt < 0 || tableEnd < 0) throw new Error(`tff: week ${round} has no table under its heading`);
    const block = text.slice(tableAt, tableEnd);
    for (const r of block.matchAll(ROW)) {
      const cells = [...r[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(c => textOf(c[1]));
      if (cells.length !== 3 || !cells[0] || !cells[2]) {
        throw new Error(`tff: a row of week ${round} is not home, score, away (line ${lineOf(tableAt + r.index)})`);
      }
      rows.push({ sourceLine: lineOf(tableAt + r.index), ref: `offset ${tableAt + r.index}`, round, home: cells[0], away: cells[2] });
    }
  }
  return { rows, title: titleOf(text) };
}

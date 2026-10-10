/**
 * Round 1213 parser: a Maxifoot season calendar page (maxifoot.fr/calendrier-<league>-2026-2027.htm).
 *
 * The page is one table a matchday. A matchday opens with a heading row
 *   <tr id='tj7' class=ch3><td colspan=3 nowrap>... 7e journee, <day> <date></td></tr>
 * and every match under it is a row of two club cells and one result cell
 *   <tr class=cl1><td>HOME</td><td>AWAY</td><th>2-1 or -</th></tr>
 * The matchday number is read twice, from the row's id and from the heading's
 * own words, and the two must agree. The home club is the first cell.
 * The date in the heading and the result cell are never read into a row.
 *
 * It throws, and the tool then writes nothing, when a heading's two numbers
 * differ, when a match row is not exactly two club cells and a result cell,
 * when a club cell is empty, or when the page holds no matchday at all.
 */
import { decodePage, lineCounter, textOf, titleOf } from './html.mjs';

export const roundBasis = 'labelled';
/* A calendar page kept up to date: it shows the list as it stands on the day it is read. */
export const listAsOf = 'read day';

const HEADING = /<tr id='tj(\d+)' class=ch3>([\s\S]*?)<\/tr>/g;
const MATCH_ROW = /<tr class=cl[12]>([\s\S]*?)<\/tr>/g;

export function parse(pages) {
  if (pages.length !== 1) throw new Error(`maxifoot reads one page, got ${pages.length}`);
  const { text } = decodePage(pages[0]);
  const lineOf = lineCounter(text);
  const headings = [...text.matchAll(HEADING)];
  if (!headings.length) throw new Error('maxifoot: no matchday heading on the page');
  const rows = [];
  headings.forEach((h, i) => {
    const byId = Number(h[1]);
    const words = /(\d+)\s*(?:e|er|re|ère|ème)\s+journ/i.exec(textOf(h[2]));
    if (!words || Number(words[1]) !== byId) {
      throw new Error(`maxifoot: heading ${i + 1} says matchday ${words ? words[1] : 'nothing'} but its row id says ${byId}`);
    }
    const from = h.index + h[0].length;
    const to = i + 1 < headings.length ? headings[i + 1].index : text.length;
    /* A matchday's table ends at its own </table>; nothing after that belongs to it. */
    const tableEnd = text.indexOf('</table>', from);
    const block = text.slice(from, tableEnd >= 0 && tableEnd < to ? tableEnd : to);
    for (const r of block.matchAll(MATCH_ROW)) {
      const clubCells = [...r[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(c => textOf(c[1]));
      const resultCells = [...r[1].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)];
      if (clubCells.length !== 2 || resultCells.length !== 1 || !clubCells[0] || !clubCells[1]) {
        throw new Error(`maxifoot: a match row of matchday ${byId} is not two clubs and a result (line ${lineOf(from + r.index)})`);
      }
      rows.push({
        sourceLine: lineOf(from + r.index),
        ref: `offset ${from + r.index}`,
        round: byId,
        home: clubCells[0],
        away: clubCells[1],
      });
    }
  });
  return { rows, title: titleOf(text) };
}

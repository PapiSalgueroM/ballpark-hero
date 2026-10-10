/**
 * Round 1213 parser: the DFL's own fixture list PDF (Bundesliga and 2. Bundesliga, "Spielplan Saison 2026/2027").
 *
 * The PDF is a table with a text layer. Each page repeats the heading row
 *   Datum | Anstoss | Spieltag | (match number, no heading) | Heim | Gast
 * and a league match is a row with a whole number under Spieltag, a whole
 * number in the match number column, a club under Heim and a club under Gast.
 * The same table also lists cup and European dates and the Supercup, with
 * letters in those two columns (DFB, UECL, PO H, BL, FB SC): those rows are
 * not league matches and are passed over, and the check below proves nothing
 * else was.
 *
 * THE SELF CHECK: the match numbers of the rows kept must be 1, 2, 3 ... N
 * with none missing and none twice. A league row lost to a column that moved
 * leaves a hole in that run, and the parser throws instead of returning.
 *
 * The date and the kick off time on a row are never read into it.
 *
 * It throws, and the tool then writes nothing, when a page shows text it
 * cannot read, when a page that holds league rows has no heading row to take
 * the columns from, when a numbered row lacks a club, or on a hole or a
 * repeat in the match numbers.
 */
import { contentStreams, linesOf, textRuns } from './pdfText.mjs';

export const roundBasis = 'labelled';

const joined = cells => cells.map(c => c.text).join('').replace(/\s+/g, ' ').trim();

export function parse(pages) {
  if (pages.length !== 1) throw new Error(`dflPdf reads one file, got ${pages.length}`);
  const streams = contentStreams(pages[0].body);
  if (!streams.length) throw new Error('dflPdf: the file has no page with a text layer');
  const rows = [];
  let title = null;
  streams.forEach((stream, pageIndex) => {
    const { runs, unread } = textRuns(stream.text);
    const lines = linesOf(runs);
    const head = lines.find(l => l.cells.some(c => c.text.trim() === 'Heim') && l.cells.some(c => c.text.trim() === 'Gast'));
    if (!title) {
      const t = lines.map(l => joined(l.cells)).find(s => /^SPIELPLAN\b/.test(s));
      const season = lines.map(l => joined(l.cells)).find(s => /^SAISON\b/.test(s));
      if (t) title = `${t}${season ? ` ${season}` : ''}`;
    }
    if (!head) return;
    if (unread) throw new Error(`dflPdf: page ${pageIndex + 1} shows ${unread} run(s) of text this parser cannot read`);
    const xOf = word => head.cells.find(c => c.text.trim() === word)?.x;
    const [spieltagX, heimX, gastX] = [xOf('Spieltag'), xOf('Heim'), xOf('Gast')];
    if (![spieltagX, heimX, gastX].every(Number.isFinite) || !(spieltagX < heimX && heimX < gastX)) {
      throw new Error(`dflPdf: page ${pageIndex + 1} has no usable heading row`);
    }
    const split = (spieltagX + heimX) / 2;
    for (const line of lines) {
      if (line === head || line.y >= head.y) continue;
      const zone = (from, to) => joined(line.cells.filter(c => c.x >= from && c.x < to));
      const spieltag = zone(spieltagX - 20, split);
      const number = zone(split, heimX - 3);
      if (!/^\d{1,2}$/.test(spieltag) || !/^\d{1,3}$/.test(number)) continue;
      const home = zone(heimX - 3, gastX - 3);
      const away = zone(gastX - 3, Infinity);
      if (!home || !away) throw new Error(`dflPdf: match ${number} of matchday ${spieltag} lacks a club (page ${pageIndex + 1})`);
      rows.push({ sourceLine: pageIndex + 1, ref: `page ${pageIndex + 1}, match ${number}`, round: Number(spieltag), home, away, number: Number(number) });
    }
  });
  rows.sort((a, b) => a.number - b.number);
  rows.forEach((r, i) => {
    if (r.number !== i + 1) throw new Error(`dflPdf: the match numbers are not 1 to ${rows.length} without a hole or a repeat (position ${i + 1} holds match ${r.number})`);
  });
  if (!rows.length) throw new Error('dflPdf: no league match row found');
  return { rows: rows.map(({ number, ...r }) => r), title };
}

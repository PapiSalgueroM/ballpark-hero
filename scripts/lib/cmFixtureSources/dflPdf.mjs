/**
 * Round 1213 parser: the DFL's own fixture list PDF (Bundesliga and 2. Bundesliga, "Spielplan Saison 2026/2027").
 *
 * The PDF is a table with a text layer, its columns in this order:
 *   Datum | Anstoss | Spieltag | match number | Heim | Gast
 * A league match is a row in which a whole number (the Spieltag) is followed
 * at once by another whole number (the match number) and then by the two
 * clubs. The same table also lists cup and European dates and the Supercup,
 * with letters where those two numbers would be (DFB, UECL, PO H, BL, FB SC):
 * those rows are not league matches and are passed over.
 *
 * WHERE THE CLUB COLUMNS START is taken from the rows themselves, page by
 * page: the two places a run of text starts in EVERY league row of the page
 * after its match number are the start of Heim and the start of Gast. The
 * heading row is not used for that, because its labels are not set where the
 * cells start (the first page of the 2. Bundesliga's list has "Heim" 51 points
 * to the right of the home clubs, which is how the first draft of this parser
 * lost matchdays 1 and 2 and was caught by the check below).
 *
 * THE SELF CHECK: the match numbers of the rows kept must be 1, 2, 3 ... N
 * with none missing and none twice. A league row lost for any reason leaves a
 * hole in that run, and the parser throws instead of returning.
 *
 * The date and the kick off time on a row are never read into it.
 *
 * It throws, and the tool then writes nothing, when a page with league rows
 * shows text it cannot read, when a page has no two places where every league
 * row starts a run, when a row lacks a club, or on a hole or a repeat in the
 * match numbers.
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
    if (!title) {
      const words = lines.map(l => joined(l.cells));
      const t = words.find(s => /^SPIELPLAN\b/.test(s));
      const season = words.find(s => /^SAISON\b/.test(s));
      if (t) title = `${t}${season ? ` ${season}` : ''}`;
    }
    const candidates = [];
    for (const line of lines) {
      const cells = line.cells.filter(c => c.text.trim() !== '');
      const at = cells.findIndex((c, k) => k + 1 < cells.length && /^\d{1,2}$/.test(c.text.trim()) && /^\d{1,3}$/.test(cells[k + 1].text.trim()));
      if (at < 0) continue;
      candidates.push({ spieltag: Number(cells[at].text.trim()), number: Number(cells[at + 1].text.trim()), rest: cells.slice(at + 2) });
    }
    if (!candidates.length) return;
    const where = `page ${pageIndex + 1}`;
    if (unread) throw new Error(`dflPdf: ${where} shows ${unread} run(s) of text this parser cannot read`);
    const starts = new Map();
    for (const c of candidates) for (const x of new Set(c.rest.map(r => Math.round(r.x)))) starts.set(x, (starts.get(x) || 0) + 1);
    const inEvery = [...starts].filter(([, count]) => count === candidates.length).map(([x]) => x).sort((a, b) => a - b);
    if (inEvery.length !== 2) {
      throw new Error(`dflPdf: ${where} has ${inEvery.length} place(s) where every league row starts a run after its match number, wanted the two club columns`);
    }
    const gastX = inEvery[1];
    for (const c of candidates) {
      const home = joined(c.rest.filter(r => Math.round(r.x) < gastX));
      const away = joined(c.rest.filter(r => Math.round(r.x) >= gastX));
      if (!home || !away) throw new Error(`dflPdf: match ${c.number} of matchday ${c.spieltag} lacks a club (${where})`);
      rows.push({ sourceLine: pageIndex + 1, ref: `${where}, match ${c.number}`, round: c.spieltag, home, away, number: c.number });
    }
  });
  if (!rows.length) throw new Error('dflPdf: no league match row found');
  rows.sort((a, b) => a.number - b.number);
  rows.forEach((r, i) => {
    if (r.number !== i + 1) throw new Error(`dflPdf: the match numbers are not 1 to ${rows.length} without a hole or a repeat (position ${i + 1} holds match ${r.number})`);
  });
  return { rows: rows.map(({ number, ...r }) => r), title };
}

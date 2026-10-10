/**
 * Round 1213 parser: hessenschau.de's results pages (the public broadcaster Hessischer Rundfunk), one page a matchday.
 *
 * A page says which competition, season and matchday it shows in the three
 * drop down buttons above its table ("Fussball 2. Bundesliga 2026/2027",
 * "7. Spieltag"), and every match is a table row whose two clubs are given in
 * full in the title of two marked elements:
 *   <abbr class="... -teamName -home" title="HOME">  ...  <abbr class="... -teamName -visitor" title="AWAY">
 * (the visible text is a short form such as "K'lautern"; the title is read).
 *
 * THE ADDRESSES ARE ROLLING ONES (the matchday is in them, the season is
 * not), so every page must itself state the competition and season the
 * league's entry asks for (source.competition), and its own matchday must be
 * the one in its address. A page that has rolled over to another season, or
 * that answers a matchday other than the one asked for, throws.
 *
 * The date, the time and the result on a row are never read into it.
 */
import { decodePage, lineCounter, textOf, titleOf } from './html.mjs';

export const roundBasis = 'labelled';

const BUTTON = /c-content-nav__button-text">([^<]*)</g;
const TABLE_ROW = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
const HOME = /-teamName -home"\s+title="([^"]*)"/;
const VISITOR = /-teamName -visitor"\s+title="([^"]*)"/;

export function parse(pages, source) {
  if (!source?.competition) throw new Error('hessenschau: the league entry must say which competition and season the pages have to state');
  const rows = [];
  let title = null;
  pages.forEach((page, i) => {
    const { text } = decodePage(page);
    const where = `page ${i + 1}`;
    const lineOf = lineCounter(text);
    title ??= titleOf(text);
    const buttons = [...text.matchAll(BUTTON)].map(b => textOf(b[1]));
    if (!buttons.includes(source.competition)) {
      throw new Error(`hessenschau: ${where} does not state "${source.competition}" (it states: ${buttons.join(' | ') || 'nothing'})`);
    }
    const days = buttons.map(b => /^(\d+)\. Spieltag$/.exec(b)).filter(Boolean);
    const asked = /_matchday-(\d+)\.html$/.exec(page.meta.url);
    if (days.length !== 1 || !asked || days[0][1] !== asked[1]) {
      throw new Error(`hessenschau: ${where} states matchday ${days.map(d => d[1]).join(',') || 'none'} and its address asks for ${asked ? asked[1] : 'none'}`);
    }
    const round = Number(days[0][1]);
    for (const tr of text.matchAll(TABLE_ROW)) {
      const home = HOME.exec(tr[1]);
      const visitor = VISITOR.exec(tr[1]);
      if (!home && !visitor) continue;
      if (!home || !visitor || !textOf(home[1]) || !textOf(visitor[1])) {
        throw new Error(`hessenschau: a row of ${where} names only one club (line ${lineOf(tr.index)})`);
      }
      rows.push({ sourceLine: lineOf(tr.index), ref: `${where}, offset ${tr.index}`, round, home: textOf(home[1]), away: textOf(visitor[1]) });
    }
  });
  if (!rows.length) throw new Error('hessenschau: no match row on any page');
  return { rows, title };
}

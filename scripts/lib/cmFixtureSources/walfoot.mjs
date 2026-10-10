/**
 * Round 1213 parser: Walfoot's Belgian Pro League calendar page (walfoot.be/belgique/jupiler-pro-league/calendrier).
 *
 * The page prints the whole season as table rows. A match is a row with
 *   <td class="text-right ..."> <a href="/belgique/HOME-SLUG">Home</a> </td>
 *   <td class="text-center" ...> <a href=".../2026-2027/calendrier/journee-7/HOME-SLUG/AWAY-SLUG[/a report]">score or time</a> </td>
 *   <td class="text-left ..."> <a href="/belgique/AWAY-SLUG">Away</a> </td>
 * The matchday is the number in the match link. The parser reads the home and
 * away names from the two club cells and checks each cell's own club link
 * against the two slugs in the match link, so a row whose cells and link
 * disagree about who is at home is refused rather than read either way.
 *
 * THE ADDRESS IS A ROLLING ONE (no season in it), so the season in every match
 * link is checked too: a page that has rolled over to another season throws.
 *
 * The date, the time and the score on a row are never read into it.
 */
import { decodePage, lineCounter, textOf, titleOf } from './html.mjs';

export const roundBasis = 'labelled';
/* A calendar page kept up to date: it shows the list as it stands on the day it is read. */
export const listAsOf = 'read day';

const SEASON = '2026-2027';
const TABLE_ROW = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
/* One matchday's links are written journee-13- with a stray hyphen after the number; the number is still the matchday.
   A row whose link is not a journee at all (the Supercup's is "supercoupe") is not a league match and is passed over. */
const MATCH_LINK = /href="[^"]*\/(\d{4}-\d{4})\/calendrier\/journee-(\d+)-?\/([a-z0-9-]+)\/([a-z0-9-]+)(?:\/[^"]*)?"/;
const cell = side => new RegExp(`<td class="text-${side}[^"]*">([\\s\\S]*?)<\\/td>`);
const CLUB_LINK = /<a href="\/belgique\/([a-z0-9-]+)"/;
/* The site writes two clubs' slugs two ways: La Louviere's club page is la-louviere and its match links drop the
   accented letter; Beveren's club page is sk-beveren and its match links keep the name the club carried until
   2022. Every row of both was counted on the page read 2026-10-10 (33 and 33) before these two lines were
   written. Stated exactly, so the check below stays strict for every other club. */
const SAME_CLUB = { 'la-louvire': 'la-louviere', 'waasland-beveren': 'sk-beveren' };
const slugOf = s => SAME_CLUB[s] ?? s;

export function parse(pages) {
  if (pages.length !== 1) throw new Error(`walfoot reads one page, got ${pages.length}`);
  const { text } = decodePage(pages[0]);
  const lineOf = lineCounter(text);
  const rows = [];
  for (const tr of text.matchAll(TABLE_ROW)) {
    const link = MATCH_LINK.exec(tr[1]);
    if (!link) continue;
    const where = `line ${lineOf(tr.index)}`;
    if (link[1] !== SEASON) throw new Error(`walfoot: the page shows season ${link[1]}, not ${SEASON} (${where})`);
    const right = cell('right').exec(tr[1]);
    const left = cell('left').exec(tr[1]);
    if (!right || !left) throw new Error(`walfoot: a match row lacks a club cell (${where})`);
    const [homeSlug, awaySlug] = [CLUB_LINK.exec(right[1])?.[1], CLUB_LINK.exec(left[1])?.[1]];
    if (homeSlug !== slugOf(link[3]) || awaySlug !== slugOf(link[4])) {
      throw new Error(`walfoot: the cells say ${homeSlug} v ${awaySlug} and the match link says ${link[3]} v ${link[4]} (${where})`);
    }
    const [home, away] = [textOf(right[1]), textOf(left[1])];
    if (!home || !away) throw new Error(`walfoot: a match row has an empty club name (${where})`);
    rows.push({ sourceLine: lineOf(tr.index), ref: `offset ${tr.index}`, round: Number(link[2]), home, away });
  }
  if (!rows.length) throw new Error('walfoot: no match row on the page');
  return { rows, title: titleOf(text) };
}

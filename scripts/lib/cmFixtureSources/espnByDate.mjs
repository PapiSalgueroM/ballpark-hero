/**
 * Round 1213 parser: an ESPN article that prints a whole league fixture list on release day, grouped by date.
 *
 * The article is a date in bold and then one paragraph of matches under it:
 *   <p><strong>Aug. 22, 2026</strong></p><p>Home vs. Away 10 a.m. ET / 3 p.m. UK<br /> Home vs. Away ...</p>
 * It prints NO matchday number. The matchday of a match is therefore COUNTED,
 * never guessed: reading the article top to bottom, a match is the nth league
 * game of its home club and the nth league game of its away club, and that n
 * is its matchday. The two counts must be the same number for every single
 * match, or the parser throws: a list in which they ever differ is not in
 * matchday order and cannot be read this way.
 *
 * THAT ONLY HOLDS FOR A LIST IN ITS RELEASE DAY ORDER. A page that shows games
 * at rearranged dates would count wrongly without any count disagreeing, which
 * is why this is never the only source of a league: the tool compares every
 * counted matchday with a second source that prints its matchday numbers.
 *
 * The dates and the kick off times are used for nothing and stored nowhere;
 * the order of the lines is all that is read.
 *
 * It throws, and the tool then writes nothing, on a match line that is not
 * "Home vs. Away <kick off time>", on a club meeting itself, or on a match
 * whose two counts differ.
 */
import { decodePage, lineCounter, textOf, titleOf } from './html.mjs';

export const roundBasis = 'ordinal';
/* An article printed the day the list came out: it is the list as first published. */
export const listAsOf = 'release day';

/* Between a date and its paragraph of matches the page may drop an advert block, so the gap is allowed to hold
   anything except another paragraph, another bold run or a match. */
const DAY = /<p>\s*<strong>\s*([A-Z][a-z]{2,8}\.?\s+\d{1,2},\s+\d{4})\s*<\/strong>\s*<\/p>((?:(?!<p>|<strong>| vs\. )[\s\S])*?)<p>([\s\S]*?)<\/p>/g;
const MATCH = /^(.+?) vs\. (.+?)\s+\d{1,2}(?:[.:]\d{2})?\s*(?:a\.m\.|p\.m\.|noon)\s*ET\b.*$/;

export function parse(pages) {
  if (pages.length !== 1) throw new Error(`espnByDate reads one page, got ${pages.length}`);
  const { text } = decodePage(pages[0]);
  const lineOf = lineCounter(text);
  const days = [...text.matchAll(DAY)];
  if (!days.length) throw new Error('espnByDate: no dated paragraph of matches in the article');
  const played = new Map();
  const rows = [];
  for (const d of days) {
    const body = d[3];
    const bodyAt = d.index + d[0].length - '</p>'.length - body.length;
    let start = 0;
    const pieces = [];
    for (const br of body.matchAll(/<br\s*\/?>/gi)) {
      pieces.push([start, body.slice(start, br.index)]);
      start = br.index + br[0].length;
    }
    pieces.push([start, body.slice(start)]);
    for (const [offset, piece] of pieces) {
      const line = textOf(piece);
      if (!line) continue;
      const at = bodyAt + offset;
      const m = MATCH.exec(line);
      if (!m) throw new Error(`espnByDate: a line under ${d[1]} is not "Home vs. Away <time>": "${line.slice(0, 70)}"`);
      const [home, away] = [m[1].trim(), m[2].trim()];
      if (!home || !away || home === away) throw new Error(`espnByDate: a line under ${d[1]} does not name two clubs: "${line.slice(0, 70)}"`);
      const nthHome = (played.get(home) || 0) + 1;
      const nthAway = (played.get(away) || 0) + 1;
      if (nthHome !== nthAway) {
        throw new Error(`espnByDate: ${home} v ${away} under ${d[1]} is game ${nthHome} for one club and game ${nthAway} for the other, so the list is not in matchday order`);
      }
      played.set(home, nthHome);
      played.set(away, nthAway);
      rows.push({ sourceLine: lineOf(at), ref: `offset ${at}`, round: nthHome, home, away });
    }
  }
  /* Every match line in the article reads "Home vs. Away". If the article prints " vs. " more often than rows
     were kept, a paragraph of matches was not reached, and counting matchdays past a missed paragraph is wrong
     without any count disagreeing (the first draft missed one that sat behind an advert block, exactly so). */
  const printed = (text.match(/ vs\. /g) || []).length;
  if (printed !== rows.length) throw new Error(`espnByDate: the article prints " vs. " ${printed} times and ${rows.length} match lines were read`);
  const stamp = /"content_publish_timestamp":"(\d{4}-\d{2}-\d{2})T/.exec(text);
  return { rows, title: titleOf(text), published: stamp ? stamp[1] : null };
}

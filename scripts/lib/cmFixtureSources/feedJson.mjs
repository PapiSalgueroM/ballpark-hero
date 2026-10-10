/**
 * Round 1213 parser: a Fixture Download JSON feed (fixturedownload.com/feed/json/<slug>).
 *
 * The body is one JSON array, a match an element, with RoundNumber, HomeTeam
 * and AwayTeam among its fields. This parser keeps those three and the match
 * number as a reference. The date, the ground and the scores in the same
 * element are read by nobody and leave here in no form.
 *
 * It throws, and the tool then writes nothing, when the body is not that
 * array or any element lacks a whole matchday number or either club.
 */
import { lineCounter } from './html.mjs';

export const roundBasis = 'labelled';
/* A feed kept up to date: it shows the list as it stands on the day it is read. */
export const listAsOf = 'read day';

export function parse(pages) {
  if (pages.length !== 1) throw new Error(`feedJson reads one file, got ${pages.length}`);
  const text = pages[0].body.toString('utf8');
  let list;
  try {
    list = JSON.parse(text);
  } catch (e) {
    throw new Error(`feedJson: the body is not JSON (${String(e.message).slice(0, 80)})`);
  }
  if (!Array.isArray(list) || !list.length) throw new Error('feedJson: the body is not a list of matches');
  /* The line a match sits on, for the receipt. A feed sent as one line puts every match on line 1,
     which is why the match number is kept beside it. */
  const lineOf = lineCounter(text);
  let cursor = 0;
  const rows = list.map((m, i) => {
    if (!m || typeof m !== 'object') throw new Error(`feedJson: element ${i} is not a match`);
    const { MatchNumber, RoundNumber, HomeTeam, AwayTeam } = m;
    if (!Number.isInteger(RoundNumber) || RoundNumber < 1) throw new Error(`feedJson: element ${i} has no whole matchday number`);
    if (typeof HomeTeam !== 'string' || !HomeTeam.trim() || typeof AwayTeam !== 'string' || !AwayTeam.trim()) {
      throw new Error(`feedJson: element ${i} lacks a club`);
    }
    const at = text.indexOf('"MatchNumber"', cursor);
    if (at >= 0) cursor = at + 1;
    return {
      sourceLine: at >= 0 ? lineOf(at) : 1,
      ref: `match ${Number.isInteger(MatchNumber) ? MatchNumber : i + 1}`,
      round: RoundNumber,
      home: HomeTeam.trim(),
      away: AwayTeam.trim(),
    };
  });
  return { rows, title: null };
}

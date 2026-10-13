/* Round 1308: THE FRONT OFFICE BRACKETS ARE THE LEDGER'S (owed by Round
   1300's closing report, its last section, item 6).

   A front office plays its postseason from bracket data of its own
   (src/data/gmBrackets/), read on two publishers when it was written; the
   careers read the sourced postseason ledger (src/data/usPostseasonFormat.ts).
   Two files saying the same thing drift apart unless something holds them
   together, so for every season a front office can play: a bracket exactly
   when the ledger has a format, as many clubs, the byes, as many weeks as the
   ledger has rounds and each week's wins its series, and the title tie the
   only one whose sides come from both halves of the seed list when the
   ledger says the last round is the only cross one. And the bracket card's
   week names come from the ledger, so it must hold a name for every week.

   One row a sport, as each front office is bound: the NFL today.
   scripts/simUsPostseason.mjs section G holds the same, with a control. */
import { describe, expect, it } from 'vitest';
import { usPostseasonFormat, usPostseasonRounds } from '@/data/usPostseasonFormat';
import { NFL_BRACKET, nflBracketFor } from '@/data/gmBrackets/nfl';
import { bracketByes, type BracketFormat } from '@/lib/gmBracket';
import { finalTie, finalsWeeks, type Slot } from '@/lib/finalsBracket';

const BINDS: { sport: 'nfl'; formatFor(season: number): BracketFormat | null; from: number; to: number }[] = [
  { sport: 'nfl', formatFor: nflBracketFor, from: 2026, to: 2060 },
];

/** Which halves of the seed list (0: the first half, 1: the second) can reach a slot, traced back through the ties. */
function halvesOf(format: BracketFormat, slot: Slot): Set<number> {
  if ('seed' in slot) return new Set([slot.seed <= format.qualifiers / 2 ? 0 : 1]);
  const ids = 'rankedWinnerOf' in slot ? slot.rankedWinnerOf : ['winnerOf' in slot ? slot.winnerOf : slot.loserOf];
  const out = new Set<number>();
  for (const id of ids) {
    const tie = format.ties.find(t => t.id === id);
    if (!tie) throw new Error(`no tie ${id}`);
    for (const h of [...halvesOf(format, tie.home), ...halvesOf(format, tie.away)]) out.add(h);
  }
  return out;
}

describe('the front office brackets are the ledger\'s', () => {
  for (const bind of BINDS) {
    it(`${bind.sport}: a bracket exactly when the ledger has a format, for every season from ${bind.from} to ${bind.to}`, () => {
      let seen = 0;
      for (let season = bind.from; season <= bind.to; season += 1) {
        const format = bind.formatFor(season);
        const row = usPostseasonFormat(bind.sport, season);
        expect(format === null, `${season}`).toBe(row === null);
        if (!format || !row) continue;
        seen += 1;
        expect(format.qualifiers, `${season}: clubs`).toBe(row.clubs);
        expect(bracketByes(format).length, `${season}: byes (the ledger counts them a conference)`).toBe(2 * row.byes);
        const weeks = finalsWeeks(format.ties);
        expect(weeks.length, `${season}: weeks`).toBe(row.rounds.length);
        weeks.forEach((w, k) => expect(Math.max(1, format.winsNeeded[w] ?? 1), `${season}: week ${w}'s wins`).toBe(row.rounds[k].series[0]));
        if (row.lastRoundOnlyCross) {
          const cross = format.ties.filter(t => new Set([...halvesOf(format, t.home), ...halvesOf(format, t.away)]).size === 2).map(t => t.id);
          expect(cross, `${season}: the only tie across the two halves`).toEqual([finalTie(format.ties)!.id]);
        }
      }
      expect(seen).toBeGreaterThan(0);
    });
  }

  it('the NFL bracket has as many weeks as the ledger has round names, so the card has a name for every week', () => {
    const names = usPostseasonRounds('nfl').map(r => r.name);
    expect(finalsWeeks(NFL_BRACKET.ties).length).toBe(names.length);
    expect(names).toEqual(['Wild Card', 'Divisional', 'Conference Championship', 'Super Bowl']);
  });

  it('the halves are traced from the data, not assumed: every NFL tie but the Super Bowl stays inside one conference', () => {
    for (const t of NFL_BRACKET.ties) {
      const h = new Set([...halvesOf(NFL_BRACKET, t.home), ...halvesOf(NFL_BRACKET, t.away)]);
      expect([...h].sort(), t.id).toEqual(t.id === 'SB' ? [0, 1] : [t.id.startsWith('AFC') ? 0 : 1]);
    }
  });
});

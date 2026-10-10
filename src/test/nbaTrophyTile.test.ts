/**
 * Round 1103: the hub's Trophy Case tile counts All-Star selections.
 *
 * The engine picks All-Stars since this round, and the case behind the tile
 * lists every award on the season lines. The tile reads the sport's honours
 * row instead, which held MVPs and All-NBA only, so a player whose one honour
 * was an All-Star selection read "Empty" on the tile and "All-Star" behind it
 * (about one career in ten at the round's gate). This holds the two together,
 * and holds a save from before the round to the tile it always had.
 *
 * Round 1112: one more row, for every award the three named rows do not count
 * (All-Defensive, All-Rookie, Most Improved, Sixth Man, Defensive Player, the
 * stat titles). A career whose only awards were those still read "Empty". The
 * old engine handed most of those out too, so a save from before now counts
 * them as well: its tile is the rings plus every award the case lists.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { careerHubTiles, trophyLines, type CareerHubFacts } from '@/lib/careerHub';
import type { NbaCareerState } from '@/lib/nbaMyCareer';

const fixture = JSON.parse(readFileSync(path.resolve(__dirname, 'fixtures/nbaOldSaves1103.json'), 'utf8')) as { entries: { key: string; save: NbaCareerState }[] };

const factsOf = (c: NbaCareerState, honours: CareerHubFacts['honours']): CareerHubFacts => ({
  ovr: c.ovr, age: c.age, pos: c.pos, morale: c.morale, health: c.health, fanbase: c.fanbase,
  netWorth: 10, salary: 5, yearlyCosts: 0, contractYears: 3, teamLabel: 'Club', seasonsPlayed: c.seasons.length,
  lastLine: null, rings: c.rings, ringWord: NBA_CAREER_SPORT.ringWord, honours, headlines: [],
});
/* How many of the frozen saves hold awards and none in a named row or a ring (measured: 1 of the 29). */
const LESSER_ONLY_FLOOR = 1;
const trophyTile = (c: NbaCareerState, honours = NBA_CAREER_SPORT.honours(c)) => careerHubTiles(factsOf(c, honours)).find(t => t.key === 'trophies')!;

/** One of the frozen saves with every counter emptied, then the seasons a test hands it. */
function careerWith(awardsBySeason: string[][], counters: Partial<NbaCareerState>): NbaCareerState {
  const base = JSON.parse(JSON.stringify(fixture.entries.find(e => e.save.seasons.length > 0)!.save)) as NbaCareerState;
  const line = base.seasons[0];
  return {
    ...base, rings: 0, mvps: 0, finalsMvps: 0, allNbas: 0, allStars: undefined, ...counters,
    seasons: awardsBySeason.map((awards, i) => ({ ...line, year: 2026 + i, awards, teamResult: 'Missed the playoffs' })),
  };
}

describe("Round 1103: the hub's Trophy Case tile and the case behind it", () => {
  it('an All-Star selection alone is not an empty case', () => {
    const c = careerWith([[], ['All-Star'], ['All-Star']], { allStars: 2 });
    expect(trophyLines(c.seasons).map(l => l.label)).toEqual(['All-Star']);
    const tile = trophyTile(c);
    expect(tile.value).toBe('2 honours');
    expect(tile.sub).toBe('2 All-Star nods, no ring yet');
  });

  it('the old row is what read Empty for that same player (the check can fail)', () => {
    const c = careerWith([[], ['All-Star'], ['All-Star']], { allStars: 2 });
    const before = trophyTile(c, [{ label: 'MVPs', n: c.mvps }, { label: 'All-NBA nods', n: c.allNbas }]);
    expect(before.value).toBe('Empty');
    expect(before.sub).toBe('Nothing in it. Go and win something');
  });

  it('every All-NBA season is an All-Star season, and the tile names the count that is larger', () => {
    const c = careerWith([['All-Star'], ['All-Star', 'All-NBA'], ['All-Star', 'All-NBA', 'MVP']], { allStars: 3, allNbas: 2, mvps: 1 });
    const tile = trophyTile(c);
    expect(tile.value).toBe('6 honours');
    expect(tile.sub).toBe('3 All-Star nods, no ring yet');
  });

  it('a save from before the round counts no All-Star it never had, and its tile is the rings plus the case', () => {
    expect(fixture.entries.length).toBeGreaterThan(20);
    let withHonours = 0; let lesserOnly = 0;
    for (const { key, save } of fixture.entries) {
      expect(save.allStars, key).toBeUndefined();
      const rows = NBA_CAREER_SPORT.honours(save);
      expect(rows.find(r => r.label === 'All-Star nods')?.n, key).toBe(0);
      expect(rows.find(r => r.label === 'MVPs')?.n, key).toBe(save.mvps);
      expect(rows.find(r => r.label === 'All-NBA nods')?.n, key).toBe(save.allNbas);
      const inCase = trophyLines(save.seasons).reduce((n, l) => n + l.n, 0);
      const total = save.rings + inCase;
      expect(trophyTile(save).value, key).toBe(total === 0 ? 'Empty' : total === 1 ? '1 honour' : `${total} honours`);
      if (total > 0) withHonours += 1;
      /* What Round 1112 is for: something in the case, and none of it in the three named rows or a ring. */
      if (inCase > 0 && save.rings + save.mvps + save.allNbas === 0) lesserOnly += 1;
    }
    /* The comparison means something only when some of the frozen saves hold an honour. */
    expect(withHonours).toBeGreaterThanOrEqual(3);
    expect(lesserOnly).toBeGreaterThanOrEqual(LESSER_ONLY_FLOOR);
  });
});

describe("Round 1112: the lesser awards are not an empty case", () => {
  const LESSER = ['All-Defensive Team', 'All-Rookie Team', 'Most Improved Player', 'Sixth Man of the Year', 'Defensive Player of the Year', 'Scoring Champion', 'Assists Leader', 'Rebounding Champion', 'Rookie of the Year'];

  it('one lesser award alone is one honour on the tile, whichever it is', () => {
    for (const award of LESSER) {
      const c = careerWith([[], [award]], {});
      expect(trophyLines(c.seasons).map(l => l.label), award).toEqual([award]);
      const tile = trophyTile(c);
      expect(tile.value, award).toBe('1 honour');
      expect(tile.sub, award).toBe('1 in other awards, no ring yet');
    }
  });

  it('the row before this round is what read Empty for that same player (the check can fail)', () => {
    const c = careerWith([[], ['All-Rookie Team'], ['All-Defensive Team']], {});
    const before = trophyTile(c, [{ label: 'MVPs', n: c.mvps }, { label: 'All-NBA nods', n: c.allNbas }, { label: 'All-Star nods', n: c.allStars ?? 0 }]);
    expect(before.value).toBe('Empty');
    expect(trophyTile(c).value).toBe('2 honours');
  });

  it('an award with a row of its own is counted once', () => {
    const c = careerWith([['All-Star', 'All-Rookie Team'], ['All-Star', 'All-NBA', 'MVP', 'Scoring Champion', 'All-Defensive Team']], { allStars: 2, allNbas: 1, mvps: 1 });
    const inCase = trophyLines(c.seasons).reduce((n, l) => n + l.n, 0);
    expect(inCase).toBe(7);
    expect(trophyTile(c).value).toBe('7 honours');
    expect(NBA_CAREER_SPORT.honours(c).find(r => r.label === 'in other awards')?.n).toBe(3);
  });
});

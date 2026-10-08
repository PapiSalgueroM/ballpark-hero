/**
 * Round 1103: the hub's Trophy Case tile counts All-Star selections.
 *
 * The engine picks All-Stars since this round, and the case behind the tile
 * lists every award on the season lines. The tile reads the sport's honours
 * row instead, which held MVPs and All-NBA only, so a player whose one honour
 * was an All-Star selection read "Empty" on the tile and "All-Star" behind it
 * (about one career in ten at the round's gate). This holds the two together,
 * and holds a save from before the round to the tile it always had.
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

  it('a save from before the round keeps the tile it had', () => {
    expect(fixture.entries.length).toBeGreaterThan(20);
    let withHonours = 0;
    for (const { key, save } of fixture.entries) {
      expect(save.allStars, key).toBeUndefined();
      const before = trophyTile(save, [{ label: 'MVPs', n: save.mvps }, { label: 'All-NBA nods', n: save.allNbas }]);
      expect(trophyTile(save), key).toEqual(before);
      if (before.value !== 'Empty') withHonours += 1;
    }
    /* The comparison means something only when some of the frozen saves hold an honour. */
    expect(withHonours).toBeGreaterThanOrEqual(3);
  });
});

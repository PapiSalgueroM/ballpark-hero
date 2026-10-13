/* Round 1308: what the four front offices share to play a postseason a round
   at a time (src/lib/gmPostseason.ts), on a sport made up here so nothing in
   it can lean on the NFL: when a save is in its postseason, and what a load
   hands back for every kind of block, without ever throwing. The NFL's bind
   is held in src/lib/frontOfficePostseason.test.ts and over the fleet by
   scripts/simGmGameDay.mjs section 12. */
import { describe, expect, it } from 'vitest';
import { BRACKET_REBUILT_LINES, openBracket, playBracketWeek, type BracketFormat, type GmBracketSave, type PlayTie } from '@/lib/gmBracket';
import { inGmPostseason, loadGmPostseason, type GmPostseasonSport } from '@/lib/gmPostseason';

/* Four clubs, two halves of a best of three and a final: a sport no front office plays. */
const FOUR: BracketFormat = {
  id: 'test-four',
  qualifiers: 4,
  ties: [
    { id: 'A', week: 1, round: 'Half A', home: { seed: 1 }, away: { seed: 4 } },
    { id: 'B', week: 1, round: 'Half B', home: { seed: 2 }, away: { seed: 3 } },
    { id: 'F', week: 2, round: 'Final', home: { winnerOf: 'A' }, away: { winnerOf: 'B' } },
  ],
  winsNeeded: { 1: 2, 2: 2 },
};
interface Toy { season: number; table: string[] }
const toy = (over: Partial<GmPostseasonSport<Toy>> = {}): GmPostseasonSport<Toy> => ({
  formatFor: season => (season >= 2026 ? FOUR : null),
  seeds: lg => lg.table.slice(0, 4),
  /* the league's own rule: the top four of its table, in any order */
  seedsOk: (seeds, lg) => seeds.length === 4 && seeds.every(s => lg.table.slice(0, 4).includes(s)),
  isClub: lg => id => lg.table.includes(id),
  bracketPeriod: 11,
  ...over,
});
const LEAGUE: Toy = { season: 2026, table: ['ANT', 'BEE', 'CAT', 'DOG', 'EEL', 'FOX'] };
const home: PlayTie = (h, _a) => ({ homeScore: 3, awayScore: 1, winner: h });
const played = (): GmBracketSave => JSON.parse(JSON.stringify(playBracketWeek(FOUR, openBracket(FOUR, 2026, LEAGUE.table.slice(0, 4)), home)));

describe('inGmPostseason', () => {
  it('is the hub at the bracket period with no champion for the season, and nothing else', () => {
    expect(inGmPostseason({ period: 11, phase: 'hub', seasonHasChampion: false }, 11)).toBe(true);
    expect(inGmPostseason({ period: 10, phase: 'hub', seasonHasChampion: false }, 11)).toBe(false);
    expect(inGmPostseason({ period: 12, phase: 'hub', seasonHasChampion: false }, 11)).toBe(false);
    expect(inGmPostseason({ period: 11, phase: 'hub', seasonHasChampion: true }, 11)).toBe(false);
    for (const phase of ['draft', 'recap', 'fired', 'setup']) expect(inGmPostseason({ period: 11, phase, seasonHasChampion: false }, 11)).toBe(false);
  });
});

describe('loadGmPostseason', () => {
  it('outside the postseason answers null, whatever the block', () => {
    for (const block of [undefined, null, played(), { v: 2 }, 'x', 7, []]) expect(loadGmPostseason(toy(), LEAGUE, 2026, false, block)).toBeNull();
  });

  it('hands a sound block back as it is', () => {
    const block = played();
    const r = loadGmPostseason(toy(), LEAGUE, 2026, true, block);
    expect(r && r.kind === 'bracket' && r.format).toBe(FOUR);
    if (!r || r.kind !== 'bracket') throw new Error('refused');
    expect(r.repair.save).toBe(block);
    expect(r.repair.rebuilt).toBeNull();
    expect(r.repair.line).toBeNull();
  });

  it('rebuilds a damaged block unplayed from its own seeds, with the feed line', () => {
    const block = played();
    block.played[0].games[0].winner = block.played[0].away;
    const r = loadGmPostseason(toy(), LEAGUE, 2026, true, block);
    if (!r || r.kind !== 'bracket') throw new Error('refused');
    expect(r.repair.rebuilt).toBe('seeds');
    expect(r.repair.line).toBe(BRACKET_REBUILT_LINES.seeds);
    expect(r.repair.save).toEqual(openBracket(FOUR, 2026, block.seeds));
  });

  it('rebuilds from the engine\'s seeds when there is no block, or the block is of another season or seeds the league refuses', () => {
    const other = { ...played(), season: 2025 };
    const strangers = { ...openBracket(FOUR, 2026, ['ANT', 'BEE', 'CAT', 'EEL']) };
    for (const block of [undefined, null, 'x', other, strangers]) {
      const r = loadGmPostseason(toy(), LEAGUE, 2026, true, block);
      if (!r || r.kind !== 'bracket') throw new Error('refused');
      expect(r.repair.rebuilt).toBe('fresh');
      expect(r.repair.line).toBe(BRACKET_REBUILT_LINES.fresh);
      expect(r.repair.save).toEqual(openBracket(FOUR, 2026, ['ANT', 'BEE', 'CAT', 'DOG']));
    }
  });

  it('reads nothing of a block whose version it does not know but the version, and rebuilds it from the engine\'s seeds', () => {
    for (const v of [2, 0, '1', undefined]) {
      const sound = { ...played(), v } as Record<string, unknown>;
      if (v === undefined) delete sound.v;
      const read: string[] = [];
      const spy = new Proxy(sound, { get: (t, k) => { read.push(String(k)); return t[k as string]; } });
      const r = loadGmPostseason(toy(), { ...LEAGUE, table: ['DOG', 'CAT', 'BEE', 'ANT', 'EEL', 'FOX'] }, 2026, true, spy);
      if (!r || r.kind !== 'bracket') throw new Error('refused');
      expect(r.repair.rebuilt, `v ${String(v)}`).toBe('fresh');
      expect(r.repair.save.seeds).toEqual(['DOG', 'CAT', 'BEE', 'ANT']);
      expect(read.filter(k => k !== 'v'), `v ${String(v)}`).toEqual([]);
    }
  });

  it('refuses a season it has no bracket for, and a sport whose format cannot be read', () => {
    expect(loadGmPostseason(toy(), { ...LEAGUE, season: 2025 }, 2025, true, played())).toEqual({ kind: 'refused', refused: 'no-format', why: 'there is no playoff bracket for the 2025 season' });
    const broken = toy({ formatFor: () => { throw new Error('no data'); } });
    const b = loadGmPostseason(broken, LEAGUE, 2026, true, undefined);
    expect(b && b.kind === 'refused' ? b.refused : null).toBe('no-format');
  });

  it('refuses a league whose own seeds do not open a bracket, rather than save one no press can play', () => {
    const three = toy({ seeds: lg => lg.table.slice(0, 3) });
    const twice = toy({ seeds: () => ['ANT', 'ANT', 'BEE', 'CAT'] });
    const throws = toy({ seeds: () => { throw new Error('a conference with too few clubs'); } });
    const noClubs = toy({ isClub: () => { throw new Error('no clubs'); } });
    for (const sport of [three, twice, throws, noClubs]) {
      const r = loadGmPostseason(sport, LEAGUE, 2026, true, { v: 3 });
      expect(r && r.kind === 'refused' ? r.refused : null).toBe('no-bracket');
      expect(r && r.kind === 'refused' ? r.why : '').not.toBe('');
    }
  });

  it('never throws, whatever the block', () => {
    const cyclic: Record<string, unknown> = { v: 1 };
    cyclic.self = cyclic;
    cyclic.seeds = cyclic;
    const trap = new Proxy({}, { get: () => { throw new Error('trap'); } });
    const getter = Object.defineProperty({}, 'v', { get: () => { throw new Error('v'); }, enumerable: true });
    for (const block of [cyclic, trap, getter, { v: 1, played: 'x' }, { v: 1, seeds: [1, 2] }, Object.create(null)]) {
      const r = loadGmPostseason(toy(), LEAGUE, 2026, true, block);
      expect(r?.kind).toBe('bracket');
      if (r && r.kind === 'bracket') expect(r.repair.rebuilt).not.toBeNull();
    }
  });
});

// Round 1570: the Hall wall's module, on engine built careers in all four sports and on constructed walls.
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  HALL_WALL_CAP, HALL_WALL_CLAMPS, HALL_WALL_ENTRY_MAX_BYTES, HALL_WALL_KEY_MAX, HALL_WALL_LISTS,
  addToWall, hallWallEntry, hallWallKey, sanitizeHallWall, wallKeyOf, type HallWallEntry,
} from '@/lib/usCareerHallWall';
import { hallRecordFor, stampHallCalibration, type HallOutcome } from '@/lib/careerHallOfFame';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
import type { UsCareerCore, UsCareerSport } from '@/lib/usCareerSport';

function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const ROWS: { label: string; sport: UsCareerSport; pos: string }[] = [
  { label: 'NFL', sport: NFL_CAREER_SPORT, pos: 'QB' },
  { label: 'NBA', sport: NBA_CAREER_SPORT, pos: 'PG' },
  { label: 'MLB', sport: MLB_CAREER_SPORT, pos: 'CF' },
  { label: 'NHL', sport: NHL_CAREER_SPORT, pos: 'C' },
];
/** A career made with the binding's own calls on a seeded stream and played to its retirement, stamped as the
 *  board's persist stamps it. */
function retired(S: UsCareerSport, pos: string, seed: number, salt = 'salt1570'): UsCareerCore {
  const rng = seededRandom(seed);
  const c = S.startCareer(`Wall ${seed}`, pos, S.create.archetypes[pos][0], rng, null as never, 'now') as UsCareerCore;
  c.summerSalt = salt;
  S.assignRole(c, 80, rng);
  for (let i = 0; i < 30 && !S.shouldRetire(c); i++) { S.simSeason(c, 80, rng); S.progress(c, rng); }
  c.retired = true;
  stampHallCalibration(c);
  return c;
}
const plain = (n: number) => 'W'.repeat(n);
/** A plaque with every string past its clamp and every list past its length, in the given sport. */
function overlong(sport: 'nfl' | 'nba' | 'mlb' | 'nhl', key = plain(HALL_WALL_KEY_MAX)) {
  const C = HALL_WALL_CLAMPS, L = HALL_WALL_LISTS;
  return {
    key, name: plain(2 * C.name), pos: plain(2 * C.pos), eraId: plain(2 * C.eraId), seasons: 99, from: 9999, to: 9999,
    teams: Array.from({ length: L.teams + 3 }, () => plain(2 * C.team)), moreTeams: 999, rings: 999,
    honours: Array.from({ length: L.honours + 3 }, () => ({ label: plain(2 * C.label), n: 9999 })), legacy: -99999,
    verdict: plain(2 * C.verdict), hof: false,
    hall: {
      sport, hallName: plain(2 * C.hallName), firstClass: 9999, score: -99999, outcome: 'notOnBallot',
      ballots: Array.from({ length: L.ballots + 3 }, () => ({ classYear: 9999, share: 99.9, elected: false })),
      inductedClass: 9999, firstBallot: false, jersey: { team: plain(2 * C.team), seasons: 99, teamName: plain(2 * C.teamName) },
      weighs: plain(2 * C.weighs),
    },
  };
}
/** A small valid plaque with a chosen key and Hall outcome, for the store's cases. */
function plaque(key: string, outcome: HallOutcome): HallWallEntry {
  const e = sanitizeHallWall({ v: 1, entries: [{ ...overlong('nba', key), hall: { ...overlong('nba').hall, outcome } }] }, 'nba').entries[0];
  if (!e) throw new Error('fixture plaque did not pass');
  return e;
}

afterEach(() => { vi.restoreAllMocks(); });

describe('Round 1570: the plaque for a retired career', () => {
  it.each(ROWS)('$label: the plaque is the card\'s record and the legacy, and the career is not touched', row => {
    const S = row.sport, c = retired(S, row.pos, 1570);
    const before = JSON.stringify(c);
    const e = hallWallEntry(S, c)!;
    expect(JSON.stringify(c)).toBe(before);
    expect(e).not.toBeNull();
    expect(e.hall).toEqual(hallRecordFor(S.hall!, c));
    const legacy = S.legacyOf(c);
    expect([e.legacy, e.verdict, e.hof]).toEqual([legacy.score, legacy.verdict, legacy.hof]);
    expect(e.key).toBe(wallKeyOf(c, S.hall!));
    expect([e.name, e.pos, e.seasons, e.from, e.to]).toEqual([c.name, c.pos, c.seasons.length, c.seasons[0].year, c.seasons.at(-1)!.year]);
    expect(e.teams).toEqual([...new Set(c.seasons.map(s => s.team))].slice(0, 8));
    expect(e.rings).toBe(S.ringsOf(c));
    expect(e.honours).toEqual(S.honours(c).filter(h => h.n > 0));
    // The round trip through storage is lossless, and the same career makes the same plaque.
    const back = sanitizeHallWall(JSON.parse(JSON.stringify({ v: 1, entries: [e] })), S.slug);
    expect(back).toEqual({ entries: [e], writable: true });
    expect(JSON.stringify(hallWallEntry(S, JSON.parse(before)))).toBe(JSON.stringify(e));
  });
  it.each(ROWS)('$label: no plaque for a career still being played, with no Hall bound, or with a key too long to keep whole', row => {
    const S = row.sport, c = retired(S, row.pos, 7);
    expect(hallWallEntry(S, { ...c, retired: false })).toBeNull();
    expect(hallWallEntry({ ...S, hall: undefined }, c)).toBeNull();
    expect(hallWallEntry(S, { ...c, name: plain(HALL_WALL_KEY_MAX) })).toBeNull();
    expect(hallWallKey(S.slug)).toBe(`${S.slug}-my-career-hall-v1`);
  });
  it('the career key tells careers apart by salt, seasons and games, and never reads NaN', () => {
    const S: UsCareerSport = NBA_CAREER_SPORT, c = retired(S, 'PG', 11), k = wallKeyOf(c, S.hall!);
    expect(wallKeyOf(JSON.parse(JSON.stringify(c)), S.hall!)).toBe(k);
    expect(wallKeyOf({ ...c, summerSalt: 'other' }, S.hall!)).not.toBe(k);
    expect(wallKeyOf({ ...c, seasons: c.seasons.slice(0, -1) }, S.hall!)).not.toBe(k);
    expect(wallKeyOf({ ...c, seasons: c.seasons.map((s, i) => (i ? s : { ...s, games: s.games + 1 })) }, S.hall!)).not.toBe(k);
    const old = { ...c, summerSalt: undefined, seasons: c.seasons.map(s => ({ ...s, games: undefined as unknown as number })) };
    expect(wallKeyOf(old, S.hall!)).toMatch(/\|\|\d+\|0$/);
  });
  it('more than eight clubs keeps the first eight and counts the rest', () => {
    const S: UsCareerSport = MLB_CAREER_SPORT, c = retired(S, 'CF', 3);
    c.seasons = Array.from({ length: 11 }, (_, i) => ({ ...c.seasons[0], year: 2030 + i, team: `T${i}` }));
    const e = hallWallEntry(S, c)!;
    expect([e.teams, e.moreTeams]).toEqual([['T0', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'], 3]);
  });
});

describe('Round 1570: the wall keeps 12 and a Hall of Famer comes down last', () => {
  const inducted = (n: number, tag: string) => Array.from({ length: n }, (_, i) => plaque(`${tag}${i}`, 'inducted'));
  it('the same plaque again gives back the same list, and a changed record replaces it where it hangs', () => {
    const wall = [plaque('a', 'inducted'), plaque('b', 'fellOff'), plaque('c', 'waiting')];
    expect(addToWall(wall, plaque('b', 'fellOff'))).toBe(wall);
    const changed = { ...plaque('b', 'fellOff'), honours: [{ label: 'international medals', n: 2 }] };
    const next = addToWall(wall, changed);
    expect(next).not.toBe(wall);
    expect(next.map(e => e.key)).toEqual(['a', 'b', 'c']);
    expect(next[1]).toBe(changed);
    expect(addToWall(next, { ...changed })).toBe(next);
  });
  it('a new plaque goes up first', () => {
    expect(addToWall([plaque('a', 'inducted')], plaque('b', 'waiting')).map(e => e.key)).toEqual(['b', 'a']);
  });
  it('past 12 the oldest plaque that missed the Hall comes down, never the new one', () => {
    // Newest first: 9 Hall of Famers and 3 who missed, the oldest miss at the end.
    const wall = [...inducted(5, 'h'), plaque('m0', 'fellOff'), ...inducted(4, 'g'), plaque('m1', 'waiting'), plaque('m2', 'notOnBallot')];
    expect(wall.length).toBe(HALL_WALL_CAP);
    const next = addToWall(wall, plaque('new', 'fellOff'));
    expect(next.length).toBe(HALL_WALL_CAP);
    expect(next[0].key).toBe('new');
    expect(next.map(e => e.key)).not.toContain('m2');
    expect(next.filter(e => e.hall.outcome === 'inducted').length).toBe(9);
  });
  it('with 12 Hall of Famers up, a miss still goes up and the oldest Hall of Famer comes down, and only one per run', () => {
    const wall = inducted(12, 'h');
    const one = addToWall(wall, plaque('miss1', 'notOnBallot'));
    expect(one.map(e => e.key)).toEqual(['miss1', ...wall.slice(0, 11).map(e => e.key)]);
    const two = addToWall(one, plaque('miss2', 'fellOff'));
    expect(two.map(e => e.key)).toEqual(['miss2', ...wall.slice(0, 11).map(e => e.key)]);
    expect(addToWall(wall, plaque('hof13', 'inducted')).map(e => e.key)).toEqual(['hof13', ...wall.slice(0, 11).map(e => e.key)]);
  });
});

describe('Round 1570: what storage hands back', () => {
  it('junk is an empty wall the next plaque may replace; a newer version is left alone', () => {
    for (const junk of [null, 'x', 7, [], [plaque('a', 'inducted')], {}, { v: '1' }]) expect(sanitizeHallWall(junk, 'nba')).toEqual({ entries: [], writable: true });
    expect(sanitizeHallWall({ v: 2, entries: [plaque('a', 'inducted')] }, 'nba')).toEqual({ entries: [], writable: false });
    expect(sanitizeHallWall({ v: 1, entries: 'nope' }, 'nba')).toEqual({ entries: [], writable: true });
  });
  it('a bad plaque, another sport\'s plaque and a second copy are each dropped alone', () => {
    const good = [plaque('a', 'inducted'), plaque('b', 'fellOff')];
    const bad = { ...plaque('x', 'waiting'), from: 'soon' };
    const nhl = { ...plaque('y', 'waiting'), hall: { ...plaque('y', 'waiting').hall, sport: 'nhl' } };
    const got = sanitizeHallWall(JSON.parse(JSON.stringify({ v: 1, entries: [good[0], bad, nhl, good[0], good[1]] })), 'nba');
    expect(got).toEqual({ entries: good, writable: true });
    const many = Array.from({ length: 15 }, (_, i) => plaque(`k${i}`, 'waiting'));
    expect(sanitizeHallWall({ v: 1, entries: many }, 'nba').entries.map(e => e.key)).toEqual(many.slice(0, 12).map(e => e.key));
    expect(sanitizeHallWall({ v: 1, entries: [{ ...good[0], key: plain(HALL_WALL_KEY_MAX + 1) }] }, 'nba').entries).toEqual([]);
  });
  it('every clamp cuts, and a plaque with every clamp hit is the stated size', () => {
    const e = sanitizeHallWall({ v: 1, entries: [overlong('nhl')] }, 'nhl').entries[0];
    const C = HALL_WALL_CLAMPS, L = HALL_WALL_LISTS;
    expect([e.name.length, e.pos.length, e.eraId!.length, e.verdict.length]).toEqual([C.name, C.pos, C.eraId, C.verdict]);
    expect([e.teams.length, e.teams[0].length, e.honours.length, e.honours[0].label.length]).toEqual([L.teams, C.team, L.honours, C.label]);
    expect([e.hall.hallName.length, e.hall.ballots.length, e.hall.weighs!.length]).toEqual([C.hallName, L.ballots, C.weighs]);
    expect([e.hall.jersey!.team.length, e.hall.jersey!.teamName!.length]).toEqual([C.team, C.teamName]);
    expect(JSON.stringify(e).length).toBe(HALL_WALL_ENTRY_MAX_BYTES);
    expect(JSON.stringify({ v: 1, entries: Array(HALL_WALL_CAP).fill(e) }).length).toBeLessThanOrEqual(HALL_WALL_CAP * HALL_WALL_ENTRY_MAX_BYTES + 32);
  });
  it('the three functions draw nothing', () => {
    const draws = vi.spyOn(Math, 'random');
    for (const row of ROWS) {
      const c = retired(row.sport, row.pos, 21);
      draws.mockClear();
      const e = hallWallEntry(row.sport, c)!;
      addToWall(addToWall([], e), e);
      sanitizeHallWall(JSON.parse(JSON.stringify({ v: 1, entries: [e] })), row.sport.slug);
      expect(draws).not.toHaveBeenCalled();
    }
  });
});

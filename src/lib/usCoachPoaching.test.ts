// Fictional six-season players and real coaching transitions, not sports history.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  acceptCoachOffer, coachOutlook, ensureCoachCareer, playCoachSeason,
  sitOutCoachSeason, startCoachCareer, type CoachCareerState,
} from '@/lib/usCoachCareer';
import type { UsCareerLike } from '@/lib/usCareerToCoach';

interface Transition { seed: number; year: number; before: CoachCareerState; tape: number[] }
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
/* Round 1103: each six-season scout is a recording made on main before that round moved the NBA stat line
   (scripts/recordUsCoachPoachingScouts.mjs), with the draws he used. The stream is wound on by that many and
   the coach engine carries on down it, so the pinned seasons below no longer ride on the player engine's
   draws. Every coaching season is still played on the real engine, and no expectation changed. */
interface Scout { draws: number; player: UsCareerLike & { year: number } }
const scoutOf = (seed: number): Scout => {
  const file = path.resolve(__dirname, '../test/fixtures/usCoachPoachingScouts888.json');
  const scout = (JSON.parse(readFileSync(file, 'utf8')) as { scouts: Record<string, Scout> }).scouts[String(seed)];
  if (!scout || scout.player.seasons.length !== 6) throw new Error(`Missing recorded scout ${seed}`);
  return scout;
};
const transitions: Transition[] = process.env.US_COACH_POACHING_FIXTURES
  ? JSON.parse(readFileSync(process.env.US_COACH_POACHING_FIXTURES, 'utf8')) as Transition[] : [];
const generated = new Set<number>();
function seedRandom(seed: number) {
  let s = seed >>> 0; const tape: number[] = [];
  return { tape, draw: () => {
    s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296; tape.push(value); return value;
  } };
}
function fixture(seed: number, year: number): Transition {
  if (!process.env.US_COACH_POACHING_FIXTURES && !generated.has(seed)) {
    const r = seedRandom(seed), scout = scoutOf(seed);
    for (let i = 0; i < scout.draws; i++) r.draw();
    const player = clone(scout.player);
    player.retired = true; let state = startCoachCareer('nba', player, player.year, r.draw);
    for (let i = 0; i < 40 && state.year <= 2063; i++) {
      if (state.unemployed) { state = state.offers.length ? acceptCoachOffer(state, 0) : sitOutCoachSeason(state, r.draw).state; continue; }
      const before = clone(state), start = r.tape.length;
      state = playCoachSeason(state, r.draw).state;
      transitions.push({ seed, year: before.year, before, tape: r.tape.slice(start) });
    }
    generated.add(seed);
  }
  const found = transitions.find(t => t.seed === seed && t.year === year);
  if (!found) throw new Error(`Missing real transition ${seed}/${year}`);
  return clone(found);
}
function play(seed: number, year: number) {
  const t = fixture(seed, year), held = clone(t.before); let draws = 0;
  const out = playCoachSeason(t.before, () => {
    if (draws >= t.tape.length) throw new Error('Unexpected additional RNG draw');
    return t.tape[draws++];
  });
  expect(t.before).toEqual(held); expect(draws).toBe(t.tape.length);
  return { ...out, before: held, draws };
}

describe('US coach poaching follows a real new chair', () => {
  it('keeps seed4 year2063 departure and standing unchanged when no larger vacancy exists', () => {
    const { before, state, notes, draws } = play(4, 2063);
    expect(before.job?.team).toBe('Oklahoma City Thunder'); expect(before.profile.departure).toBe('firedLosing');
    expect(state.profile.departure).toBe('firedLosing'); expect(coachOutlook(state).standing).toBe(88);
    expect(state.job).toEqual({ ...before.job, seasonsHere: 2 }); expect(draws).toBe(123);
    expect(state.results.at(-1)).toEqual({ n: 32, year: 2063, team: 'Oklahoma City Thunder', tier: 2, role: 'Head Coach', wins: 49, losses: 33, otl: 0, line: '49-33, lost the conference semis.', madePlayoffs: true, roundsWon: 1, champion: false, departure: null });
    expect(notes).toEqual(['Oklahoma City Thunder: 49-33, lost the conference semis.']);
    expect(state.year).toBe(2064); expect(state.results.slice(0, -1)).toEqual(before.results);
    expect(state.profile.ringsAsCoach).toBe(before.profile.ringsAsCoach);
    expect(state.profile.playoffRoundsWon).toBe(before.profile.playoffRoundsWon + 1);
  });

  it.each([
    [1, 2055, 'Washington Wizards', 'Miami Heat', 131, 50, 32, 0],
    [1, 2061, 'Miami Heat', 'New Orleans Pelicans', 127, 55, 27, 0],
    [2, 2045, 'Denver Nuggets', 'Houston Rockets', 130, 53, 29, 0],
    [2, 2054, 'Atlanta Hawks', 'Utah Jazz', 127, 45, 37, 2],
    [4, 2049, 'LA Clippers', 'Boston Celtics', 130, 52, 30, 3],
    [4, 2059, 'Boston Celtics', 'Dallas Mavericks', 125, 46, 36, 0],
  ] as const)('retains genuine seed%i year%i transfer from%s to%s', (seed, year, from, to, draws, wins, losses, rounds) => {
    const result = play(seed, year), { state, before, notes } = result;
    expect(before.job?.team).toBe(from); expect(state.job?.team).toBe(to);
    expect(state.profile.departure).toBe('poached'); expect(state.job?.seasonsHere).toBe(0);
    expect(state.unemployed).toBe(false); expect(result.draws).toBe(draws);
    expect(notes.at(-1)).toContain(`${to} came for you and paid to get you out of your deal.`);
    expect(state.results.at(-1)).toMatchObject({ year, team: from, wins, losses, roundsWon: rounds, departure: null });
    expect(state.results.slice(0, -1)).toEqual(before.results); expect(state.year).toBe(year + 1);
  });

  it('holds the original ordinary staying season and its three draws', () => {
    const { state, before, notes, draws } = play(1, 2032);
    expect(state.job).toEqual({ ...before.job, seasonsHere: 1 }); expect(draws).toBe(3);
    expect(state.profile.departure).toBe('retiredPlayer'); expect(coachOutlook(state).standing).toBe(44);
    expect(state.results.at(-1)).toMatchObject({ wins: 43, losses: 39, madePlayoffs: false, departure: null });
    expect(notes).toEqual(['Brooklyn Nets: Brooklyn Nets went 43-39 and missed the playoffs.']);
  });

  it('holds original firing, new market and unemployment without an instant rehire', () => {
    const { state, before, notes, draws } = play(1, 2036);
    expect(before.job?.team).toBe('Brooklyn Nets'); expect(state.job).toBeNull(); expect(state.unemployed).toBe(true);
    expect(draws).toBe(135); expect(state.profile.departure).toBe('contractExpired');
    expect(coachOutlook(state).standing).toBe(40); expect(state.offers).toHaveLength(1);
    expect(state.results.at(-1)).toMatchObject({ wins: 48, losses: 34, roundsWon: 1, departure: 'contractExpired' });
    expect(notes).toEqual(['Brooklyn Nets: Brooklyn Nets went 48-34 and lost the conference semis.', 'The head coach was let go and the whole staff went with him. Nobody blamed you.', '1 team came in.']);
  });

  it('keeps previously earned poaching credit during an ordinary same-chair season', () => {
    const { state, before } = play(1, 2056);
    expect(before.profile.departure).toBe('poached'); expect(state.profile.departure).toBe('poached');
    expect(state.job?.team).toBe(before.job?.team); expect(state.job?.seasonsHere).toBe(1);
  });

  it('round-trips current coaching saves and null old coaching data through the existing repair API', () => {
    const { state } = play(1, 2032), bytes = JSON.stringify(state);
    localStorage.setItem('coach888-fixture-save', bytes);
    expect(ensureCoachCareer(JSON.parse(localStorage.getItem('coach888-fixture-save')!), 'nba')).toEqual(state);
    expect(localStorage.getItem('coach888-fixture-save')).toBe(bytes);
    expect(ensureCoachCareer(null, 'nba')).toBeNull(); expect(ensureCoachCareer(undefined, 'nba')).toBeNull();
    localStorage.removeItem('coach888-fixture-save');
  });

  it('does not play or draw randomness when the original fired coach has no job', () => {
    const { state } = play(1, 2036), before = clone(state);
    const result = playCoachSeason(state, () => { throw new Error('An unemployed coach cannot draw a played season'); });
    expect(result).toEqual({ state: before, notes: [] }); expect(state).toEqual(before);
  });
});

import { afterEach, expect, it, vi } from 'vitest';
import {
  FORMATIONS, leagueBookEleven, matchFacts, oppRosterFor, playNextEntry, resumeMatch, setInstructions, startCareer, strengthOf,
  type CareerState,
} from '@/lib/clubManager';
import { AI_STYLES, aiStyleFor, opponentStyle } from '@/lib/clubManagerTactics';

function seed(value = 101) {
  vi.spyOn(Math, 'random').mockImplementation(() => {
    value = (Math.imul(1664525, value) + 1013904223) >>> 0;
    return value / 2 ** 32;
  });
  vi.mocked(Math.random).mockClear();
}

afterEach(() => vi.restoreAllMocks());

function careerAt(club: string) {
  seed();
  return startCareer(club, 'now');
}

function openingMatch(career: CareerState, noBook = false) {
  seed();
  const result = playNextEntry(career, { noBook });
  if (result.kind !== 'halftime') throw new Error('Expected an opening match');
  return result;
}

it.each(['Chelsea', 'Tottenham Hotspur', 'Arsenal'])('fields a position-compatible opponent eleven against %s', club => {
  const { live, state } = openingMatch(careerAt(club));
  const expected = {
    Chelsea: ['Fulham', '4-3-3'],
    'Tottenham Hotspur': ['Manchester United', '3-5-2'],
    Arsenal: ['Coventry City', '4-4-2'],
  }[club]!;
  expect(live.opponent).toBe(expected[0]);
  const formation = FORMATIONS[live.oppFormationIndex!];
  expect(formation.name).toBe(expected[1]);
  const xi = live.oppXi!;
  const bench = live.oppBench!;
  const roster = oppRosterFor(state, live.opponent);
  expect(xi).toHaveLength(11);
  expect(bench).toHaveLength(7);
  expect(xi.every((p, slot) => formation.slots[slot].allowed.includes(p.p))).toBe(true);
  expect(new Set([...xi, ...bench].map(p => p.n)).size).toBe(18);
  expect([...xi, ...bench].every(p => roster.some(row => row.n === p.n && row.p === p.p))).toBe(true);
});

it('keeps the old playable fallback when the roster cannot fill a formation', () => {
  const { live } = openingMatch(careerAt('Real Madrid'));
  expect(live.opponent).toBe('Sevilla');
  expect(FORMATIONS[live.oppFormationIndex!].name).toBe('4-3-3');
  const xi = live.oppXi!;
  const bench = live.oppBench!;
  expect(xi).toHaveLength(11);
  expect(xi.filter(p => p.p === 'GK')).toHaveLength(1);
  expect(new Set([...xi, ...bench].map(p => p.n)).size).toBe(xi.length + bench.length);
});

it('keeps the old team sheet for the daily path and the background league book', () => {
  const career = careerAt('Chelsea');
  const { live, state } = openingMatch(career, true);
  expect(live.opponent).toBe('Fulham');
  expect(FORMATIONS[live.oppFormationIndex!].name).toBe('4-4-2');
  expect(live.oppXi).toEqual(leagueBookEleven(state, live.opponent));
  expect(live).not.toHaveProperty('oppStyle');
});

it('derives a fictional manager preference without consuming a draw and freezes it for the match report', () => {
  const career = careerAt('Chelsea');
  const opponent = matchFacts(career)!.opponent;
  const legacy = aiStyleFor(opponent, strengthOf(career, opponent));
  const generated = ['Leroy Sunfield', 'Nolan Bridge', 'Rico Marin', 'Toby Masson', 'Michel Moss', 'Idris Finch', 'Felix Roan']
    .map(name => ({ ...career, managers: { ...career.managers, [opponent]: { name, since: 1 } } }));
  const before = vi.mocked(Math.random).mock.calls.length;
  const styles = generated.map(state => opponentStyle(state, opponent));
  expect(new Set(styles).size).toBeGreaterThan(1);
  expect(vi.mocked(Math.random).mock.calls.length).toBe(before);
  const authored = generated.find((_, index) => styles[index] !== legacy);
  if (!authored) throw new Error('Expected at least one new manager style');
  const setup = setInstructions(authored, { press: 1, tempo: 1, width: 0, line: 0 })!;
  const style = opponentStyle(setup, opponent);
  const { live, state } = openingMatch(setup);
  expect(live).toMatchObject({ oppStyle: style });
  expect(AI_STYLES[style]).toBeDefined();
  const paused = JSON.parse(JSON.stringify(state)) as CareerState;
  paused.managers![opponent] = { name: 'Another Manager', since: 2 };
  expect(opponentStyle(paused, opponent)).toBe(style);
  expect(resumeMatch(paused).report!.detail!.tactics!.theirStyle).toBe(style);

  delete paused.live!.oppStyle;
  expect(opponentStyle(paused, opponent)).toBe(legacy);
  expect(resumeMatch(paused).report!.detail!.tactics!.theirStyle).toBe(legacy);
});

it('uses the club style for a sourced real manager', () => {
  const career = careerAt('Chelsea');
  const opponent = matchFacts(career)!.opponent;
  expect(career.managers![opponent].real).toBe(1);
  const clubStyle = aiStyleFor(opponent, strengthOf(career, opponent));
  expect(opponentStyle(career, opponent)).toBe(clubStyle);
  expect(openingMatch(career).live).not.toHaveProperty('oppStyle');
});

it('lets two fictional managers use different compatible shapes with the same opponent roster', () => {
  const career = careerAt('Chelsea');
  const opponent = matchFacts(career)!.opponent;
  const setup = (name: string): CareerState => ({
    ...career, managers: { ...career.managers, [opponent]: { name, since: 1 } },
  });
  const pressing = openingMatch(setup('Rico Marin')).live;
  const defensive = openingMatch(setup('Michel Moss')).live;
  for (const [live, style, shape] of [
    [pressing, 'gegenpress', '4-3-3'],
    [defensive, 'lowblock', '4-5-1'],
  ] as const) {
    const formation = FORMATIONS[live!.oppFormationIndex!];
    expect(live!.oppStyle).toBe(style);
    expect(formation.name).toBe(shape);
    expect(live!.oppXi).toHaveLength(11);
    expect(live!.oppXi!.every((p, slot) => formation.slots[slot].allowed.includes(p.p))).toBe(true);
  }
  const rating = (live: typeof pressing) => live!.oppXi!.reduce((sum, p) => sum + p.r, 0);
  expect(Math.abs(rating(pressing) - rating(defensive))).toBeLessThanOrEqual(5);
  expect([pressing!.lamMine, pressing!.lamOpp]).toEqual([defensive!.lamMine, defensive!.lamOpp]);

  const moved = 'Another Club';
  const atNewClub = { ...career, managers: { ...career.managers, [moved]: { name: 'Rico Marin', since: 4 } } };
  expect(opponentStyle(atNewClub, moved)).toBe(pressing!.oppStyle);
});

it('uses the club style for legacy real names and for an unrecorded chair', () => {
  const career = careerAt('Chelsea');
  const opponent = matchFacts(career)!.opponent;
  const legacyReal = { ...career, managers: { ...career.managers, [opponent]: { name: career.managers![opponent].name, since: 1 } } };
  const unrecorded = { ...career, managers: {} };
  const style = aiStyleFor(opponent, strengthOf(career, opponent));
  expect(opponentStyle(legacyReal, opponent)).toBe(style);
  expect(opponentStyle(unrecorded, opponent)).toBe(style);
});

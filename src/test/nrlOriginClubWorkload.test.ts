import { expect, it } from 'vitest';
import { createNrlCareer, nrlOriginClubWorkload, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { nrlMatchFitness, nrlNextRound } from '@/lib/nrlManager';
import { nrlOriginEligibility, type NrlOriginSide } from '@/lib/nrlOrigin';

const read = (state: NrlCareerState) => readNrlCareerSave(JSON.stringify(state));
const next = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });

function selection(state: NrlCareerState, side: NrlOriginSide, workload = false) {
  const { year } = state.season;
  let opened = reduceNrlCareer(state, { type: 'startOrigin', year, side, fullPool: true, ...(workload && { clubWorkload: true as const }) });
  const starters = Object.values(state.season.lineup);
  for (const player of state.season.squad) {
    if (starters.includes(player.id) && nrlOriginEligibility(player.id) === side)
      opened = reduceNrlCareer(opened, { type: 'selectOriginStarter', year, side, game: 1, role: player.role, playerId: player.id });
  }
  return opened;
}

it.each([
  [2026, 'broncos', 'qld', 1, 2, [8, 18], [2, 18]],
  [2027, 'bears', 'nsw', 7, 3, [32, 6], [32, 0]],
] as const)(
  'debits only settled same-year %i club starters and saves the change once',
  (year, clubId, side, seed, round, usualScore, tiredScore) => {
    let opening = createNrlCareer(clubId, seed, year);
    while (opening.season.round < round) opening = next(opening);
    expect(nrlNextRound(opening.season).clubMatch).toBeTruthy();
    const available = selection(opening, side, true), plain = selection(opening, side);
    const ready = nrlOriginClubWorkload(available);
    const expected = opening.season.squad.filter(row => Object.values(available.origin!.selection.starters).includes(row.id));
    expect(ready.map(row => row.id)).toEqual(expected.map(row => row.id));
    expect(ready.length).toBeGreaterThan(1);
    expect(nrlOriginClubWorkload(plain)).toEqual([]);
    expect(read(available)).toEqual(available);
    const action = { type: 'playOriginMatch', year, side, game: 1 } as const;
    const ordinary = reduceNrlCareer(plain, action), affected = reduceNrlCareer(read(available)!, action);
    const { clubLoad, ...settled } = affected.origin!.matches[0];
    expect(settled).toEqual(ordinary.origin!.matches[0]);
    expect(clubLoad).toEqual({ clubId, round: opening.season.round, players: expected.map(row => [row.id, row.fitness]) });
    const allocations = new Map(ready.map(row => [row.id, row.after]));
    expect(affected.players).toEqual(opening.players.map(row => allocations.has(row.id) ? { ...row, fitness: allocations.get(row.id) } : row));
    expect(affected.season.squad).toEqual(opening.season.squad.map(row => allocations.has(row.id) ? { ...row, fitness: allocations.get(row.id) } : row));
    expect(affected.season.results).toEqual(opening.season.results);
    expect(affected.finance).toEqual(opening.finance);
    const marked = read(affected)!;
    expect(marked).toEqual(affected);
    expect(reduceNrlCareer(marked, action)).toBe(marked);
    const id = expected[0].id;
    const now = marked.season.squad.find(row => row.id === id)!;
    expect(nrlMatchFitness(marked.season, now)).toBeLessThan(nrlMatchFitness(opening.season, expected[0]));
    const recovery = reduceNrlCareer(marked, { type: 'prepare', choice: 'recover' });
    expect(nrlMatchFitness(recovery.season, now)).toBeGreaterThan(nrlMatchFitness(marked.season, now));
    const afterClub = next(marked);
    const matchScore = (state: NrlCareerState) => {
      const played = state.season.results.find(row => row.round === round && row.playerScoring)!;
      return [played.homeScore, played.awayScore];
    };
    expect(matchScore(afterClub)).toEqual(tiredScore);
    expect(matchScore(next(ordinary))).toEqual(usualScore);
    expect(read(afterClub)).toEqual(afterClub);
    const spoofed: NrlCareerState = { ...marked, origin: { ...marked.origin!, matches: [
      { ...marked.origin!.matches[0], clubLoad: { ...clubLoad!, players: [['unlisted', 100]] } },
    ] } };
    expect(read(spoofed)).toBeNull();
    const wrongClub: NrlCareerState = { ...marked, origin: { ...marked.origin!, matches: [
      { ...marked.origin!.matches[0], clubLoad: { ...clubLoad!, clubId: 'storm' } },
    ] } };
    expect(read(wrongClub)).toBeNull();
  },
);

it('leaves old-year and offseason Origin games detached from current club fitness', () => {
  const year = 2026, side = 'qld', club = createNrlCareer('broncos', 4, year);
  const act = { type: 'playOriginMatch', year, side, game: 1 } as const;
  let finished = selection(club, side, true);
  while (finished.season.phase !== 'complete') finished = next(finished);
  expect(nrlOriginClubWorkload(finished)).toEqual([]);
  const historical = reduceNrlCareer(finished, { type: 'startNextSeason' });
  const offline = reduceNrlCareer(historical, act);
  expect(offline.origin?.matches).toHaveLength(1);
  expect(offline.origin?.matches[0].clubLoad).toBeUndefined();
  expect(offline.players).toBe(historical.players);
  expect(offline.season).toBe(historical.season);
  expect(read(offline)).toEqual(offline);
  const directOffseason = { ...finished, origin: undefined };
  const start = { type: 'startOrigin', year, side } as const;
  expect(reduceNrlCareer(directOffseason, { ...start, clubWorkload: true })).toBe(directOffseason);
  expect(reduceNrlCareer(directOffseason, start).origin).toBeDefined();
});

it('links a start during a bye to the next actual club fixture', () => {
  let club = createNrlCareer('broncos', 4, 2026);
  while (nrlNextRound(club.season).clubStatus === 'playing') club = next(club);
  expect(nrlNextRound(club.season).clubStatus).toBe('bye');
  const opened = selection(club, 'qld', true);
  const settled = reduceNrlCareer(opened, { type: 'playOriginMatch', year: 2026, side: 'qld', game: 1 });
  const match = settled.origin!.matches[0];
  expect(match.clubLoad?.players.length).toBeGreaterThan(0);
  expect(read(settled)).toEqual(settled);
  const afterBye = next(settled);
  expect(nrlNextRound(afterBye.season).clubMatch?.round).toBe(match.clubLoad?.round);
  expect(afterBye.season.results.some(result => result.round === club.season.round && result.playerScoring)).toBe(false);
  expect(read(afterBye)).toEqual(afterBye);
  const invalidBye: NrlCareerState = { ...settled, origin: { ...settled.origin!, matches: [
    { ...match, clubLoad: { ...match.clubLoad!, round: club.season.round } },
  ] } };
  expect(read(invalidBye)).toBeNull();
});

import { useState } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import SoccerCareerProgramme from '@/components/soccer-career/SoccerCareerProgramme';
import * as E from '@/lib/soccerCareerEngine';
import { chooseProgramme, programmeEffects, programmeOptions, settleSoccerProgramme } from '@/lib/soccerCareerProgramme';
import { isSoccerCareerSave, parseSoccerCareerSave, serializeSoccerCareerSave } from '@/lib/soccerCareerSave';

const adopt = (career: E.CareerState) => chooseProgramme(career, 'position', 'adopt');
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const keys = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes', 'overall'] as const;
const stats = (career: E.CareerState) => Object.fromEntries(keys.map(key => [key, career[key]]));

function season(career: E.CareerState, year: number, age: number): E.SeasonRecord {
  return { year, age, club: career.currentClub, clubCountry: career.currentClubCountry, clubTier: career.currentClubTier,
    apps: 30, leagueApps: 28, goals: 14, assists: 6, cleanSheets: 0, yellowCards: 2, redCards: 0, rating: 7.2, ovr: career.overall,
    leagueTitle: false, domesticCup: false, championsLeague: false, worldCup: false, ballonDor: false, ballonDorRank: null,
    type: 'playing', intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null };
}
function initial(overall = 98): E.CareerState {
  const club = E.FALLBACK_CLUBS.find(row => row.tier === 2 && row.country === 'England')!;
  const c = E.initCareer('Primary Role Fixture', 'England', 'ST', '2020-24',
    { pace: overall, shooting: overall, passing: overall, dribbling: overall, defending: overall, physical: overall, reflexes: overall },
    overall, 2020, E.FALLBACK_CLUBS, null, 99);
  Object.assign(c, { currentClub: club.name, currentClubCountry: club.country, currentClubTier: club.tier,
    currentClubColor: club.color, currentLeague: club.league, age: 22, phase: 'playing', agentId: 'self',
    weeklyWage: 12000, contractYearsLeft: 4, netWorth: 2, totalEarnings: 4, retired: false, morale: 70,
    primeType: 'normal', peakOverall: overall, rival: null, rivalCreated: true, pendingEvents: [], pendingNews: [],
    internationalCareer: false, intStats: { ...c.intStats, isRetired: true } });
  c.seasons = [season(c, 2024, 22)];
  return clone(c);
}
/** Explicit fictional playing records; the actual existing course helper settles each record. */
function completeCourseYear(career: E.CareerState, severe = false): E.CareerState {
  const c = clone(chooseProgramme(career, 'position', 'LW'));
  const row = season(c, c.seasons.at(-1)!.year + 1, c.age + 1);
  if (severe) { row.apps = 0; row.leagueApps = 0; row.injurySevere = true; }
  c.age = row.age; c.seasons = [...c.seasons, row];
  settleSoccerProgramme(c, row);
  return c;
}
function earned(overall = 98): E.CareerState { return completeCourseYear(completeCourseYear(initial(overall))); }
function held(career: E.CareerState) { return { career: clone(career), calls: vi.mocked(Math.random).mock.calls.length }; }
function raw(name: string, career: E.CareerState, before: ReturnType<typeof held>, observations: Record<string, unknown>) {
  const value = { case: name, observations: { inputHeld: isDeepStrictEqual(career, before.career), ...observations } };
  if (process.env.SC_PRIMARY_ROLE_RAW) {
    mkdirSync(process.env.SC_PRIMARY_ROLE_RAW, { recursive: true });
    writeFileSync(join(process.env.SC_PRIMARY_ROLE_RAW, name + '.json'), JSON.stringify(value, null, 2) + '\n');
  }
  expect(career).toEqual(before.career);
  expect(localStorage.getItem('primary-role-unrelated')).toBe('held');
}
function reload(career: E.CareerState): E.CareerState {
  const bytes = serializeSoccerCareerSave(career); localStorage.setItem('soccerCareerSave', bytes);
  const next = parseSoccerCareerSave(localStorage.getItem('soccerCareerSave')!) as E.CareerState;
  expect(isSoccerCareerSave(next)).toBe(true); expect(next).toEqual(clone(career)); return next;
}
function play(career: E.CareerState) {
  const tape: number[] = [];
  vi.mocked(Math.random).mockImplementation(() => { tape.push(0.5); return 0.5; });
  return { value: E.advanceProSeason(clone(career), E.FALLBACK_CLUBS), tape };
}
beforeEach(() => {
  localStorage.clear(); localStorage.setItem('primary-role-unrelated', 'held');
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-04T12:00:00.000Z'));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Soccer programme primary role', () => {
  it('adopts the genuinely learned role through the native plan while keeping all 98 skills and signed terms', () => {
    const c = earned(), before = held(c), changed = vi.fn(); let current = c;
    function App() {
      const [career, setCareer] = useState(c);
      return <SoccerCareerProgramme career={career} onChange={next => { current = next; changed(next); setCareer(next); }} onClose={() => undefined} />;
    }
    const view = render(<App />), help = view.container.ownerDocument.body.textContent ?? '';
    fireEvent.click(view.getByRole('button', { name: 'See my plans' }));
    fireEvent.click(view.getByRole('button', { name: /Second position/ }));
    const button = view.queryByRole('button', { name: 'Choose Make LW my primary position' });
    const detail = view.container.ownerDocument.body.textContent ?? '';
    if (button) fireEvent.click(button);
    const loaded = reload(current);
    raw('native-adoption', c, before, { available: !!button, help, detail, callbacks: changed.mock.calls.length, after: loaded,
      drawDelta: vi.mocked(Math.random).mock.calls.length - before.calls });
    expect([!!button, loaded.position, changed.mock.calls.length], 'SC_PRIMARY_ROLE_NATIVE').toEqual([true, 'LW', 1]);
    expect(/3%/.test(help + detail) && /flexibility|planned appearances/i.test(help + detail)).toBe(true);
    expect(stats(loaded)).toEqual(Object.fromEntries(keys.map(key => [key, 98])));
    expect([loaded.weeklyWage, loaded.contractYearsLeft, loaded.netWorth, loaded.totalEarnings, loaded.agentFeesPaid])
      .toEqual([c.weeklyWage, c.contractYearsLeft, c.netWorth, c.totalEarnings, c.agentFeesPaid]);
    expect(loaded.seasons).toEqual(c.seasons); expect(loaded.programme?.receipts).toEqual(c.programme?.receipts);
    expect(vi.mocked(Math.random).mock.calls.length).toBe(before.calls);
  });

  it('consumes the course and flexibility once without rewriting unrelated plans money history or attributes', () => {
    const certified = earned();
    const c = chooseProgramme(chooseProgramme(chooseProgramme(certified, 'tactics', 'creator'), 'bonuses', 'goals'), 'position', 'LW');
    const before = held(c), next = adopt(c), repeated = adopt(next), loaded = reload(next);
    raw('consume-once', c, before, { beforeEffect: programmeEffects(c), afterEffect: programmeEffects(next),
      after: loaded, repeatHeld: repeated === next, drawDelta: vi.mocked(Math.random).mock.calls.length - before.calls });
    expect([next.position, programmeEffects(next).appsMult, !!next.programme?.secondaryTraining, !!next.programme?.secondaryPosition],
      'SC_PRIMARY_ROLE_CONSUMED').toEqual(['LW', 1, false, false]);
    const expected = clone(c); expected.position = 'LW';
    delete expected.programme!.secondaryTraining; delete expected.programme!.secondaryPosition;
    delete expected.programme!.plan!.choices.position;
    expect(next).toEqual(expected); expect(loaded).toEqual(expected); expect(repeated).toBe(next);
    expect(next.programme?.plan?.choices).toEqual({ tactics: 'creator', bonuses: 'goals' });
    expect(next.programme?.plan?.bonusEuros).toBe(48000); expect(next.events).toEqual(c.events);
    expect(stats(next)).toEqual(stats(c)); expect(vi.mocked(Math.random).mock.calls.length).toBe(before.calls);
  });

  it('uses the adopted position in the actual next season rather than only changing the visible label', () => {
    const c = earned(75), before = held(c), adopted = adopt(c);
    const expected = clone(c); expected.position = 'LW';
    delete expected.programme!.secondaryPosition; delete expected.programme!.secondaryTraining;
    const originalRole = clone(expected); originalRole.position = 'ST';
    const actual = play(adopted), reference = play(expected), striker = play(originalRole);
    const row = actual.value.seasons.at(-1)!, wanted = reference.value.seasons.at(-1)!, oldRoleRow = striker.value.seasons.at(-1)!;
    raw('future-role', c, before, { adoptedPosition: adopted.position,
      actual: actual.value, reference: reference.value, striker: striker.value,
      actualTape: actual.tape, referenceTape: reference.tape, strikerTape: striker.tape });
    expect([adopted.position, row.type, row.year, row.goals, row.assists], 'SC_PRIMARY_ROLE_FUTURE')
      .toEqual(['LW', 'playing', 2027, wanted.goals, wanted.assists]);
    expect(actual.value).toEqual(reference.value); expect(actual.tape).toEqual(reference.tape);
    expect([wanted.goals, wanted.assists]).not.toEqual([oldRoleRow.goals, oldRoleRow.assists]);
    expect(E.trainingStatFor(adopted.position, 'dribbling')).toEqual({ stat: 'dribbling', label: 'Dribbling' });
    expect(stats(adopted)).toEqual(stats(c)); expect(c.seasons).toEqual(before.career.seasons);
  });

  it('requires both real consecutive played course settlements before adopting and consumes no action draw', () => {
    const start = initial(), once = completeCourseYear(start), twice = completeCourseYear(once);
    const before = held(start), first = adopt(once), second = adopt(twice);
    raw('two-season-gate', start, before, { firstHeld: first === once, once: once.programme, twice: twice.programme,
      secondPosition: second.position, drawDelta: vi.mocked(Math.random).mock.calls.length - before.calls });
    expect([first === once, second.position], 'SC_PRIMARY_ROLE_EARNED').toEqual([true, 'LW']);
    expect(once.programme?.secondaryTraining?.seasons).toBe(1); expect(once.programme?.secondaryPosition).toBeUndefined();
    expect(twice.programme?.secondaryTraining?.seasons).toBe(2); expect(twice.programme?.secondaryPosition?.position).toBe('LW');
    expect(twice.programme?.receipts.map(row => [row.year, row.status, row.choices.position, row.secondaryPosition]))
      .toEqual([[2025, 'completed', 'LW', null], [2026, 'completed', 'LW', 'LW']]);
    expect(vi.mocked(Math.random).mock.calls.length).toBe(before.calls);
  });

  it('refuses unearned unavailable stale and future qualifications without overwriting their raw state', () => {
    const c = earned(), once = completeCourseYear(initial()), absent = initial(), interrupted = completeCourseYear(once, true);
    const before = held(c), vectors: Record<string, unknown>[] = [];
    for (const name of ['absent', 'one-season', 'interrupted', 'retired', 'wrong-window', 'other-club', 'wrong-primary',
      'stale-year', 'future-version', 'malformed', 'qualification-without-course', 'qualification-without-receipt']) {
      let frame = clone(c);
      if (name === 'absent') frame = clone(absent);
      if (name === 'one-season') frame = clone(once);
      if (name === 'interrupted') frame = clone(interrupted);
      if (name === 'retired') frame.retired = true;
      if (name === 'wrong-window') frame.phase = 'transfer_window';
      if (name === 'other-club') frame.currentClub = 'Other Fictional Club';
      if (name === 'wrong-primary') frame.position = 'CM';
      if (name === 'stale-year') frame.programme!.secondaryTraining!.year--;
      if (name === 'future-version') Object.assign(frame.programme!, { version: 99 });
      if (name === 'malformed') Object.assign(frame, { programme: { version: 1, receipts: 'unreadable', future: 'held' } });
      if (name === 'qualification-without-course') delete frame.programme!.secondaryTraining;
      if (name === 'qualification-without-receipt') frame.programme!.receipts = [];
      const snapshot = clone(frame), at = vi.mocked(Math.random).mock.calls.length, next = adopt(frame);
      vectors.push({ name, same: next === frame, inputHeld: isDeepStrictEqual(frame, snapshot),
        serializedHeld: serializeSoccerCareerSave(next) === serializeSoccerCareerSave(snapshot),
        draws: vi.mocked(Math.random).mock.results.slice(at).map(row => row.value) });
    }
    raw('refused-state', c, before, { vectors });
    expect(vectors).toEqual(['absent', 'one-season', 'interrupted', 'retired', 'wrong-window', 'other-club', 'wrong-primary',
      'stale-year', 'future-version', 'malformed', 'qualification-without-course', 'qualification-without-receipt']
      .map(name => ({ name, same: true, inputHeld: true, serializedHeld: true, draws: [] })));
  });

  it('retains every existing eligible plan action and ordinary position choice when no adoption action is requested', () => {
    const c = initial(), before = held(c), vectors = [];
    for (const view of programmeOptions(c)) for (const choice of view.choices.filter(row => row.eligible && row.id !== 'adopt')) {
      const at = vi.mocked(Math.random).mock.calls.length;
      const result = chooseProgramme(c, view.id, choice.id), repeated = chooseProgramme(c, view.id, choice.id);
      vectors.push({ id: view.id, choice: choice.id, result, repeated, effect: programmeEffects(result),
        draws: vi.mocked(Math.random).mock.results.slice(at).map(row => row.value) });
    }
    raw('legacy-default', c, before, { vectors });
    const ordinary = vectors.find(row => row.id === 'position' && row.choice === 'LW')!;
    expect(ordinary.result.programme?.plan).toEqual({ year: 2025, club: c.currentClub, choices: { position: 'LW' } });
    expect(vectors.every(row => isDeepStrictEqual(row.result, row.repeated) && row.result.position === 'ST')).toBe(true);
    expect(vectors.every(row => row.draws.length === 0)).toBe(true);
    expect(vi.mocked(Math.random).mock.calls.length).toBe(before.calls);
  });
});

import { afterEach, expect, it, vi } from 'vitest';
import { effectiveXIWithSlots, loadCareer, nextFixture, playNextEntry, setTrainingPlan, startCareer, starterFitnessPreview, type CareerState } from '@/lib/clubManager';
import { keyedRng } from '@/lib/keyedRng';

afterEach(() => vi.restoreAllMocks());

function playOne(c: CareerState) {
  const result = playNextEntry(c, { skipHalftime: true, noCoach: true, untilWeek: c.week + 1 });
  expect(result.kind).toBe('match');
  expect(result.state.week).toBe(c.week + 1);
  return result.state;
}

function beforeGame(team: string, week: number) {
  vi.spyOn(Math, 'random').mockImplementation(keyedRng('starter-load-' + team));
  let c = startCareer(team);
  while (c.week < week) c = playOne(c);
  return c;
}

it.each([['Everton', 1, 7], ['Manchester City', 3, 3]] as const)(
  'quotes the active %s XI against the real calendar and settles a rotated keeper at kickoff', (team, week, days) => {
    const c = beforeGame(team, week);
    const xi = effectiveXIWithSlots(c);
    const keeper = xi.find(line => line.slot.label === 'GK')!.p;
    const understudy = c.squad.find(p => p.position === 'GK' && p.id !== keeper.id && !p.injuryWeeks && !p.suspendedMatches)!;
    expect(understudy).toBeDefined();
    const before = JSON.stringify(c);
    const rng = vi.mocked(Math.random);
    const calls = rng.mock.calls.length;
    const preview = starterFitnessPreview(c);
    expect(rng.mock.calls).toHaveLength(calls);
    expect(JSON.stringify(c)).toBe(before);
    expect(preview.rows.map(r => [r.id, r.now])).toEqual(xi.map(({ p }) => [p.id, p.fitness]));
    const forecast = preview.forecast!;
    expect(forecast.days).toBe(days);
    const row = forecast.values.find(r => r.id === keeper.id)!;
    expect(row.low).toBeLessThanOrEqual(row.high);
    expect(row.high).toBeLessThan(row.rest);

    const rotated = { ...c, xiIds: xi.map(line => line.p.id === keeper.id ? understudy.id : line.p.id) };
    expect(starterFitnessPreview(rotated).rows.some(p => p.id === keeper.id)).toBe(false);
    const saved = loadCareer(JSON.stringify(rotated))!;
    expect(starterFitnessPreview(saved)).toEqual(starterFitnessPreview(rotated));
    const after = playOne(saved);
    expect(nextFixture(after)).toMatchObject({ opponent: forecast.opponent, compLabel: forecast.competition });
    expect(after.squad.find(p => p.id === keeper.id)).toMatchObject({ apps: keeper.apps, fitness: row.rest });
    for (const r of forecast.values.filter(r => r.id !== keeper.id)) {
      const old = c.squad.find(p => p.id === r.id)!;
      const player = after.squad.find(p => p.id === r.id)!;
      expect(player.apps).toBe(old.apps + 1);
      expect(player.fitness).toBeGreaterThanOrEqual(r.low);
      expect(player.fitness).toBeLessThanOrEqual(r.high);
    }
  }, 20000);

it('credits an individual training order only on a training week, and omits a projection over a window', () => {
  const c = beforeGame('Manchester City', 2);
  const followed = startCareer('Everton').worldComps!.dsc!;
  expect(followed.clubs).toContain(c.clubName);
  // Use the game's settled field for a playable Super Cup night between league fixtures.
  const night: CareerState = { ...c, worldComps: { ...c.worldComps, dsc: followed }, calendar: [
    ...c.calendar.slice(0, c.week), { type: 'oneOff', round: 0, night: { k: 'dsc', n: 0 } },
    ...c.calendar.slice(c.week),
  ] };
  expect(nextFixture(night)).toMatchObject({ kind: 'match', competition: 'oneOff' });
  expect(c.calendar[c.week].night).toBeUndefined();
  expect(night.calendar[night.week].night).toBeTruthy();
  for (const current of [c, night]) {
    const base = starterFitnessPreview(current).forecast!;
    const row = base.values.find(r => r.now < 90)!;
    const light = setTrainingPlan(current, { intensity: 'normal', focus: 'balanced', recoveryWeek: {
      v: 1, club: current.clubName, season: current.season, playerId: row.id,
    } });
    const double = setTrainingPlan(current, { intensity: 'normal', focus: 'balanced', recoveryWeek: {
      v: 2, club: current.clubName, season: current.season, playerId: row.id, intensity: 'double',
    } });
    const reading = (s: CareerState) => starterFitnessPreview(s).forecast!.values.find(r => r.id === row.id)!.high;
    if (current === night) {
      expect(reading(light)).toBe(row.high);
      expect(reading(double)).toBe(row.high);
    } else {
      expect(reading(light)).toBeGreaterThan(row.high);
      expect(reading(double)).toBeLessThan(row.high);
    }
  }
  const window = c.calendar.find(e => e.type === 'window')!;
  const blocked = { ...c, calendar: [...c.calendar.slice(0, c.week + 1), window] };
  expect(starterFitnessPreview(blocked)).toMatchObject({ forecast: null });
  expect(starterFitnessPreview(blocked).rows).toHaveLength(11);
}, 20000);

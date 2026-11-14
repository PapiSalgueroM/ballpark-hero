import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addDays, daysBetween, isoDate, parseIsoDate } from '@/lib/calDate';
import { keyedRng } from '@/lib/keyedRng';
import type { CareerState, CMPlayer, PlayResult } from '@/lib/clubManager';

let engine: typeof import('@/lib/clubManager');
let calendar: typeof import('@/lib/clubManagerCalendar');

beforeEach(async () => {
  vi.spyOn(Date, 'now').mockReturnValue(1793800800000);
  engine = await import('@/lib/clubManager');
  calendar = await import('@/lib/clubManagerCalendar');
});
afterEach(() => vi.restoreAllMocks());

function fixture(club = 'Everton'): CareerState {
  vi.spyOn(Math, 'random').mockImplementation(keyedRng('major-injury-fixture'));
  return engine.startCareer(club);
}

function json<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function kickOff(state: CareerState) {
  vi.spyOn(Math, 'random').mockImplementation(keyedRng('major-injury-match'));
  return engine.playNextEntry(state);
}

function nextGame(state: CareerState) {
  let result: PlayResult = kickOff(state);
  while (result.kind === 'window') result = kickOff(result.state);
  expect(result.kind).toBe('halftime');
  return result;
}

function player(state: CareerState, id: string): CMPlayer {
  const row = state.squad.find(p => p.id === id);
  expect(row).toBeDefined();
  return row!;
}

describe('Club Manager major injuries', () => {
  it('classifies both types on a real injury draw, preserves the half and retains the report through reload', () => {
    const base = fixture();
    let ordinary: PlayResult | undefined;
    let seed = 0;
    while (!ordinary && seed < 60) {
      seed += 1;
      vi.spyOn(Math, 'random').mockImplementation(keyedRng(`major-injury-half|${seed}`));
      const result = engine.playNextEntry(base);
      if (result.live?.h1Injuries?.length) ordinary = result;
    }
    expect(ordinary?.live?.h1Injuries?.length).toBe(1);
    const reference = ordinary!.live!;
    const victim = reference.h1Injuries![0];
    const date = calendar.entryDatesOf(ordinary!.state)[reference.week];
    const cases = [
      { kind: 'acl', min: 28, max: 37, match: (roll: number) => roll < 0.0065, label: 'ACL tear' },
      { kind: 'achilles', min: 33, max: 42, match: (roll: number) => roll >= 0.0065 && roll < 0.01, label: 'Achilles rupture' },
    ];
    for (const test of cases) {
      let worldSeed = 1;
      while (worldSeed < 10000 && !test.match(keyedRng(
        `cm-injury|${worldSeed}|${base.clubName}|${base.season}|${reference.week}|${reference.opponent}|${victim.id}|0`,
      )())) worldSeed += 1;
      expect(worldSeed).toBeLessThan(10000);
      const start = { ...base, worldSeed };
      vi.spyOn(Math, 'random').mockImplementation(keyedRng(`major-injury-half|${seed}`));
      const result = engine.playNextEntry(start);
      const inj = result.live!.h1Injuries![0];
      expect(inj).toMatchObject({ id: victim.id, minute: victim.minute, name: victim.name, majorInjury: { kind: test.kind } });
      expect(inj.weeks).toBeGreaterThanOrEqual(test.min);
      expect(inj.weeks).toBeLessThanOrEqual(test.max);
      expect(inj.majorInjury?.returnDate).toBe(isoDate(addDays(date, inj.weeks * 7)));

      const paused = json(result.state);
      expect(engine.playNextEntry(paused).live?.h1Injuries).toEqual([inj]);
      const resolved = engine.resumeMatch(paused);
      expect(resolved.report?.detail?.injuries).toContainEqual(inj);
      expect(resolved.report?.events.some(line => line.includes(test.label))).toBe(true);
      const recovering = player(json(resolved.state), victim.id!);
      expect(recovering.majorInjury).toEqual(inj.majorInjury);
      expect(engine.isAvailable(recovering)).toBe(false);
    }
  });

  it('ages through an actual summer, holds a player until his return date, then clears him for selection', () => {
    const base = fixture();
    const victim = base.squad.filter(p => !p.isYouth).sort((a, b) => a.age - b.age)[0];
    const nextKickoff = calendar.kickoffOf({ ...base, season: base.season + 1 });
    victim.majorInjury = { kind: 'achilles', returnDate: isoDate(addDays(nextKickoff, 25)) };
    victim.injuryWeeks = 22;
    victim.contractYears = 6;
    victim.suspendedMatches = 0;
    base.week = base.calendar.length;
    const finished = engine.finishSeason(base);
    const next = engine.startNextSeason(json(finished.state));
    expect(next.season).toBe(base.season + 1);
    expect(player(next, victim.id)).toMatchObject({ injuryWeeks: 4, majorInjury: victim.majorInjury });
    expect(next.xiIds).not.toContain(victim.id);
    const nextDates = calendar.entryDatesOf(next);
    const expected = parseIsoDate(victim.majorInjury.returnDate);
    const before = next.calendar.findIndex((entry, i) => engine.fixtureFor(next, entry) !== null && daysBetween(nextDates[i], expected) > 0);
    const after = next.calendar.findIndex((entry, i) => engine.fixtureFor(next, entry) !== null && daysBetween(nextDates[i], expected) <= 0);
    expect(before).toBeGreaterThanOrEqual(0);
    expect(after).toBeGreaterThan(before);
    const injured = nextGame({ ...json(next), week: before });
    expect(player(injured.state, victim.id).injuryWeeks).toBe(Math.ceil(daysBetween(nextDates[before], expected) / 7));
    expect(injured.live?.startXi).not.toContain(victim.id);
    const ready = nextGame({ ...json(next), week: after });
    expect(player(ready.state, victim.id).majorInjury).toBeUndefined();
    expect(engine.isAvailable(player(ready.state, victim.id))).toBe(true);
  });

  it('keeps the ordinary countdown and the seed-replayed daily fixture on their existing rules', () => {
    const base = fixture();
    const id = base.squad[base.squad.length - 1].id;
    player(base, id).injuryWeeks = 3;
    const played = engine.resumeMatch(nextGame(base).state);
    expect(player(played.state, id)).toMatchObject({ injuryWeeks: 2 });
    const daily = engine.playNextEntry(base, { noBook: true });
    expect(daily.live?.majorInjuryRules).toBeUndefined();
    expect(daily.live?.h1Injuries?.every(inj => inj.majorInjury === undefined)).toBe(true);
  });

  it('keeps a player out after settling a match before his return, even when a midweek fixture is next', () => {
    const base = fixture('Manchester City');
    const dates = calendar.entryDatesOf(base);
    const first = base.calendar.findIndex((entry, i) => entry.type === 'league' && base.calendar[i + 1]?.type === 'league'
      && daysBetween(dates[i], dates[i + 1]) >= 2);
    expect(first).toBeGreaterThanOrEqual(0);
    // Exercise the same short calendar gap with a fixture that skips the normal weekly tick.
    base.calendar[first + 1].night = { k: 'uel', n: 0 };
    const settledDates = calendar.entryDatesOf(base);
    base.week = first;
    const victim = base.squad[base.squad.length - 1];
    victim.injuryWeeks = 1;
    victim.majorInjury = { kind: 'acl', returnDate: isoDate(settledDates[first + 1]) };
    expect(daysBetween(settledDates[first], settledDates[first + 1])).toBeGreaterThanOrEqual(2);
    const due = calendar.simToDate(base, addDays(settledDates[first], 1));
    expect(due?.lastReport).toBeTruthy();
    expect(due?.state.week).toBe(first + 1);
    expect(player(due!.state, victim.id)).toMatchObject({ injuryWeeks: 1, majorInjury: victim.majorInjury });
    const next = nextGame(json(due!.state));
    expect(next.live?.week).toBe(first + 1);
    expect(player(next.state, victim.id).majorInjury).toBeUndefined();
    expect(engine.isAvailable(player(next.state, victim.id))).toBe(true);
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  advanceProSeason, declineRetirementSuggestion, FALLBACK_CLUBS, retireFromInternational,
  type CareerState,
} from '@/lib/soccerCareerEngine';
import {
  internationalReturnEligibility, makeInternationallyAvailable, readInternationalReturn,
} from '@/lib/soccerInternationalReturn';

afterEach(() => vi.restoreAllMocks());
const clone = <T,>(value: T): T => structuredClone(value);
const event = 'Made yourself available for national-team selection again. A squad place still has to be earned.';
function career(age = 34, year = 2028): CareerState {
  const saved = JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8'))
    .saves.find((value: { id: string }) => value.id === 'ere').state as CareerState;
  const c = clone(saved);
  c.age = age;
  c.seasons[c.seasons.length - 1] = { ...c.seasons[c.seasons.length - 1], age, year };
  c.internationalCareer = false;
  c.intStats = { ...c.intStats, isRetired: true, isCaptain: true };
  return c;
}
function random(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let n = Math.imul(value ^ (value >>> 15), 1 | value);
    n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n;
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}
function played(c: CareerState, seed: number): { state: CareerState; draws: number[] } {
  const next = random(seed);
  const draws: number[] = [];
  const spy = vi.spyOn(Math, 'random').mockImplementation(() => { const draw = next(); draws.push(draw); return draw; });
  let state: CareerState;
  try {
    state = advanceProSeason(clone(c), FALLBACK_CLUBS);
    if (state.phase === 'retirement_suggestion') state = declineRetirementSuggestion(state, FALLBACK_CLUBS);
  } finally { spy.mockRestore(); }
  return { state: state!, draws };
}
function football(age: number, year: number, strong: boolean): CareerState {
  const c = career(age, year);
  for (const key of ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes'] as const) c[key] = strong ? 95 : 65;
  c.overall = c.peakOverall = strong ? 95 : 65;
  c.retirementSuggested = true;
  c.position = 'CM';
  c.nationality = 'England';
  c.intStats.isCaptain = strong;
  c.seasons[c.seasons.length - 1].rating = strong ? 8.5 : 5.5;
  c.seasons[c.seasons.length - 1].goals = strong ? 12 : 0;
  return c;
}

describe('Soccer voluntary international availability', () => {
  it('changes only the two flags, one strict receipt and one truthful event without a draw', () => {
    const c = career();
    const before = clone(c);
    vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('availability drew randomness'); });
    expect(internationalReturnEligibility(c).available).toBe(true);
    expect(readInternationalReturn(c)).toBeNull();
    const next = makeInternationallyAvailable(c);
    const receipt = { version: 1, sourceCount: c.seasons.length, sourceYear: 2028, sourceAge: 34, nationality: c.nationality, caps: c.intStats.caps };
    expect(next).toEqual({ ...before, internationalCareer: true, intStats: { ...before.intStats, isRetired: false }, internationalReturn: receipt, events: [...before.events, event] });
    expect(c).toEqual(before);
    expect(next.seasons).toBe(c.seasons);
    expect(next.intlHistory).toBe(c.intlHistory);
    expect(next.intStats).not.toBe(c.intStats);
    expect(next.intStats.isCaptain).toBe(true);
    expect(readInternationalReturn(next)).toEqual(receipt);
    expect(makeInternationallyAvailable(next)).toBe(next);
    expect(next.events.filter(value => value === event)).toHaveLength(1);
  });

  it.each([18, 34, 36, 44])('allows an already-capped adult at age %i without an initial-debut age cutoff', age => {
    expect(internationalReturnEligibility(career(age)).available).toBe(true);
  });

  it.each([17, 45, 34.5, NaN, Infinity])('rejects invalid or unavailable age %s', age => {
    const c = career(age);
    const before = clone(c);
    expect(internationalReturnEligibility(c).available).toBe(false);
    expect(makeInternationallyAvailable(c)).toBe(c);
    expect(c).toEqual(before);
  });

  it.each(['BANNED', 'PRISON', 'BANNED (PED)', 'CONVICTED'])('allows the completed recorded zero-app %s year without awarding caps', club => {
    const c = career();
    c.seasons[c.seasons.length - 1] = { ...c.seasons[c.seasons.length - 1], club, clubTier: 99, apps: 0, leagueApps: 0,
      goals: 0, assists: 0, cleanSheets: 0, rating: 0, intApps: 0, intGoals: 0, intAssists: 0, intRating: 0 };
    const before = clone(c);
    const next = makeInternationallyAvailable(c);
    expect(next.internationalCareer).toBe(true);
    expect(next.seasons).toEqual(before.seasons);
    expect(next.intStats.caps).toBe(before.intStats.caps);
  });

  it.each(['wrong tier', 'played apps', 'unknown marker'] as const)('rejects an invalid missed-year exception: %s', kind => {
    const c = career();
    const row = c.seasons[c.seasons.length - 1];
    Object.assign(row, { club: 'BANNED', clubTier: 99, apps: 0 });
    if (kind === 'wrong tier') row.clubTier = 6;
    if (kind === 'played apps') row.apps = 1;
    if (kind === 'unknown marker') row.club = 'Generated Unknown Marker';
    const before = clone(c);
    expect(internationalReturnEligibility(c).available).toBe(false);
    expect(makeInternationallyAvailable(c)).toBe(c);
    expect(c).toEqual(before);
  });

  const invalid: [string, (c: CareerState) => void][] = [
    ['retired club career', c => { c.retired = true; }],
    ['non-playing phase', c => { c.phase = 'transfer_window'; }],
    ['never capped', c => { c.intStats.caps = 0; }],
    ['negative caps', c => { c.intStats.caps = -1; }],
    ['fractional caps', c => { c.intStats.caps = 1.5; }],
    ['nonfinite caps', c => { c.intStats.caps = NaN; }],
    ['already active', c => { c.internationalCareer = true; c.intStats.isRetired = false; }],
    ['not internationally retired', c => { c.intStats.isRetired = false; }],
    ['inconsistent active flag', c => { c.internationalCareer = true; }],
    ['invalid captain flag', c => { (c.intStats as unknown as Record<string, unknown>).isCaptain = 'yes'; }],
    ['invalid goal total', c => { c.intStats.goals = -1; }],
    ['invalid assist total', c => { c.intStats.assists = Infinity; }],
    ['missing senior season', c => { c.seasons = []; }],
    ['latest youth row', c => { c.seasons[c.seasons.length - 1].type = 'youth'; }],
    ['latest retired row', c => { c.seasons[c.seasons.length - 1].type = 'retired'; }],
    ['already-aged pending year', c => { c.age += 1; }],
    ['missing recorded year', c => { c.seasons[c.seasons.length - 1].year = 0; }],
    ['missing recorded club', c => { c.seasons[c.seasons.length - 1].club = ''; }],
    ['non-senior recorded tier', c => { c.seasons[c.seasons.length - 1].clubTier = 6; }],
    ['missing current club', c => { c.currentClub = ''; }],
    ['non-senior current club', c => { c.currentClubTier = 99; }],
    ['fractional current tier', c => { c.currentClubTier = 1.5; }],
    ['missing nation', c => { c.nationality = ''; }],
    ['malformed events', c => { (c as unknown as Record<string, unknown>).events = null; }],
    ['missing pending event container', c => { (c as unknown as Record<string, unknown>).pendingEvents = undefined; }],
  ];
  it.each(invalid)('leaves %s completely unchanged', (_, alter) => {
    const c = career(); alter(c);
    const before = clone(c);
    vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('invalid choice drew randomness'); });
    expect(internationalReturnEligibility(c).available).toBe(false);
    expect(makeInternationallyAvailable(c)).toBe(c);
    expect(c).toEqual(before);
  });

  it.each(['pendingSummary', 'pendingRehab', 'pendingBallonDor', 'pendingWorldCup', 'pendingTournament', 'pendingRivalryEvent', 'pendingEvents'] as const)('waits for the actual %s queue', key => {
    const c = career();
    (c as unknown as Record<string, unknown>)[key] = key === 'pendingEvents' ? [{ id: 1 }] : { held: true };
    const before = clone(c);
    expect(internationalReturnEligibility(c).available).toBe(false);
    expect(makeInternationallyAvailable(c)).toBe(c);
    expect(c).toEqual(before);
  });

  it('does not mistake completed news, debut or tournament history for an unsettled queue', () => {
    const c = career();
    c.pendingNews = [{ newspaper: 'Generated test paper', headline: 'Saved season', body: 'A completed saved season.', type: 'positive' }];
    c.intStats.debutYear = -1;
    expect(internationalReturnEligibility(c).available).toBe(true);
    expect(makeInternationallyAvailable(c).intStats.debutYear).toBe(-1);
  });

  it('keeps the same season cooldown after retirement, reload, training and a summer club move', () => {
    const c = makeInternationallyAvailable(career());
    const again = retireFromInternational(c);
    const moved = clone(again);
    moved.currentClub = 'Generated Test Club'; moved.overall += 1; moved.position = 'ST';
    const before = clone(moved);
    expect(readInternationalReturn(moved)).toEqual(c.internationalReturn);
    expect(internationalReturnEligibility(moved).available).toBe(false);
    expect(makeInternationallyAvailable(moved)).toBe(moved);
    expect(moved).toEqual(before);
  });

  it('permits a new availability action only after a later genuine recorded senior season', () => {
    const c = retireFromInternational(makeInternationallyAvailable(career()));
    c.seasons = [...c.seasons, { ...c.seasons[c.seasons.length - 1], year: 2029, age: 35 }];
    c.age = 35;
    c.intStats.caps += 2;
    expect(readInternationalReturn(c)?.sourceYear).toBe(2028);
    expect(internationalReturnEligibility(c).available).toBe(true);
    const next = makeInternationallyAvailable(c);
    expect(next.internationalReturn).toEqual({ version: 1, sourceCount: c.seasons.length, sourceYear: 2029, sourceAge: 35, nationality: c.nationality, caps: c.intStats.caps });
    expect(next.events).toEqual([...c.events, event]);
    expect(next.seasons).toBe(c.seasons);
  });

  it('does not reset cooldown for an appended duplicate year', () => {
    const c = retireFromInternational(makeInternationallyAvailable(career()));
    c.seasons = [...c.seasons, { ...c.seasons[c.seasons.length - 1] }];
    expect(internationalReturnEligibility(c).available).toBe(false);
    expect(makeInternationallyAvailable(c)).toBe(c);
  });

  it.each(['missing year', 'unchanged age', 'extra count', 'current age behind'] as const)('rejects contradictory receipt chronology: %s', kind => {
    const c = retireFromInternational(makeInternationallyAvailable(career()));
    const row = { ...c.seasons[c.seasons.length - 1], year: 2029, age: 35 };
    c.seasons = [...c.seasons, row]; c.age = 35;
    if (kind === 'missing year') row.year = 2030;
    if (kind === 'unchanged age') row.age = 34;
    if (kind === 'extra count') c.seasons = [...c.seasons, { ...row }];
    if (kind === 'current age behind') c.age = 34;
    const before = clone(c);
    expect(readInternationalReturn(c)).toBeNull();
    expect(makeInternationallyAvailable(c)).toBe(c);
    expect(c).toEqual(before);
  });

  const corruptReceipt: [string, (held: Record<string, unknown>) => void][] = [
    ['wrong version', held => { held.version = 2; }],
    ['extra key', held => { held.club = 'Twente'; }],
    ['missing key', held => { delete held.caps; }],
    ['zero count', held => { held.sourceCount = 0; }],
    ['future count', held => { held.sourceCount = 999; }],
    ['fractional count', held => { held.sourceCount = 1.5; }],
    ['stale year', held => { held.sourceYear = 2027; }],
    ['future year', held => { held.sourceYear = 2029; }],
    ['wrong age', held => { held.sourceAge = 33; }],
    ['future age', held => { held.sourceAge = 40; }],
    ['wrong nation', held => { held.nationality = 'Generated Other Nation'; }],
    ['zero caps', held => { held.caps = 0; }],
    ['future caps', held => { held.caps = 1000; }],
    ['nonfinite caps', held => { held.caps = Infinity; }],
  ];
  it.each(corruptReceipt)('fails closed without repairing the %s receipt', (_, alter) => {
    const c = retireFromInternational(makeInternationallyAvailable(career()));
    alter(c.internationalReturn as unknown as Record<string, unknown>);
    const before = clone(c);
    expect(readInternationalReturn(c)).toBeNull();
    expect(internationalReturnEligibility(c).available).toBe(false);
    expect(makeInternationallyAvailable(c)).toBe(c);
    expect(c).toEqual(before);
  });

  it.each([{ payload: null }, { payload: undefined }, { payload: 'legacy payload' }, { payload: [] }, { payload: {} }])('preserves malformed optional data $payload without allowing the action', ({ payload }) => {
    const c = career();
    (c as unknown as Record<string, unknown>).internationalReturn = payload;
    const before = clone(c);
    expect(readInternationalReturn(c)).toBeNull();
    expect(makeInternationallyAvailable(c)).toBe(c);
    expect(c).toEqual(before);
  });

  it('rejects a receipt whose original source was removed or changed', () => {
    const c = retireFromInternational(makeInternationallyAvailable(career()));
    c.seasons[c.seasons.length - 1].type = 'manager';
    expect(readInternationalReturn(c)).toBeNull();
    expect(makeInternationallyAvailable(c)).toBe(c);
  });

  it.each([34, 36])('lets the actual existing selector earn future caps at age %i without another debut', age => {
    const c = football(age, 2028, true);
    const available = makeInternationallyAvailable(c);
    let found: ReturnType<typeof played> | null = null;
    let seedUsed = 0;
    for (let seed = 1; seed <= 24; seed++) {
      const result = played(available, seed);
      if (result.state.seasons.length === c.seasons.length + 1 && result.state.seasons[result.state.seasons.length - 1].intApps > 0) { found = result; seedUsed = seed; break; }
    }
    expect(found).not.toBeNull();
    const manual = { ...clone(c), internationalCareer: true, intStats: { ...c.intStats, isRetired: false }, events: [...c.events, event] };
    const reference = played(manual, seedUsed);
    expect(found!.state).toEqual({ ...reference.state, internationalReturn: available.internationalReturn });
    expect(found!.draws).toEqual(reference.draws);
    expect(found!.state.intStats.caps).toBeGreaterThan(c.intStats.caps);
    expect(found!.state.intStats.debutYear).toBe(-1);
    expect(found!.state.intStats.debutAge).toBe(c.intStats.debutAge);
    expect(found!.state.seasons[found!.state.seasons.length - 1].year).toBe(2029);
  }, 30000);

  it('allows the actual selector to leave a weak returning player out without new caps', () => {
    const c = football(34, 2028, false);
    const available = makeInternationallyAvailable(c);
    let found: ReturnType<typeof played> | null = null;
    for (let seed = 1; seed <= 24; seed++) {
      const result = played(available, seed);
      const row = result.state.seasons[result.state.seasons.length - 1];
      if (result.state.seasons.length === c.seasons.length + 1 && row.apps > 0 && !row.injurySevere) { found = result; break; }
    }
    expect(found).not.toBeNull();
    expect(found!.state.intStats.caps).toBe(c.intStats.caps);
    expect(found!.state.seasons[found!.state.seasons.length - 1].intApps).toBe(0);
    expect(found!.state.intStats.debutYear).toBe(-1);
  }, 30000);

  it.each(['ban', 'prison'] as const)('preserves actual %s interruption and earns no international caps', kind => {
    const c = football(34, 2028, true);
    if (kind === 'ban') c.matchFixBanned = 2;
    else c.prisonSeasons = 1;
    const available = makeInternationallyAvailable(c);
    const result = played(available, 9);
    const row = result.state.seasons[result.state.seasons.length - 1];
    expect(row.club).toBe(kind === 'ban' ? 'BANNED' : 'PRISON');
    expect(row.year).toBe(2029);
    expect(row.apps).toBe(0);
    expect(row.intApps).toBe(0);
    expect(result.state.intStats.caps).toBe(c.intStats.caps);
    expect(result.state.internationalReturn).toEqual(available.internationalReturn);
    expect(result.state.phase).toBe('season_summary');
  });

  it('uses the existing tournament summer and keeps its original complete results and draw vector', () => {
    const c = football(34, 2029, true);
    const available = makeInternationallyAvailable(c);
    let found: ReturnType<typeof played> | null = null;
    let seedUsed = 0;
    for (let seed = 1; seed <= 24; seed++) {
      const result = played(available, seed);
      if (result.state.seasons.length === c.seasons.length + 1 && result.state.lastTournament?.year === 2030 && !result.state.seasons[result.state.seasons.length - 1].injurySevere) { found = result; seedUsed = seed; break; }
    }
    expect(found).not.toBeNull();
    const manual = { ...clone(c), internationalCareer: true, intStats: { ...c.intStats, isRetired: false }, events: [...c.events, event] };
    const reference = played(manual, seedUsed);
    expect(found!.state).toEqual({ ...reference.state, internationalReturn: available.internationalReturn });
    expect(found!.draws).toEqual(reference.draws);
    expect(found!.state.intlHistory).toEqual(reference.state.intlHistory);
    expect(found!.state.intStats.debutYear).toBe(-1);
  }, 30000);
});

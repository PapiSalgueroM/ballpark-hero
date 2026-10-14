/* Explicit finished-table inputs, not claims of naturally played seasons.
   The actual finish, rollover, save/load and job-entry APIs decide every outcome. */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PYRAMIDS, REAL_LEAGUES, SAVE_KEY, applyTargets, careerLeagueOf, clubDefFor, ensureEraRosters,
  finishSeason, leagueOf, leagueRounds, loadCareer, registerCustomClub, registerLeagueOverrides,
  saveCareer, sortedLeagueTable, startCareer, startNextSeason, uclQualifiersFrom,
} from './clubManager';
import type { CareerState, CustomClubSpec, TableRow } from './clubManager';
import { joinClubNow } from './clubManagerCalendar';
import { saveFence } from './saveFence';

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const spec = (leagueId: string, name = 'Fixture Athletic'): CustomClubSpec => ({
  name, leagueId, stadium: 'Fixture Park', budgetTier: 'mid', quality: 72,
  crest: { shape: 0, pattern: 0, color1: '#2563eb', color2: '#ffffff', initials: 'FA' }, replacedClub: '',
});
const created = (leagueId = 'championship', name?: string) => startCareer(name ?? 'Fixture Athletic', 'now', spec(leagueId, name));
const clubs = (career: CareerState, id: string) => career.leagueOverrides?.[id] ?? REAL_LEAGUES.find(row => row.id === id)!.clubs;

function rankedRows(names: string[]): TableRow[] {
  const rounds = leagueRounds(names.length);
  return names.map((club, index) => ({ club, w: rounds - index, d: 0, l: index,
    gf: rounds * 2 - index, ga: index, pts: (rounds - index) * 3 }));
}

function finished(career: CareerState, place = 1): CareerState {
  const state = copy(career);
  const ordered = state.leagueClubs.filter(name => name !== state.clubName);
  ordered.splice(place - 1, 0, state.clubName);
  state.table = rankedRows(ordered);
  state.week = state.calendar.length;
  for (const league of Object.values(state.world ?? {})) {
    league.table = rankedRows(league.table.map(row => row.club));
    league.round = leagueRounds(league.table.length);
  }
  state.pendingSummary = null;
  return state;
}

function rolled(career: CareerState, place = 1): CareerState {
  const input = finished(career, place), bytes = JSON.stringify(input);
  const fin = finishSeason(input);
  expect(fin.summary.position).toBe(place);
  expect(JSON.stringify(input)).toBe(bytes);
  const done = JSON.stringify(fin.state);
  const next = startNextSeason(fin.state);
  expect(JSON.stringify(fin.state)).toBe(done);
  return next;
}

function realWorld(career: CareerState): void {
  const original = REAL_LEAGUES.flatMap(row => row.clubs).sort();
  const actual = REAL_LEAGUES.flatMap(row => clubs(career, row.id));
  expect(actual.sort()).toEqual(original);
  expect(new Set(actual).size).toBe(actual.length);
  for (const league of REAL_LEAGUES) expect(clubs(career, league.id)).toHaveLength(league.clubs.length);
}

function ownLeague(career: CareerState, id: string): void {
  expect(careerLeagueOf(career).id).toBe(id);
  expect(career.customClub?.leagueId).toBe(id);
  expect(career.leagueClubs).toContain(career.clubName);
  expect(career.leagueClubs).not.toContain(career.customClub!.replacedClub);
  expect([...careerLeagueOf(career).clubs].sort()).toEqual([...career.leagueClubs].sort());
  expect(career.calendar.filter(row => row.type === 'league')).toHaveLength(leagueRounds(career.leagueClubs.length));
  expect(clubDefFor(career.clubName).expectation).toBeGreaterThanOrEqual(1);
  expect(clubDefFor(career.clubName).expectation).toBeLessThanOrEqual(career.leagueClubs.length);
}

beforeAll(async () => { await ensureEraRosters('era2010'); });
beforeEach(() => {
  localStorage.clear(); saveFence.release(SAVE_KEY);
  registerCustomClub(null); registerLeagueOverrides(null);
  vi.spyOn(Math, 'random').mockReturnValue(0.6);
  vi.spyOn(Date, 'now').mockReturnValue(1791979200000);
});
afterEach(() => { saveFence.release(SAVE_KEY); registerCustomClub(null); registerLeagueOverrides(null); vi.restoreAllMocks(); });

describe('created clubs use the existing modern promotion slots', () => {
  it('promotes created champions in every configured pair while preserving all real clubs', () => {
    for (const pair of PYRAMIDS) {
      const before = created(pair.second, `Fixture ${pair.second}`), proxy = before.customClub!.replacedClub;
      const next = rolled(before);
      ownLeague(next, pair.top); realWorld(next);
      expect(next.customClub!.replacedClub).toBe(proxy);
      expect(clubs(next, pair.top)).toContain(proxy);
      expect(clubs(next, pair.second)).not.toContain(proxy);
      expect(next.aiHeadlines[0]).toContain(`You are up: ${before.clubName}`);
      expect(next.uclGroup).toBeNull();
      expect(next.history.at(-1)?.club).toBe(before.clubName);
    }
  });

  it('promotes an ordinary champion through the same existing slots', () => {
    for (const pair of PYRAMIDS) {
      const name = REAL_LEAGUES.find(row => row.id === pair.second)!.clubs[0];
      const next = rolled(startCareer(name));
      expect(careerLeagueOf(next).id).toBe(pair.top); realWorld(next);
      expect(next.aiHeadlines[0]).toContain(`You are up: ${name}`);
      expect(next.uclGroup).toBeNull();
    }
  });

  it('keeps the created club outside the automatic places in its current division', () => {
    for (const pair of PYRAMIDS) {
      const before = created(pair.second), proxy = before.customClub!.replacedClub;
      const next = rolled(before, pair.count + 1);
      ownLeague(next, pair.second); realWorld(next);
      expect(next.customClub!.replacedClub).toBe(proxy);
      expect(next.aiHeadlines.some(line => line.includes(`You are up: ${before.clubName}`))).toBe(false);
    }
  });

  it('uses the saved own-name head-to-head before mapping the promotion slot', () => {
    const pair = PYRAMIDS.find(row => row.top === 'seriea')!;
    expect(pair).toBeDefined();
    const safePlace = REAL_LEAGUES.find(row => row.id === pair.top)!.clubs.length - pair.count;
    const state = finished(created(pair.top), safePlace + 1);
    const ordered = [...state.table], mine = ordered[safePlace], rival = ordered[safePlace - 1];
    expect(mine.club).toBe(state.clubName);
    mine.pts = rival.pts; mine.gf = 0; mine.ga = 50; rival.gf = 50; rival.ga = 0;
    state.pairResults = { [pair.top]: { [`${mine.club}|${rival.club}`]: [2, 0], [`${rival.club}|${mine.club}`]: [0, 1] } };
    expect(sortedLeagueTable(state).findIndex(row => row.club === state.clubName) + 1).toBe(safePlace);
    const fin = finishSeason(state), before = JSON.stringify(fin.state);
    const next = startNextSeason(fin.state);
    ownLeague(next, pair.top); realWorld(next);
    expect(JSON.stringify(fin.state)).toBe(before);
    expect(next.customClub!.replacedClub).toBe(state.customClub!.replacedClub);
  });

  it('relegates a promoted created club without replacing a second real club', () => {
    const initial = created(), proxy = initial.customClub!.replacedClub;
    const top = rolled(initial); ownLeague(top, 'premier');
    const back = rolled(top, top.leagueClubs.length);
    ownLeague(back, 'championship'); realWorld(back);
    expect(back.customClub!.replacedClub).toBe(proxy);
    expect(back.aiHeadlines[0]).toContain(`Relegated. ${initial.clubName}`);
    expect(back.uclGroup).toBeNull();
  });

  it('migrates an unseeded legacy custom first summer without inventing history', () => {
    const old = finished(created()); delete old.leagueOverrides; delete old.worldSeed; delete old.worldRoster;
    const original = JSON.stringify(old);
    localStorage.setItem(SAVE_KEY, original);
    const loaded = loadCareer()!; expect(loaded).not.toBeNull();
    expect(loaded.leagueOverrides).toBeUndefined(); expect(loaded.worldSeed).toBeUndefined();
    const next = startNextSeason(finishSeason(loaded).state);
    ownLeague(next, 'premier'); realWorld(next);
    expect(next.worldSeed).toBeUndefined(); expect(next.customClub!.replacedClub).toBe(old.customClub!.replacedClub);
    expect(old.history).toEqual([]); expect(next.history).toHaveLength(1);
    expect(JSON.stringify(old)).toBe(original);
  });

  it('leaves a missing or incomplete paired table unpromoted', () => {
    for (const missing of [true, false]) {
      const state = finished(created()), proxy = state.customClub!.replacedClub;
      if (missing) delete state.world!.premier;
      else state.world!.premier.table.pop();
      const bytes = JSON.stringify(state), next = startNextSeason(finishSeason(state).state);
      expect(careerLeagueOf(next).id).toBe('championship'); realWorld(next);
      expect(next.customClub!.replacedClub).toBe(proxy);
      expect(next.aiHeadlines.some(line => line.includes(`You are up: ${state.clubName}`))).toBe(false);
      expect(JSON.stringify(state)).toBe(bytes);
    }
  });

  it('keeps historic and unpaired created-club exemptions', () => {
    for (const [era, id] of [['era2010', 'premier2010'], ['now', 'eredivisie']] as const) {
      const before = startCareer('Fixture Athletic', era, spec(id));
      const next = rolled(before);
      expect(careerLeagueOf(next).id).toBe(id); expect(next.leagueOverrides).toBeUndefined();
      expect(next.aiHeadlines.some(line => line.includes(`You are up: ${before.clubName}`))).toBe(false);
    }
  });

  it('restores the promoted custom league and board after another slot registered overrides', () => {
    const next = rolled(created()); ownLeague(next, 'premier');
    const expectedDef = copy(clubDefFor(next.clubName));
    expect(saveCareer(next)).toBe(true);
    const saved = localStorage.getItem(SAVE_KEY);
    const premier = REAL_LEAGUES.find(row => row.id === 'premier')!.clubs;
    const lower = REAL_LEAGUES.find(row => row.id === 'championship')!.clubs;
    registerLeagueOverrides({ premier: lower.slice(0, premier.length), championship: [...premier, ...lower.slice(premier.length)] });
    registerCustomClub(spec('premier', 'Another slot'));
    const loaded = loadCareer()!;
    ownLeague(loaded, 'premier'); realWorld(loaded);
    expect(clubDefFor(loaded.clubName)).toEqual(expectedDef);
    expect(loaded.boardObjectives).toEqual(next.boardObjectives);
    expect(localStorage.getItem(SAVE_KEY)).toBe(saved);
    expect(loaded.leagueOverrides).toEqual(next.leagueOverrides);
  });

  it('starts a fresh created club on the real memberships after a promoted custom save', () => {
    const fresh = created('championship', 'Fresh Fixture');
    rolled(created());
    const again = created('championship', 'Fresh Fixture');
    expect(again.leagueOverrides).toBeUndefined();
    expect(again.customClub).toEqual(fresh.customClub);
    expect(again.leagueClubs).toEqual(fresh.leagueClubs);
    expect(again.boardObjectives).toEqual(fresh.boardObjectives);
    expect(again.squad).toEqual(fresh.squad);
  });

  it('restores the real proxy on summer departure and removes the departed name from Europe', () => {
    const top = rolled(created()), qualified = finishSeason(finished(top)).state;
    const proxy = qualified.customClub!.replacedClub;
    expect(uclQualifiersFrom(qualified)).toContain(qualified.clubName);
    const moved = startNextSeason(qualified, 'Barcelona');
    expect(moved.customClub).toBeUndefined(); expect(moved.clubName).toBe('Barcelona'); realWorld(moved);
    expect(moved.uclField).toContain(proxy); expect(moved.uclField).not.toContain(qualified.clubName);
    expect(applyTargets(moved).some(row => row.club === proxy)).toBe(true);
    expect(leagueOf(proxy).id).toBe('premier');
    expect(moved.history).toEqual(qualified.history);
  });

  it('restores the real proxy when leaving a created European club during a season', () => {
    const top = rolled(created('premier'));
    expect(top.uclField).toContain(top.clubName);
    top.week = 1;
    const proxy = top.customClub!.replacedClub, bytes = JSON.stringify(top);
    const input: CareerState = { ...top, jobHunt: { open: { club: 'Barcelona', league: 'La Liga', tier: 1, season: top.season,
      week: 0, matchesLeft: 0, roll: 0, status: 'accepted' }, cooldowns: [], sentSeason: top.season, sent: 1, summerMove: null } };
    const joined = joinClubNow(input)!;
    expect(joined).not.toBeNull(); expect(joined.clubName).toBe('Barcelona'); expect(joined.customClub).toBeUndefined(); realWorld(joined);
    expect(leagueOf(proxy).id).toBe('premier');
    expect(joined.uclField).toContain(proxy);
    expect(joined.uclField).not.toContain(top.clubName);
    expect(applyTargets(joined).some(row => row.club === proxy)).toBe(true);
    expect(Object.values(joined.world ?? {}).flatMap(row => row.table.map(entry => entry.club))).not.toContain(top.clubName);
    expect(joined.leagueOverrides).toEqual(top.leagueOverrides);
    expect(JSON.stringify(top)).toBe(bytes);
  });
});

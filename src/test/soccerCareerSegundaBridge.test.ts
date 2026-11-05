import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CareerState, ClubData, ContractOffer, SeasonRecord } from '@/lib/soccerCareerEngine';

const imports = vi.hoisted(() => {
  const original = Math.random, values: number[] = [];
  let state = 7391;
  Math.random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const value = state / 4294967296; values.push(value); return value;
  };
  return { values, restore: () => { Math.random = original; } };
});

import * as E from '@/lib/soccerCareerEngine';
import { adjustClubsForYear } from '@/lib/careerEras';
import { CAREER_CLUB_POOL, CAREER_LEAGUE_LADDER, CAREER_POOL_SINCE } from '@/data/soccerCareerClubPool';
import { clubKeyOf, finishLeagueWorld, leagueWorldForYear, projectLeagueWorldClubs, recordLeagueWorldSeason } from '@/lib/soccerCareerLeagueWorld';
import { cupAssociation, cupFor, cupOpponentPool, readCupRun } from '@/lib/soccerCareerCup';
import { isSoccerCareerSave, parseSoccerCareerSave, serializeSoccerCareerSave } from '@/lib/soccerCareerSave';
imports.restore();

const names = ['Real Oviedo', 'Mallorca', 'Eibar', 'Castellon', 'Almeria', 'Burgos', 'Sabadell', 'Sporting Gijon',
  'Granada', 'Las Palmas', 'Tenerife', 'Leganes', 'Valladolid', 'Cordoba', 'Eldense', 'Cadiz', 'FC Andorra', 'Ceuta', 'Albacete'];
const ids = ['cm-real-oviedo', 'cm-mallorca', 'cm-eibar', 'cm-castellon', 'cm-almeria', 'cm-burgos', 'cm-sabadell',
  'cm-sporting-gijon', 'cm-granada', 'cm-las-palmas', 'cm-tenerife', 'cm-leganes', 'cm-valladolid', 'cm-cordoba',
  'cm-eldense', 'cm-cadiz', 'cm-fc-andorra', 'cm-ceuta', 'cm-albacete'];
const palettes: Record<string, string> = {
  Castellon: '#2b2b2b', Burgos: '#d9d9d9', Sabadell: '#1b458f', Tenerife: '#1b458f', Leganes: '#1b458f',
  Cordoba: '#0a7040', Eldense: '#7d1c2a', 'FC Andorra': '#1b458f', Ceuta: '#d9d9d9', Albacete: '#d9d9d9',
};
const legacyGenerated = CAREER_CLUB_POOL.filter(club => !ids.includes(club.id));
const legacyClubs = [...E.HAND_CLUBS, ...legacyGenerated];
const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
type Draw = { value: number; sites: string[] };
function trace<T>(seed: number, action: () => T): { result: T; draws: Draw[] } {
  let state = seed >>> 0;
  const draws: Draw[] = [];
  const random = vi.spyOn(Math, 'random').mockImplementation(() => {
    if (draws.length === 8192) throw new Error('Unbounded Segunda fixture draw');
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const value = state / 4294967296;
    const sites = (new Error().stack ?? '').split('\n').filter(line =>
      /[\\/]src[\\/]/.test(line) && !/[\\/]src[\\/]test[\\/]/.test(line))
      .map(line => line.trim().replace(/.*[\\/]src[\\/]/, 'src/').replace(/\\/g, '/').replace(/:\d+:\d+/g, ''));
    draws.push({ value, sites }); return value;
  });
  try { return { result: action(), draws }; } finally { random.mockRestore(); }
}
function retain(name: string, value: unknown): void {
  if (!process.env.SEGUNDA_EVIDENCE_DIR) return;
  mkdirSync(process.env.SEGUNDA_EVIDENCE_DIR, { recursive: true });
  writeFileSync(join(process.env.SEGUNDA_EVIDENCE_DIR, name + '.json'), JSON.stringify({ importDraws: imports.values, value }, null, 2) + '\n');
}
function create(nationality = 'Spain', year = 2020, overall = 66): CareerState {
  const stats = { pace: overall, shooting: overall, passing: overall, dribbling: overall, defending: overall, physical: overall, reflexes: overall };
  return E.repairCareer(E.initCareer('Segunda Fixture', nationality, 'CM', '2020s', stats, overall, year, E.FALLBACK_CLUBS, null, 90));
}
function saved(state: CareerState) {
  const input = JSON.stringify(state), bytes = serializeSoccerCareerSave(state);
  const parsed = parseSoccerCareerSave(bytes), valid = isSoccerCareerSave(parsed);
  const loaded = valid ? E.repairCareer(json(parsed) as CareerState) : null;
  return { input, bytes, parsed: json(parsed), valid, loaded: json(loaded), inputAfter: JSON.stringify(state) };
}
function pro(state: CareerState, year = 2026): CareerState {
  const club = E.HAND_CLUBS.find(row => row.name === 'Real Madrid')!;
  const signed = E.acceptOffer(json(state), { club, contractYears: 4, wage: 10000, transferFee: 0 });
  return E.repairCareer({ ...signed, age: 22, phase: 'playing', agentId: 'self', personality: 'professor',
    seasons: [{ ...signed.seasons[0], year, age: 22, club: club.name, clubCountry: club.country, clubTier: club.tier,
      type: 'playing', apps: 12, leagueApps: 10, rating: 6.4 }] });
}
function row(state: CareerState, club: string, year: number): SeasonRecord {
  return { ...state.seasons[0], year, age: 22, club, clubCountry: club === 'FC Andorra' ? 'Andorra' : 'Spain',
    clubTier: 4, type: 'playing', apps: 48, leagueApps: 48, goals: 3, assists: 4, rating: 6.8,
    domesticCup: false, leagueTitle: false, cupRun: { stages: [{ stage: 'early', won: false }] } };
}
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-04T12:00:00Z')); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe('Soccer Career Segunda canonical bridge', () => {
  it('adds the nineteen current canonical academy clubs without rewriting the old pool', () => {
    const added = CAREER_CLUB_POOL.filter(club => ids.includes(club.id));
    const current = adjustClubsForYear(E.FALLBACK_CLUBS, 2026);
    const oldSince = Object.fromEntries(Object.entries(CAREER_POOL_SINCE).filter(([name]) => !names.includes(name)));
    const oldLadder = Object.fromEntries(Object.entries(CAREER_LEAGUE_LADDER).filter(([league]) => league !== 'Segunda Division'));
    retain('canonical', { hand: E.HAND_CLUBS, generated: CAREER_CLUB_POOL, current, added, ladder: CAREER_LEAGUE_LADDER,
      since: CAREER_POOL_SINCE, legacy: { hand: E.HAND_CLUBS, generated: legacyGenerated, oldSince, oldLadder } });
    expect(added.map(club => club.id), 'SC_SEGUNDA_CANONICAL_POOL').toEqual(ids);
    expect(added.map(club => club.name)).toEqual(names);
    expect(E.HAND_CLUBS).toHaveLength(190); expect(legacyGenerated).toHaveLength(307);
    expect(CAREER_CLUB_POOL.slice(0, 307)).toEqual(legacyGenerated);
    expect(CAREER_CLUB_POOL).toHaveLength(326); expect(E.FALLBACK_CLUBS).toHaveLength(516);
    expect(E.FALLBACK_CLUBS.filter(club => club.name === 'Girona').map(club => club.id)).toEqual(['fb-96']);
    for (const club of added) {
      expect(club.league).toBe('Segunda Division'); expect(club.tier).toBe(4);
      expect(club.country).toBe(club.name === 'FC Andorra' ? 'Andorra' : 'Spain');
      expect(CAREER_POOL_SINCE[club.name]).toBe(2026);
      expect(current.some(candidate => candidate.id === club.id)).toBe(true);
      expect(adjustClubsForYear(E.FALLBACK_CLUBS, 2025).some(candidate => candidate.id === club.id)).toBe(false);
      expect(E.FALLBACK_CLUBS.filter(candidate => candidate.country === club.country && candidate.tier >= 3)).toContainEqual(club);
      if (palettes[club.name]) expect(club.color).toBe(palettes[club.name]);
      expect(club.color).not.toBe('#8899aa');
    }
  });

  it('places an eligible Andorran academy player and signs the actual parent first-team offer', () => {
    const setup = trace(1101, () => create('Andorra', 2026, 50));
    const input = JSON.stringify(setup.result);
    const youth = trace(1102, () => E.advanceYouthYear(json(setup.result), E.FALLBACK_CLUBS));
    const offer = youth.result.pendingOffers.find(candidate => candidate.isHomegrown)!;
    const signing = trace(1103, () => E.acceptOffer(json(youth.result), offer));
    const reload = trace(1104, () => saved(signing.result));
    retain('academy', { setup, input, inputAfter: JSON.stringify(setup.result), youth, offer, signing, reload });
    expect(setup.result.academyClubName, 'SC_SEGUNDA_ACADEMY_PARENT').toBe('FC Andorra');
    expect(setup.result.currentClub).toBe('FC Andorra Youth'); expect(setup.result.currentClubCountry).toBe('Andorra');
    expect(youth.result.phase).toBe('contract_offer');
    expect(offer.club).toEqual({ id: 'cm-fc-andorra', name: 'FC Andorra', country: 'Andorra', tier: 4, color: '#1b458f', league: 'Segunda Division' });
    expect(offer.isHomegrown).toBe(true); expect(offer.transferFee).toBe(0);
    expect(signing.result.currentClub).toBe('FC Andorra'); expect(signing.result.currentClubCountry).toBe('Andorra');
    expect(signing.result.currentLeague).toBe('Segunda Division'); expect(signing.result.phase).toBe('playing');
    expect(signing.result.contractYearsLeft).toBe(offer.contractYears); expect(signing.result.weeklyWage).toBe(offer.wage);
    expect(signing.result.pendingOffers).toEqual([]); expect(signing.result.seasons).toEqual(youth.result.seasons);
    expect(signing.result.events.some(event => event.includes('academy kid signs a first-team deal'))).toBe(true);
    expect(reload.result.valid).toBe(true); expect(reload.result.parsed).toEqual(json(signing.result));
    expect(reload.result.loaded).toEqual(json(signing.result)); expect(reload.result.inputAfter).toBe(reload.result.input);
    expect(reload.draws).toEqual([]); expect(JSON.stringify(setup.result)).toBe(input);
  });

  it('uses canonical profiles for the twenty existing lower-world destinations and real market actions', () => {
    const setup = trace(1201, () => pro(create()));
    const before = JSON.stringify(setup.result);
    const projection = trace(1202, () => projectLeagueWorldClubs(json(setup.result), E.FALLBACK_CLUBS, 2026));
    const expected = [...names, 'Girona'], keys = expected.map(clubKeyOf);
    const lower = projection.result.filter(club => keys.includes(clubKeyOf(club.name)));
    const loans = trace(1203, () => E.determineLoanOffers(json(setup.result), E.FALLBACK_CLUBS));
    const transfer = trace(1204, () => E.requestTransfer(json(setup.result), E.FALLBACK_CLUBS));
    const loanSigned = trace(1205, () => loans.result?.[0] ? saved(E.acceptLoan(json(setup.result), loans.result[0])) : null);
    const transferSigned = trace(1206, () => transfer.result.type === 'request_result' && transfer.result.offer
      ? saved(E.acceptOffer(json(setup.result), transfer.result.offer)) : null);
    const world = trace(1207, () => leagueWorldForYear(json(setup.result), E.FALLBACK_CLUBS, 2026));
    retain('world', { setup, before, after: JSON.stringify(setup.result), projection, lower, loans, transfer, loanSigned, transferSigned,
      held: { world, projectionDraws: projection.draws } });
    expect(lower.filter(club => ids.includes(club.id)).map(club => club.id), 'SC_SEGUNDA_CANONICAL_WORLD').toEqual(ids);
    expect(lower).toHaveLength(20); expect(new Set(lower.map(club => clubKeyOf(club.name))).size).toBe(20);
    for (const club of lower) {
      expect(projection.result.filter(candidate => clubKeyOf(candidate.name) === clubKeyOf(club.name))).toHaveLength(1);
      expect(club.id).not.toMatch(/^career-lower-/);
    }
    expect(lower.find(club => club.name === 'FC Andorra')?.country).toBe('Andorra');
    expect(loans.result?.length).toBeGreaterThan(0); expect(loanSigned.result?.valid).toBe(true);
    expect(loanSigned.result?.loaded?.loan?.parentClub).toBe('Real Madrid');
    if (transferSigned.result) expect(transferSigned.result.valid).toBe(true);
    expect(projection.draws).toEqual([]); expect(world.draws).toEqual([]); expect(JSON.stringify(setup.result)).toBe(before);
  });

  it('holds historical pools Girona and the first manager-job boundary before 2026', () => {
    const years = [1990, 2010, 2025];
    const historical = years.map(year => ({ year, clubs: adjustClubsForYear(E.FALLBACK_CLUBS, year),
      reference: adjustClubsForYear(legacyClubs, year), manager: E.FALLBACK_CLUBS.filter(club => E.managerEntryClubInYear(club, year)) }));
    const setup = trace(1301, () => { const state = create('Spain', 2010); state.retired = true; return state; });
    const manager = trace(1302, () => E.choosePostRetirement(json(setup.result), 'manager', E.FALLBACK_CLUBS));
    retain('history', { held: { historical, setup, manager } });
    expect(historical.every(vector => JSON.stringify(vector.clubs) === JSON.stringify(vector.reference)), 'SC_SEGUNDA_HISTORY_HELD').toBe(true);
    for (const vector of historical) {
      expect(vector.clubs.some(club => ids.includes(club.id))).toBe(false);
      expect(vector.manager.some(club => ids.includes(club.id))).toBe(false);
      expect(vector.clubs.filter(club => club.name === 'Girona').map(club => club.id)).toEqual(['fb-96']);
    }
    expect(manager.result.phase).toBe('manager_season');
    expect(names).not.toContain(manager.result.managerState?.club);
    expect(manager.result.seasons).toEqual(setup.result.seasons);
  });

  it('keeps Andorra as home country while recording the scoped Spanish cup context', () => {
    const association = (country: string, league: string, year?: number) =>
      Reflect.apply(cupAssociation, undefined, year === undefined ? [country, league] : [country, league, year]) as string;
    const resolved = ['Segunda Division', 'La Liga'].map(league => association('Andorra', league, 2027));
    const setup = trace(1401, () => pro(create()));
    const oldRows: SeasonRecord[] = [
      { ...row(setup.result, 'FC Andorra', 2026), cupRun: { stages: [{ stage: 'early', won: false }] } },
      { ...row(setup.result, 'Real Madrid', 2026), cupRun: { cup: 'Copa del Rey', stages: [{ stage: 'early', won: false }] } },
    ];
    const openingRow: SeasonRecord = { ...row(setup.result, 'Real Madrid', 2027), clubTier: 1,
      cupRun: { cup: 'Copa del Rey', stages: [{ stage: 'early', won: false }],
        opening: { opp: 'FC Andorra', country: 'Andorra', league: 'Segunda Division', won: false, for: 0, against: 1, home: true } } };
    const openingRead = readCupRun(openingRow);
    const repaired = trace(1402, () => saved({ ...json(setup.result), seasons: [openingRow] }));
    const held = {
      contexts: [association('Andorra', 'Segunda Division'), association('Andorra', 'Segunda Division', 2025),
        association('Andorra', 'Fictional Domestic League', 2027), association('Wales', 'Championship', 2027),
        association('Monaco', 'Ligue 1', 2027), association('Spain', 'La Liga', 2027)],
      invalidYears: ([['undefined', undefined], ['NaN', NaN], ['Infinity', Infinity], ['fraction', 2026.5], ['unsafe', Number.MAX_SAFE_INTEGER + 1]] as [string, number | undefined][])
        .map(([label, year]) => ({ label, result: Reflect.apply(cupAssociation, undefined, ['Andorra', 'Segunda Division', year]) as string })),
      oldRows, oldReads: oldRows.map(readCupRun),
      oldReloads: oldRows.map((season, index) => trace(1410 + index, () => saved({ ...json(setup.result), seasons: [season] }))),
    };
    const opponents = cupOpponentPool('Spain', 2027, 'Real Madrid', E.FALLBACK_CLUBS);
    retain('cup', { resolved, status: resolved.map(country => cupFor(country, 2027)), openingRow, openingRead, repaired, opponents, held });
    expect(resolved, 'SC_SEGUNDA_COUNTRY_CUP').toEqual(['Spain', 'Spain']);
    expect(resolved.map(country => cupFor(country, 2027))).toEqual([
      { kind: 'NAMED', association: 'Spain', name: 'Copa del Rey', legs: 1, decider: 'penalties' },
      { kind: 'NAMED', association: 'Spain', name: 'Copa del Rey', legs: 1, decider: 'penalties' },
    ]);
    expect(opponents.some(club => club.id === 'cm-fc-andorra' && club.country === 'Andorra')).toBe(true);
    expect(openingRead).toEqual(openingRow.cupRun); expect(repaired.result.loaded?.seasons[0].cupRun).toEqual(openingRow.cupRun);
    expect(repaired.result.loaded?.currentClubCountry).toBe('Spain');
    expect(held.contexts).toEqual(['Andorra', 'Andorra', 'Andorra', 'England', 'France', 'Spain']);
    expect(held.invalidYears.map(vector => vector.result)).toEqual(['Andorra', 'Andorra', 'Andorra', 'Andorra', 'Andorra']);
    expect(held.oldReads).toEqual(oldRows.map(season => season.cupRun));
    held.oldReloads.forEach((reload, index) => expect(reload.result.loaded?.seasons[0].cupRun).toEqual(oldRows[index].cupRun));
  });

  it('holds loaded neutral offer IDs complete saved frames and the partial Spanish world', () => {
    // This is the actual original projected profile, embedded in a declared saved-offer fixture.
    const oldClub: ClubData = { id: 'career-lower-fc-andorra', name: 'FC Andorra', country: 'Andorra', tier: 4, color: '#64748b', league: 'Segunda Division' };
    const setup = trace(1501, () => pro(create()));
    const offer: ContractOffer = { club: oldClub, contractYears: 3, wage: 7000, transferFee: 1.5 };
    const loan: ContractOffer = { club: oldClub, contractYears: 1, wage: setup.result.weeklyWage, transferFee: 0, isLoan: true };
    const input = { ...json(setup.result), pendingOffers: [offer], pendingLoanOffers: [loan] };
    const reload = trace(1502, () => saved(input));
    const loaded = reload.result.loaded!;
    const signing = trace(1503, () => saved(E.acceptOffer(json(loaded), loaded.pendingOffers[0])));
    const loanSigning = trace(1504, () => saved(E.acceptLoan(json(loaded), loaded.pendingLoanOffers![0])));
    const pureWorld = trace(1505, () => {
      const state = json(signing.result.loaded!), world = leagueWorldForYear(state, E.FALLBACK_CLUBS, 2026)!;
      state.leagueWorld = world;
      const played = row(state, 'FC Andorra', 2026);
      recordLeagueWorldSeason(state, E.FALLBACK_CLUBS, played);
      const before = JSON.stringify(played), next = finishLeagueWorld(world, state.playerName, E.FALLBACK_CLUBS);
      return { world, played, before, after: JSON.stringify(played), next };
    });
    retain('savedOffers', { setup, oldClub, input, reload, signing, loanSigning, pureWorld });
    expect(reload.result.parsed, 'SC_SEGUNDA_SAVE_HELD').toEqual(json(input));
    expect(reload.result.valid).toBe(true); expect(loaded).toEqual(json(input));
    expect(signing.result.valid).toBe(true); expect(loanSigning.result.valid).toBe(true);
    expect(loaded.pendingOffers[0].club.id).toBe('career-lower-fc-andorra');
    expect(loaded.pendingLoanOffers![0].club.id).toBe('career-lower-fc-andorra');
    expect(signing.result.loaded?.currentClub).toBe('FC Andorra');
    expect(signing.result.loaded?.currentClubColor).toBe('#64748b'); expect(signing.result.loaded?.weeklyWage).toBe(7000);
    expect(signing.result.loaded?.currentClubCountry).toBe('Andorra'); expect(signing.result.loaded?.seasons).toEqual(input.seasons);
    expect(loanSigning.result.loaded?.loan?.parentClub).toBe('Real Madrid');
    expect(loanSigning.result.loaded?.currentClubColor).toBe('#64748b');
    expect(pureWorld.result.played.leagueApps).toBe(38); expect(pureWorld.result.played.leagueSize).toBe(20);
    expect(pureWorld.result.played.leagueWorld?.simulation).toBe('simulated-partial');
    expect(pureWorld.result.world.leagues['Segunda Division']).toHaveLength(20);
    expect(pureWorld.result.next.leagues['Segunda Division']).toHaveLength(20);
    expect(pureWorld.result.next.movements.filter(move => move.from === 'Segunda Division' && move.to === 'La Liga')).toHaveLength(3);
    expect(pureWorld.result.next.movements.filter(move => move.from === 'La Liga' && move.to === 'Segunda Division')).toHaveLength(3);
    expect(pureWorld.result.after).toBe(pureWorld.result.before);
    expect(reload.draws).toEqual([]); expect(signing.draws).toEqual([]); expect(loanSigning.draws).toEqual([]); expect(pureWorld.draws).toEqual([]);
    expect(JSON.stringify(input)).toBe(reload.result.inputAfter);
  });
});

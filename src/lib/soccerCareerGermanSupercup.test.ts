import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SeasonRecord } from './soccerCareerEngine';
import {
  captureGermanSupercup, playGermanSupercup, readGermanSupercup, germanSupercupPlayerSide,
  germanSupercupSeasonStats, careerOpeningAnnualStats, germanSupercupWinningSeasons, countGermanSupercups,
  playCommunityShield, readCommunityShield, communityShieldAnnualStats,
  type GermanSupercupReadyQualification, type GermanSupercupResult, type GermanSupercupOpeningInput,
  type CommunityShieldQualification,
} from './soccerCareerExtraCups';

const copy = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const raw = (v: unknown) => v as Record<string, unknown>;
// The remaining16 labels form a synthetic complete input, not a real Bundesliga roster.
const order = ['Bayern Munich', 'Dortmund', ...Array.from({ length: 16 }, (_, i) => 'QA German club ' + (i + 1))];
afterEach(() => vi.restoreAllMocks());
function ready(year = 2027, cup = 'Dortmund'): GermanSupercupReadyQualification {
  const q = captureGermanSupercup({ qualifyingYear: year - 1, worldYear: year - 1, seed: 0,
    germanOrder: order, leagueWinner: order[0], cupWinner: cup, cupSource: 'phone-world' });
  expect(q?.status, 'the labelled complete domain fixture must qualify').toBe('ready');
  return q as GermanSupercupReadyQualification;
}
function input(): GermanSupercupOpeningInput {
  return { qualification: ready(), eventYear: 2027, playerName: 'German domain fixture', club: 'Bayern Munich',
    clubCountry: 'Germany', position: 'ST', overall: 85, selectionChance: 1, unavailableReason: null,
    teamStrengths: [4.5, 3.5], englishOpening: null };
}
function saved(year = 2027): SeasonRecord {
  const q = ready(year);
  const match: GermanSupercupResult = {
    version: 1, competition: 'german-supercup', qualifyingYear: year - 1, eventYear: year, seed: 0,
    qualification: q, entrants: copy(q.entrants), minutes: 90, score: [2, 1], decidedBy: 'normal-time',
    winner: 'Bayern Munich', annualRating: 7.2,
    player: { club: 'Bayern Munich', availability: 'available', selected: true, apps: 1, goals: 1,
      assists: 0, cleanSheets: 0, rating: 8, title: true },
  };
  return { year, age: 23, type: 'playing', club: 'Bayern Munich', clubCountry: 'Germany', clubTier: 1,
    apps: 43, leagueApps: 34, goals: 15, assists: 9, cleanSheets: 0, rating: 7.2,
    yellowCards: 2, redCards: 0, leagueTitle: false, domesticCup: false, championsLeague: false,
    worldCup: false, ballonDor: false, ballonDorRank: null, intApps: 0, intGoals: 0, intAssists: 0, intRating: 0,
    tournament: null, tournamentResult: null, germanSupercup: match };
}
function english(club = 'Bayern Munich', represented = false) {
  const q: CommunityShieldQualification = {
    version: 1, competition: 'community-shield', status: 'ready', qualifyingYear: 2026, eventYear: 2027, seed: 0,
    leagueWinner: represented ? club : 'Arsenal', cupWinner: 'Newcastle',
    entrants: [{ club: represented ? club : 'Arsenal', via: 'league-winner' }, { club: 'Newcastle', via: 'fa-cup-winner' }],
    proof: { league: { kind: 'league-world-close', year: 2026 }, cup: { kind: 'phone-world', year: 2026 } },
  };
  return playCommunityShield({ ...input(), qualification: q, club, selectionChance: 0 });
}

describe('Soccer Career German Supercup domain', () => {
  it('SC_GERMAN_DOMAIN_CAPTURE: binds18 actual-order inputs, the double runner-up and a lower-division cup winner', () => {
    const original = { qualifyingYear: 2026, worldYear: 2026, seed: 0, germanOrder: order,
      leagueWinner: order[0], cupWinner: order[1], cupSource: 'phone-world' as const };
    const held = JSON.stringify(original), q = captureGermanSupercup(original);
    expect(q?.status, 'SC_GERMAN_DOMAIN_CAPTURE_MISSING').toBe('ready');
    expect(q).toEqual(ready()); expect(JSON.stringify(original)).toBe(held);
    const double = captureGermanSupercup({ ...original, cupWinner: order[0] }) as GermanSupercupReadyQualification;
    expect(double.runnerUp).toBe(order[1]); expect(double.entrants[1]).toEqual({ club: order[1], via: 'league-runner-up' });
    expect(double.proof.runnerUp).toEqual({ kind: 'league-world-close', year: 2026 });
    const lower = captureGermanSupercup({ ...original, cupWinner: 'QA lower-division cup winner', cupSource: 'validated-player-dfb-pokal' }) as GermanSupercupReadyQualification;
    expect(lower.entrants[1]).toEqual({ club: 'QA lower-division cup winner', via: 'dfb-pokal-winner' });
    expect(lower.proof.cup.kind).toBe('validated-player-dfb-pokal');
  });
  it('SC_GERMAN_DOMAIN_PARTIAL: refuses incomplete, mismatched, duplicate and pre-world qualification', () => {
    const base = { qualifyingYear: 2026, worldYear: 2026, seed: 0, germanOrder: order,
      leagueWinner: order[0], cupWinner: order[1], cupSource: 'phone-world' as const };
    for (const changes of [{ worldYear: 2027 }, { seed: undefined }, { seed: 4294967296 }, { germanOrder: order.slice(1) },
      { germanOrder: [...order.slice(0, 17), order[0]] }, { leagueWinner: order[1] }, { cupWinner: undefined }]) {
      expect(captureGermanSupercup({ ...base, ...changes })?.status, 'SC_GERMAN_DOMAIN_PARTIAL_MISSING').toBe('partial');
    }
    expect(captureGermanSupercup({ ...base, qualifyingYear: 2025, worldYear: 2025 })).toBeNull();
  });
  it('SC_GERMAN_DOMAIN_PLAY: keeps team outcome independent of player selection and preserves all inputs', () => {
    const a = input(), held = JSON.stringify(a), first = playGermanSupercup(a);
    expect(first, 'SC_GERMAN_DOMAIN_PLAY_MISSING').not.toBeNull();
    expect(first!.player.apps).toBe(1); expect(first!.player.selected).toBe(true);
    const bench = playGermanSupercup({ ...a, playerName: 'Other player', position: 'GK', overall: 30, selectionChance: 0 });
    expect(bench).not.toBeNull(); expect(bench!.player.apps).toBe(0); expect(bench!.player.title).toBe(false);
    expect([bench!.score, bench!.penalties, bench!.winner]).toEqual([first!.score, first!.penalties, first!.winner]);
    expect(playGermanSupercup(a)).toEqual(first); expect(JSON.stringify(a)).toBe(held);
    expect(raw(first).home).toBeUndefined(); expect(raw(first).neutral).toBeUndefined();
    if (first!.decidedBy === 'penalties') {
      expect(first!.score[0]).toBe(first!.score[1]); expect(first!.penalties![0]).not.toBe(first!.penalties![1]);
    } else expect(first!.score[0]).not.toBe(first!.score[1]);
  });
  it('SC_GERMAN_DOMAIN_IDENTITY: binds Germany and canonical entrant identity without granting nonentrants', () => {
    const a = input();
    expect(playGermanSupercup({ ...a, clubCountry: 'England' }), 'SC_GERMAN_DOMAIN_COUNTRY_MISSING').toBeNull();
    expect(playGermanSupercup({ ...a, club: 'QA nonentrant' })).toBeNull();
    const alias = playGermanSupercup({ ...a, club: ' BAYERN MUNICH ' });
    expect(alias).not.toBeNull(); expect(germanSupercupPlayerSide(alias!)).toBe(0);
    const blocked = playGermanSupercup({ ...a, unavailableReason: 'unresolved-rehab' });
    expect(blocked!.player).toMatchObject({ availability: 'unknown', selected: false, apps: 0, title: false });
    const row = saved(); row.clubCountry = 'England';
    expect(readGermanSupercup(row)).toBeNull();
  });
  it('SC_GERMAN_DOMAIN_READER: refuses malformed proof, score, contribution, grade and invented venue', () => {
    const row = saved(), held = JSON.stringify(row);
    expect(readGermanSupercup(row), 'SC_GERMAN_DOMAIN_READER_MISSING').toEqual(row.germanSupercup);
    const changes: ((v: SeasonRecord) => void)[] = [
      v => { raw(v.germanSupercup).version = 2; }, v => { v.germanSupercup!.qualification.seed = 1; },
      v => { v.germanSupercup!.qualification.proof.cup.year--; }, v => { v.germanSupercup!.entrants[1].via = 'league-winner'; },
      v => { v.germanSupercup!.eventYear++; }, v => { v.germanSupercup!.score = [1, 1]; },
      v => { v.germanSupercup!.player.goals = 3; }, v => { delete v.germanSupercup!.annualRating; },
      v => { v.germanSupercup!.annualRating = 6.2; }, v => { raw(v.germanSupercup).neutral = true; },
      v => { raw(v.germanSupercup).home = false; }, v => { v.germanSupercup!.player.club = 'Dortmund'; },
    ];
    for (const change of changes) { const broken = copy(row); change(broken); expect(readGermanSupercup(broken)).toBeNull(); }
    const pens = copy(row); pens.germanSupercup!.score = [1, 1]; pens.germanSupercup!.decidedBy = 'penalties';
    pens.germanSupercup!.penalties = [5, 4]; expect(readGermanSupercup(pens)).not.toBeNull();
    pens.germanSupercup!.penalties = [5, 0]; expect(readGermanSupercup(pens)).toBeNull();
    expect(JSON.stringify(row)).toBe(held);
  });
  it('SC_GERMAN_DOMAIN_COEXIST: accepts English world-only evidence and rejects represented or malformed English', () => {
    const row = saved(), worldOnly = english();
    expect(worldOnly).not.toBeNull(); row.extraCups = [worldOnly!];
    const held = JSON.stringify(row);
    expect(readCommunityShield(row)).toEqual(worldOnly);
    expect(readGermanSupercup(row), 'SC_GERMAN_DOMAIN_COEXIST_MISSING').not.toBeNull();
    expect(careerOpeningAnnualStats(row)).toEqual({ apps: 42, goals: 14, assists: 9, cleanSheets: 0, rating: 7.2 });
    expect(playGermanSupercup({ ...input(), englishOpening: worldOnly })).not.toBeNull();
    const represented = english('Bayern Munich', true);
    expect(playGermanSupercup({ ...input(), englishOpening: represented })).toBeNull();
    for (const evidence of [undefined, null, [], [represented], [worldOnly, worldOnly]]) {
      const bad = copy(row); raw(bad).extraCups = evidence; expect(readGermanSupercup(bad)).toBeNull();
    }
    expect(JSON.stringify(row)).toBe(held);
  });
  it('SC_GERMAN_DOMAIN_ANNUAL: forward-verifies the one cup contribution and fails missing proof closed', () => {
    const row = saved(), annual = { apps: 42, goals: 14, assists: 9, cleanSheets: 0, rating: 7.2 };
    expect(careerOpeningAnnualStats(row), 'SC_GERMAN_DOMAIN_ANNUAL_MISSING').toEqual(annual);
    expect(germanSupercupSeasonStats(annual, row.germanSupercup!)).toEqual({ apps: 43, goals: 15, assists: 9, cleanSheets: 0, rating: 7.2 });
    const legacy = copy(row); delete legacy.germanSupercup!.annualRating; expect(careerOpeningAnnualStats(legacy)).toBeNull();
    const absent = copy(row); delete absent.germanSupercup;
    expect(careerOpeningAnnualStats(absent)).toEqual(communityShieldAnnualStats(absent));
    raw(absent).germanSupercup = undefined; expect(careerOpeningAnnualStats(absent)).toBeNull();
    const zero = copy(row); Object.assign(zero, { apps: 1, leagueApps: 0, goals: 1, assists: 0, cleanSheets: 0, rating: 8 });
    zero.germanSupercup!.annualRating = 0;
    expect(careerOpeningAnnualStats(zero)).toEqual({ apps: 0, goals: 0, assists: 0, cleanSheets: 0, rating: 0 });
    zero.germanSupercup!.annualRating = 7.2; expect(careerOpeningAnnualStats(zero)).toBeNull();
  });
  it('SC_GERMAN_DOMAIN_TITLES: counts only unambiguous played wins in input order without mutation', () => {
    const won = saved(), loss = copy(won); loss.germanSupercup!.score = [1, 2]; loss.germanSupercup!.winner = 'Dortmund'; loss.germanSupercup!.player.title = false;
    expect(readGermanSupercup(loss)).not.toBeNull();
    expect(countGermanSupercups([won]), 'SC_GERMAN_DOMAIN_TITLES_MISSING').toBe(1);
    expect(countGermanSupercups([won, loss])).toBe(0);
    const corrupt = copy(won); raw(corrupt.germanSupercup).version = 2;
    expect(countGermanSupercups([corrupt, won])).toBe(1);
    const later = saved(2029), rows = [later, won], held = JSON.stringify(rows);
    expect(germanSupercupWinningSeasons(rows)).toEqual(rows); expect(JSON.stringify(rows)).toBe(held);
    const bench = copy(won); delete bench.germanSupercup!.annualRating; Object.assign(bench, { apps: 42, goals: 14 });
    bench.germanSupercup!.player = { club: 'Bayern Munich', availability: 'available', selected: false, apps: 0, goals: 0, assists: 0, cleanSheets: 0, rating: null, title: false };
    expect(readGermanSupercup(bench)).not.toBeNull(); expect(countGermanSupercups([bench])).toBe(0);
  });
  it('SC_GERMAN_DOMAIN_GLOBAL: consumes no mainstream random draws during actual match generation', () => {
    const a = input(), native = Math.random, held = JSON.stringify(a);
    const spy = vi.spyOn(Math, 'random').mockImplementation(() => native());
    let calls = -1, result: GermanSupercupResult | null = null;
    try { result = playGermanSupercup(a); calls = spy.mock.calls.length; } finally { spy.mockRestore(); }
    expect(result).not.toBeNull();
    expect(calls, 'SC_GERMAN_DOMAIN_GLOBAL_DRAW_MISSING').toBe(0);
    expect(JSON.stringify(a)).toBe(held);
  });
});

import { describe, expect, it } from 'vitest';
import { nrlBoardBenchmark, nrlBoardTarget } from '@/lib/nrlBoardTarget';
import {
  createNrlCareer, nrlAcademyReports, nrlCareerCap, nrlCareerFinance, nrlCareerSquad, nrlMedicalUpgradeQuote, nrlOffseasonClubs,
  nrlOffseasonOpportunities, readNrlCareerSave, reduceNrlCareer, type NrlCareerState,
} from '@/lib/nrlCareer';
import { NRL_LAST_YEAR } from '@/data/nrlManagerSeasons';
import { createNrlSeason, nrlLadder, NRL_ROLES, reduceNrlSeason } from '@/lib/nrlManager';

const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const stay = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'startNextSeason' });
const move = (state: NrlCareerState, clubId: string, fromYear = state.season.year) =>
  reduceNrlCareer(state, { type: 'startNextSeason', move: { fromYear, clubId } });
const upgrade = (state: NrlCareerState, level: 2 | 3) => reduceNrlCareer(state, { type: 'upgradeMedical', level });
const saved = (state: NrlCareerState) => readNrlCareerSave(JSON.stringify(state));
const sameSave = (state: NrlCareerState) => JSON.stringify(saved(state)) === JSON.stringify(state);

function finish(state: NrlCareerState) {
  while (state.season.phase !== 'complete') state = advance(state);
  return state;
}

describe('NRL Manager offseason club moves', () => {
  it('uses the finished simulated draw to suggest only the largest misses and the actual expansion opening', () => {
    const season2026 = finish(createNrlCareer('storm', 4));
    const raw = JSON.stringify(season2026);
    expect(nrlOffseasonOpportunities(season2026)).toEqual([
      { clubId: 'bears', nextTarget: 'Finish in the top twelve', reason: 'expansion' },
      { clubId: 'roosters', nextTarget: 'Reach the finals', reason: 'missed', rank: 8, missedBy: 4 },
      { clubId: 'dolphins', nextTarget: 'Finish in the top four', reason: 'missed', rank: 10, missedBy: 2 },
    ]);
    expect(nrlOffseasonOpportunities(readNrlCareerSave(raw)!)).toEqual(nrlOffseasonOpportunities(season2026));
    expect(JSON.stringify(season2026)).toBe(raw);
    const ordinaryMove = move(season2026, 'bulldogs');
    expect(ordinaryMove.season.clubId).toBe('bulldogs');
    expect(stay(season2026).season.clubId).toBe('storm');
    for (const opportunity of nrlOffseasonOpportunities(season2026)) {
      expect(nrlBoardTarget(move(season2026, opportunity.clubId))?.label).toBe(opportunity.nextTarget);
    }

    const season2027 = finish(createNrlCareer('bears', 14, 2027));
    expect(nrlOffseasonOpportunities(season2027)).toEqual([
      { clubId: 'chiefs', nextTarget: 'Finish above the bottom two', reason: 'expansion' },
      { clubId: 'dragons', nextTarget: 'Finish above the bottom two', reason: 'missed', rank: 18, missedBy: 2 },
      { clubId: 'sharks', nextTarget: 'Finish in the top four', reason: 'missed', rank: 5, missedBy: 1 },
    ]);
    expect(nrlOffseasonOpportunities(finish(stay(season2027))).some(row => row.reason === 'expansion')).toBe(false);
  });

  it('does not treat a champion, partial draw, retired career or terminal year as an available opening', () => {
    const started = createNrlCareer('storm', 5);
    expect(nrlOffseasonOpportunities(started)).toEqual([]);
    const finished = finish(started);
    expect(finished.season.championId).toBe('raiders');
    expect(nrlOffseasonOpportunities(finished).map(row => row.clubId)).toEqual(['bears', 'knights', 'dragons']);
    expect(nrlOffseasonOpportunities({ ...finished, retired: true })).toEqual([]);
    expect(nrlOffseasonOpportunities({ ...finished, season: { ...finished.season, year: NRL_LAST_YEAR } })).toEqual([]);
    const partial = { ...finished, season: { ...finished.season, results: finished.season.results.slice(1) } };
    expect(nrlOffseasonOpportunities(partial)).toEqual([{ clubId: 'bears', nextTarget: 'Finish in the top twelve', reason: 'expansion' }]);
  });

  it('uses verified legacy fixtures without inventing financial or staffing history', () => {
    let legacy = createNrlSeason('storm', 18);
    while (legacy.phase !== 'complete') legacy = reduceNrlSeason(legacy, { type: 'advance' });
    const imported = readNrlCareerSave(JSON.stringify(legacy))!;
    const raw = JSON.stringify(imported);
    const ladder = nrlLadder(legacy);
    const opportunities = nrlOffseasonOpportunities(imported);
    expect(opportunities[0]).toMatchObject({ clubId: 'bears', reason: 'expansion' });
    expect(opportunities.length).toBeGreaterThan(1);
    for (const row of opportunities.filter(row => row.reason === 'missed')) expect(ladder[row.rank - 1].clubId).toBe(row.clubId);
    expect(imported.history[0].finance).toBeNull();
    expect(JSON.stringify(imported)).toBe(raw);
  });

  it('takes over Perth in 2027 with its settled squad and leaves the outgoing club receipts and contracts intact', () => {
    const first = upgrade(createNrlCareer('storm', 1), 2);
    const hired = reduceNrlCareer(first, { type: 'hireCoach', role: 'attack', year: 2026, round: 1 });
    const scout = advance(reduceNrlCareer(hired, { type: 'scoutAcademy', role: 'Hooker' }));
    const prospectId = nrlAcademyReports(scout)[0].player!.id;
    const promoted = reduceNrlCareer(scout, { type: 'promoteAcademy', playerId: prospectId });
    expect(promoted).not.toBe(scout);
    const ended = finish(reduceNrlCareer(promoted, { type: 'setTactic', tactic: 'attack' }));
    const focused = reduceNrlCareer(ended, { type: 'setDevelopmentFocus', focus: 'youth' });
    const standard = stay(focused);
    const moved = move(focused, 'bears');

    expect(moved.season).toMatchObject({ clubId: 'bears', year: 2027, round: 1, phase: 'regular', tactic: 'balanced', preparation: null, results: [] });
    expect(moved.season.seed).toBe(ended.season.seed);
    expect(moved.season.bench).toHaveLength(6);
    expect(moved.season.kickerId).toBe(moved.season.lineup.Halfback);
    const squad = nrlCareerSquad(moved);
    expect(squad).toHaveLength(30);
    expect(squad.every(player => player.contract?.clubId === 'bears')).toBe(true);
    for (const role of NRL_ROLES) expect(squad.find(player => player.id === moved.season.lineup[role])?.role).toBe(role);
    expect(nrlCareerCap(moved).available).toBeGreaterThanOrEqual(0);

    expect(moved.players).toEqual(standard.players);
    expect(moved.players.find(player => player.id === prospectId)?.contract?.clubId).toBe('storm');
    expect(moved.history).toEqual(standard.history);
    expect(moved.history[0]).toMatchObject({ ...ended.history[0], development: { focus: 'youth' } });
    expect(moved.history[0].finance?.medicalUpgrades).toEqual([{ level: 2, round: 1 }]);
    expect(moved.history[0].finance?.coachHire?.paidRounds).toBe(31);
    expect(nrlCareerFinance(moved)).toMatchObject({ openingCash: 2_500_000, cash: 2_500_000, profit: 0 });
    expect(moved.finance.coachHire).toBeUndefined();
    expect(nrlMedicalUpgradeQuote(moved).level).toBe(1);
    expect(nrlBoardTarget(moved)).toMatchObject(nrlBoardBenchmark(2027, 'bears')!);
    expect(sameSave(moved)).toBe(true);
    const nextMatchday = advance(moved);
    expect(sameSave(nextMatchday)).toBe(true);
    const neutralFixtures = (state: NrlCareerState) => state.season.results.filter(result =>
      ![result.homeId, result.awayId].some(club => club === 'storm' || club === 'bears'));
    expect(neutralFixtures(nextMatchday).length).toBeGreaterThan(0);
    expect(neutralFixtures(nextMatchday)).toEqual(neutralFixtures(advance(standard)));
    expect(move(moved, 'bears', 2026) === moved).toBe(true);
  });

  it('opens the Chiefs in 2028 and resumes separate club books when returning to a previous employer', () => {
    const storm = finish(upgrade(createNrlCareer('storm', 5), 2));
    const perth = finish(upgrade(move(storm, 'bears'), 2));
    const chiefs = move(perth, 'chiefs');
    expect(chiefs.season.clubId).toBe('chiefs');
    expect(chiefs.season.year).toBe(2028);
    expect(chiefs.finance.openingCash).toBe(2_500_000);
    expect(nrlMedicalUpgradeQuote(chiefs).level).toBe(1);
    expect(sameSave(chiefs)).toBe(true);

    const stayed = stay(perth);
    expect(stayed.season.clubId).toBe('bears');
    expect(stayed.finance.openingCash).toBe(nrlCareerFinance(perth).cash);
    expect(nrlMedicalUpgradeQuote(stayed).level).toBe(2);
    expect(sameSave(stayed)).toBe(true);

    const [stormReceipt, perthReceipt] = chiefs.history;
    const forgedUpgrade = nrlCareerFinance({ finance: { ...perthReceipt.finance!, medicalUpgrades: [{ level: 3, round: 1 }] } });
    expect(saved({ ...chiefs, history: [stormReceipt, { ...perthReceipt, finance: forgedUpgrade }] })).toBeNull();

    expect(nrlCareerFinance(storm).cash).not.toBe(nrlCareerFinance(perth).cash);
    const returned = move(perth, 'storm');
    expect(returned.season.clubId).toBe('storm');
    expect(returned.finance.openingCash).toBe(nrlCareerFinance(storm).cash);
    expect(nrlMedicalUpgradeQuote(returned)).toMatchObject({ level: 2, nextLevel: 3 });
    expect(nrlBoardTarget(returned)).toMatchObject(nrlBoardBenchmark(2028, 'storm')!);
    expect(sameSave(returned)).toBe(true);

    const upgraded = upgrade(returned, 3);
    expect(upgraded.finance.medicalUpgrades).toEqual([{ level: 3, round: 1 }]);
    const backToPerth = move(finish(upgraded), 'bears');
    expect(backToPerth.finance.openingCash).toBe(nrlCareerFinance(perth).cash);
    expect(nrlMedicalUpgradeQuote(backToPerth)).toMatchObject({ level: 2, nextLevel: 3 });
    expect(backToPerth.history.map(row => row.clubId)).toEqual(['storm', 'bears', 'storm']);
    expect(sameSave(backToPerth)).toBe(true);
  });

  it('rejects moves during play, out of membership, to the same employer or with a stale origin year', () => {
    const started = createNrlCareer('storm', 9);
    expect(nrlOffseasonClubs(started)).toHaveLength(0);
    expect(move(started, 'bears') === started).toBe(true);
    const ended = finish(started);
    expect(nrlOffseasonClubs(ended).map(club => club.id)).toContain('bears');
    expect(nrlOffseasonClubs(ended).map(club => club.id)).not.toContain('chiefs');
    expect(move(ended, 'storm') === ended).toBe(true);
    expect(move(ended, 'chiefs') === ended).toBe(true);
    expect(move(ended, 'made-up-club') === ended).toBe(true);
    expect(move(ended, 'bears', 2025) === ended).toBe(true);
    const later = finish(stay(ended));
    expect(nrlOffseasonClubs(later).map(club => club.id)).toContain('chiefs');
    expect(move(later, 'bears', 2026) === later).toBe(true);
  });

  it('keeps an imported completed season untracked and refuses forged receipt ownership, cash and medical jumps', () => {
    let legacy = createNrlSeason('storm', 18);
    while (legacy.phase !== 'complete') legacy = reduceNrlSeason(legacy, { type: 'advance' });
    const imported = readNrlCareerSave(JSON.stringify(legacy))!;
    expect(imported.history[0].finance).toBeNull();
    const perth = move(imported, 'bears');
    expect(perth.season.clubId).toBe('bears');
    const { finals, ...receipt } = perth.history[0];
    expect([receipt]).toEqual(imported.history);
    expect(finals?.scores).toHaveLength(9);
    expect(perth.legacySeason).toBe(false);
    expect(sameSave(perth)).toBe(true);
    expect(saved({ ...perth, history: [{ ...perth.history[0], clubId: 'bears' }] })).toBeNull();
    expect(saved({ ...perth, finance: { ...perth.finance, openingCash: 3_000_000 } })).toBeNull();
    expect(saved({ ...perth, finance: { ...perth.finance, medicalUpgrades: [{ level: 3, round: 1 }] } })).toBeNull();

    const completed = finish(upgrade(perth, 2));
    expect(sameSave(completed)).toBe(true);
    const [old, actual] = completed.history;
    expect(saved({ ...completed, history: [old, { ...actual, clubId: 'storm' }] })).toBeNull();
    const returned = move(completed, 'storm');
    expect(returned.finance.openingCash).toBe(2_500_000);
    expect(saved({ ...returned, finance: { ...returned.finance, openingCash: actual.finance!.cash } })).toBeNull();
    const forged = { ...actual.finance!, openingCash: 3_000_000, cash: actual.finance!.cash + 500_000 };
    expect(saved({ ...returned, history: [old, { ...actual, finance: forged }] })).toBeNull();
    expect(sameSave(returned)).toBe(true);
  });
});

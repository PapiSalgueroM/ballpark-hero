import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  acceptOffer, advanceProSeason, applyEventChoice, calcOverall, dismissAppealResult,
  FALLBACK_CLUBS, initCareer, type CareerState, type SeasonRecord,
} from '@/lib/soccerCareerEngine';
import { serveClubSuspension, soccerCardLine } from '@/lib/soccerDiscipline';
import { deriveSeason, disagreements } from '@/lib/season/core';
import { buildSoccerSeasonCtx, SOCCER } from '@/lib/season/soccer';
import { keyedRng } from '@/lib/keyedRng';

const club = FALLBACK_CLUBS.find(c => c.name === 'Real Madrid')!;
const last = (state: CareerState) => state.seasons[state.seasons.length - 1];
function career(overall = 90): CareerState {
  const stats = { pace: overall, shooting: overall, passing: overall, dribbling: overall, defending: overall, physical: overall, reflexes: overall };
  const initial = initCareer('Discipline Tester', 'Brazil', 'ST', '2020s', stats, overall, 2020, FALLBACK_CLUBS, null, 99);
  return { ...acceptOffer(initial, { club, contractYears: 5, wage: 400000, transferFee: 0 }), age: 25, phase: 'playing', rival: null };
}
function eventState(): CareerState {
  return { ...career(), phase: 'random_events', pendingEvents: [
    { id: 9, title: 'Red Card Scandal!', description: '', category: 'negative', emoji: '🟥', choices: [] },
    { id: 10, title: 'Next event', description: '', category: 'negative', emoji: '💉', choices: [] },
  ] };
}
afterEach(() => vi.restoreAllMocks());

describe('Soccer discipline consequences', () => {
  it('accepts the existing three-match ban, reloads it, serves it once and keeps completed rows untouched', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.7);
    const before = eventState();
    const rows = JSON.stringify(before.seasons);
    const accepted = applyEventChoice(before, 0, FALLBACK_CLUBS);
    expect(accepted.pendingSuspensionMatches).toBe(3);
    expect(accepted.popularity).toBe(before.popularity - 5);
    expect(JSON.stringify(before.seasons)).toBe(rows);
    expect(JSON.stringify(accepted.seasons)).toBe(rows);
    const reloaded = JSON.parse(JSON.stringify(accepted)) as CareerState;
    const base = { ...reloaded, phase: 'playing' as const, pendingEvents: [], pendingSuspensionMatches: undefined };
    const normal = advanceProSeason(base, FALLBACK_CLUBS);
    const banned = advanceProSeason({ ...base, pendingSuspensionMatches: reloaded.pendingSuspensionMatches }, FALLBACK_CLUBS);
    const normalRow = last(normal);
    const bannedRow = last(banned);
    expect(bannedRow.apps).toBe(normalRow.apps - 3);
    expect(bannedRow.leagueApps).toBe(normalRow.leagueApps! - 3);
    expect(bannedRow.suspensionMatches).toBe(3);
    expect(banned.pendingSuspensionMatches).toBeUndefined();
    expect(JSON.stringify(banned.seasons.slice(0, -1))).toBe(rows);
    const next = advanceProSeason({ ...banned, phase: 'playing', pendingBallonDor: null }, FALLBACK_CLUBS);
    expect(last(next)?.suspensionMatches).toBeUndefined();
  });

  it('shows an appeal before remaining events, queues a rejected ban once and leaves a won appeal free to play', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.7);
    const rejected = applyEventChoice(eventState(), 1, FALLBACK_CLUBS);
    expect(rejected.phase).toBe('red_card_appeal_result');
    expect(rejected.pendingEvents).toHaveLength(1);
    expect(rejected.pendingSuspensionMatches).toBeUndefined();
    expect(rejected.pendingAppealResult?.success).toBe(false);
    const served = dismissAppealResult(rejected, FALLBACK_CLUBS);
    expect(served.pendingSuspensionMatches).toBe(rejected.pendingAppealResult?.banLength);
    expect(served.phase).toBe('random_events');
    expect(dismissAppealResult(served, FALLBACK_CLUBS).pendingSuspensionMatches).toBe(served.pendingSuspensionMatches);
    const won = dismissAppealResult({ ...rejected, pendingAppealResult: { success: true, banLength: 0 } }, FALLBACK_CLUBS);
    expect(won.pendingSuspensionMatches).toBeUndefined();
    expect(won.popularity).toBe(rejected.popularity);
    expect(won.pendingEvents).toHaveLength(1);
  });

  it('serves only actual club appearances and carries the rest without negative or invalid counters', () => {
    expect(serveClubSuspension(2, 2, 3)).toEqual({ apps: 0, leagueApps: 0, served: 2, remaining: 1 });
    for (const invalid of [undefined, -3, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(serveClubSuspension(30, 26, invalid)).toEqual({ apps: 30, leagueApps: 26, served: 0, remaining: 0 });
    }
    expect(serveClubSuspension(40, 34, 3)).toEqual({ apps: 37, leagueApps: 31, served: 3, remaining: 0 });
    expect(soccerCardLine(4, 2)).toBe('🟨 4 yellow cards · 🟥 2 red cards');
    expect(soccerCardLine(0, 1)).toBe('🟥 1 red card');
    expect(soccerCardLine(0, 0)).toBe('');
  });

  it('keeps all appearances suspended at zero goals and cards, including diving, without losing the existing card draw', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.01);
    const state = { ...career(40), frozenOut: 1, divingActive: true };
    const original = JSON.stringify(state);
    random.mockClear();
    const normal = advanceProSeason(JSON.parse(original) as CareerState, FALLBACK_CLUBS);
    const normalRow = last(normal);
    const draws = random.mock.calls.length;
    expect(normal.phase).toBe('rehab_choice');
    expect(normalRow.apps).toBeGreaterThan(0);
    expect(normalRow.redCards).toBe(1);
    random.mockClear();
    const next = advanceProSeason({ ...JSON.parse(original), pendingSuspensionMatches: normalRow.apps + 2 } as CareerState, FALLBACK_CLUBS);
    const bannedRow = last(next);
    expect(next.phase).toBe('rehab_choice');
    expect(bannedRow).toMatchObject({ apps: 0, leagueApps: 0, goals: 0, assists: 0,
      cleanSheets: 0, yellowCards: 0, redCards: 0, suspensionMatches: normalRow.apps });
    expect(next.pendingSuspensionMatches).toBe(2);
    expect(random.mock.calls.length).toBe(draws);
    expect(JSON.stringify(next.seasons.slice(0, -1))).toBe(JSON.stringify(state.seasons));
    expect(JSON.stringify(state)).toBe(original);
  });

  it('consumes a served ban on the severe injury branch without editing completed seasons', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01);
    const state = { ...career(), pendingSuspensionMatches: 3 };
    const rows = JSON.stringify(state.seasons);
    const next = advanceProSeason(state, FALLBACK_CLUBS);
    expect(next.phase).toBe('rehab_choice');
    expect(last(next).injurySevere).toBe(true);
    expect(last(next).suspensionMatches).toBe(3);
    expect(next.pendingSuspensionMatches).toBeUndefined();
    expect(JSON.stringify(next.seasons.slice(0, -1))).toBe(rows);
  });
});

function row(extra: Partial<SeasonRecord> = {}): SeasonRecord {
  return { year: 2027, age: 25, club: club.name, clubCountry: club.country, clubTier: club.tier,
    apps: 30, leagueApps: 30, goals: 18, assists: 8, cleanSheets: 0, yellowCards: 4, redCards: 1,
    rating: 7.5, injury: null, injuryWeeks: 0, injurySevere: false,
    leagueTitle: false, leagueFinish: 3, leagueSize: 20, domesticCup: false, championsLeague: false,
    worldCup: false, ballonDor: false, ballonDorRank: null, type: 'playing',
    intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null, ...extra };
}
function derive(saved: SeasonRecord) {
  const state = { playerName: 'Card Replay', position: 'ST', seasons: [saved], awards: [], phone: null } as unknown as CareerState;
  const ctx = buildSoccerSeasonCtx(state, FALLBACK_CLUBS, saved);
  const result = deriveSeason(SOCCER, saved, ctx);
  expect(result).not.toBeNull();
  expect(disagreements(SOCCER, saved, ctx, result!)).toEqual([]);
  return { result: result!, ctx };
}

describe('Saved soccer cards and bans in the season', () => {
  it.each([false, true])('shows recorded send-offs and their next suspension in results mode %s without rewriting the save', resultsOnly => {
    const saved = row(resultsOnly ? { leagueFinish: undefined, leagueSize: undefined } : {});
    const before = JSON.stringify(saved);
    const { result } = derive(saved);
    expect(result.games.filter(g => g.line.red === 1)).toHaveLength(1);
    expect(result.games.reduce((n, g) => n + (g.line.yellow ?? 0), 0)).toBe(saved.yellowCards);
    const game = result.games.find(g => g.line.red === 1)!;
    const red = game.events.find(e => e.kind === 'red' && e.mine)!;
    expect(red).toBeDefined();
    expect(game.offAt).toBe(red.min);
    expect(game.events.every(e => !e.mine || e.min <= red.min)).toBe(true);
    const after = result.games[result.games.indexOf(game) + 1];
    if (after) expect(after.why).toBe('suspended');
    expect(JSON.stringify(saved)).toBe(before);
  });

  it.each([false, true])('places served bans outside injury and protects saved played derbies, severe injury %s', severe => {
    const saved = row({ apps: severe ? 12 : 27, leagueApps: severe ? 12 : 27, redCards: 0,
      suspensionMatches: 3, injury: 'Ankle', injuryWeeks: severe ? 24 : 6, injurySevere: severe,
      ...(severe ? { leagueFinish: undefined, leagueSize: undefined } : {}),
      derbies: [{ rival: 'Barcelona', name: 'El Clasico', kind: 'rivalry', meetings: [{ home: true, gf: 2, ga: 1, played: true, goals: 1, won: true }, { home: false, gf: 1, ga: 1, played: true, goals: 0 }] }],
    });
    const bytes = JSON.stringify(saved);
    const { result, ctx } = derive(saved);
    expect(SOCCER.availability(saved, ctx, SOCCER.frame(saved, ctx)).suspended).toBe(3);
    expect(result.games.filter(g => g.why === 'suspended')).toHaveLength(3);
    expect(result.games.filter(g => g.fixed).every(g => g.played)).toBe(true);
    expect(result.games.filter(g => g.fixed)).toHaveLength(2);
    expect(result.games.filter(g => g.fixed).map(g => [g.home, g.us, g.them])).toEqual([[true, 2, 1], [false, 1, 1]]);
    expect(result.games.filter(g => g.why === 'suspended').every(g => !g.played && !g.fixed)).toBe(true);
    expect(result.games.filter(g => g.why === 'injured').length).toBeGreaterThan(0);
    expect(result.games.filter(g => g.played)).toHaveLength(saved.apps);
    expect(JSON.stringify(saved)).toBe(bytes);
  });

  it('keeps a sparse severe injury season at one appearance with its three served ban gaps intact', () => {
    const saved = row({ apps: 1, leagueApps: 1, goals: 0, assists: 0, yellowCards: 0, redCards: 0,
      rating: 6, suspensionMatches: 3, injury: 'ACL', injuryWeeks: 24, injurySevere: true,
      leagueFinish: undefined, leagueSize: undefined });
    const { result } = derive(saved);
    expect(result.games.filter(g => g.played)).toHaveLength(1);
    expect(result.games.filter(g => g.why === 'suspended')).toHaveLength(3);
    expect(result.games.slice(0, 3).every(g => g.why === 'suspended')).toBe(true);
    const played = result.games.findIndex(g => g.played);
    expect(result.games[played + 1].why).toBe('injured');
  });

  it('demonstrates peak season headroom using legal 99 attributes while rating remains capped at ten', () => {
    let example: SeasonRecord | undefined;
    for (let seed = 0; seed < 16 && !example; seed += 1) {
      vi.spyOn(Math, 'random').mockImplementation(keyedRng(`soccer-stat-headroom1176|${seed}`));
      const state = career(99);
      expect(calcOverall(state, state.position)).toBe(99);
      const next = advanceProSeason(state, FALLBACK_CLUBS);
      const season = last(next);
      if (season.type === 'playing' && season.apps > 47 && (season.goals > 58 || season.assists > 14)) example = season;
      expect(season.rating).toBeLessThanOrEqual(10);
      expect(next.overall).toBeLessThanOrEqual(99);
      vi.restoreAllMocks();
    }
    expect(example, 'a concrete legal season exceeds the shown 58 goals or 14 assists').toBeDefined();
    expect(example!.apps).toBeGreaterThan(47);
    console.log('Soccer stat headroom example:', JSON.stringify({ apps: example!.apps, goals: example!.goals, assists: example!.assists, rating: example!.rating, ovr: example!.ovr }));
  });
});

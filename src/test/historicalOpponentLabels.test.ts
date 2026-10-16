import { describe, expect, it } from 'vitest';
import { CAREER_HISTORICAL_OPPONENT_DISPLAY } from '@/data/careerHistoricalOpponentDisplay';
import { CAREER_LEAGUE_SEASONS } from '@/data/careerLeagueSeasons';
import { FALLBACK_CLUBS, type CareerState, type SeasonRecord } from '@/lib/soccerCareerEngine';
import { deriveSeason, planMoments, tableAt } from '@/lib/season/core';
import { buildSoccerSeasonCtx, SOCCER } from '@/lib/season/soccer';
import { historicalOpponentLabels } from '@/lib/season/historicalOpponentLabels';

// Fictional saved boundaries, not historical scores or a real player's record.
function fixture(severe = false) {
  const row: SeasonRecord = {
    year: 2023, age: 26, club: 'Arsenal', clubCountry: 'England', clubTier: 1,
    apps: severe ? 14 : 32, leagueApps: severe ? 14 : 30,
    goals: severe ? 4 : 10, assists: severe ? 3 : 6, cleanSheets: 0,
    yellowCards: 2, redCards: 0, rating: 7.2,
    injury: severe ? 'ACL' : null, injuryWeeks: severe ? 28 : 0, injurySevere: severe,
    leagueTitle: !severe, leagueFinish: severe ? undefined : 1, leagueSize: severe ? undefined : 20,
    domesticCup: false, championsLeague: false, worldCup: false, ballonDor: false, ballonDorRank: null,
    type: 'playing', intApps: 0, intGoals: 0, intAssists: 0, intRating: 0,
    tournament: null, tournamentResult: null,
  };
  const career = { playerName: 'Display fixture', position: 'ST', seasons: [row], awards: [],
    phone: { world: { year: row.year, leagues: {}, ucl: '' } } } as unknown as CareerState;
  const ctx = buildSoccerSeasonCtx(career, FALLBACK_CLUBS, row);
  const season = deriveSeason(SOCCER, row, ctx)!;
  expect(season).not.toBeNull();
  return { career, row, ctx, season };
}

describe('one verified historical opponent display identity', () => {
  it('contains only the checked Luton membership and preserves the old ledger', () => {
    expect(CAREER_HISTORICAL_OPPONENT_DISPLAY).toEqual([{ league: 'Premier League', year: 2023, identity: 'luton town', name: 'Luton Town' }]);
    expect(CAREER_LEAGUE_SEASONS['Premier League'][2023].others).toEqual(['luton town']);
    expect(CAREER_LEAGUE_SEASONS['Premier League'][2023].clubs).not.toContain('Luton Town');
  });

  it.each([false, true])('names the unique slot after real derivation, severe=%s', severe => {
    const { career, row, ctx, season } = fixture(severe);
    const before = JSON.stringify([career, ctx, season]);
    const moments = planMoments(SOCCER, row, ctx, season);
    const display = historicalOpponentLabels(row, ctx, season)!;
    expect(display).not.toBeNull();
    expect(display.names.filter(name => name === 'Luton Town')).toHaveLength(1);
    const slot = display.names.indexOf('Luton Town');
    expect(season.labels[slot].named).toBe(false);
    expect(season.games.filter(game => game.opp === slot)).toHaveLength(2);
    const presentation = { ...season, labels: display.labels };
    expect({ ...presentation, labels: season.labels }).toEqual(season);
    expect(tableAt(presentation, presentation.games.length)).toEqual(tableAt(season, season.games.length));
    expect(planMoments(SOCCER, row, ctx, presentation)).toEqual(moments);
    expect(JSON.stringify([career, ctx, season])).toBe(before);
    expect(display.labels[slot]).toEqual({ name: 'Luton Town', named: true, key: 'Luton Town' });
    expect(display.note).toContain('results are simulated');
  });

  it('rejects another year, league, own club or nonplaying row', () => {
    const { row, ctx, season } = fixture();
    for (const year of [2022, 2024, 2025]) expect(historicalOpponentLabels({ ...row, year }, ctx, season)).toBeNull();
    expect(historicalOpponentLabels(row, { league: { key: 'Championship', name: 'Championship' } }, season)).toBeNull();
    expect(historicalOpponentLabels({ ...row, club: 'Ajax' }, ctx, season)).toBeNull();
    expect(historicalOpponentLabels({ ...row, type: 'youth' }, ctx, season)).toBeNull();
  });

  it('refuses multiple unnamed slots and keeps every nonlabel value', () => {
    const { row, ctx, season } = fixture();
    const fault = structuredClone(season), slot = fault.labels.findIndex((label, index) => index > 0 && label.named);
    fault.labels[slot] = { name: 'another club', named: false, key: `control-${slot}` };
    expect(fault.labels).not.toEqual(season.labels);
    expect({ ...fault, labels: season.labels }).toEqual(season);
    expect(historicalOpponentLabels(row, ctx, fault)).toBeNull();
  });

  it('refuses a mismatch between the unused member and the unnamed slot', () => {
    const { row, ctx, season } = fixture();
    const fault = structuredClone(season), slot = fault.labels.findIndex((label, index) => index > 0 && label.named);
    fault.labels[slot] = { name: 'Luton Town', named: true, key: 'Luton Town' };
    expect(fault.labels).not.toEqual(season.labels);
    expect({ ...fault, labels: season.labels }).toEqual(season);
    expect(historicalOpponentLabels(row, ctx, fault)).toBeNull();
  });

  it('refuses foreign or duplicate named members', () => {
    const { row, ctx, season } = fixture();
    const slots = season.labels.flatMap((label, index) => index > 0 && label.named ? [index] : []);
    const foreign = structuredClone(season); foreign.labels[slots[0]] = { name: 'Ajax', named: true, key: 'Ajax' };
    const duplicate = structuredClone(season); duplicate.labels[slots[0]] = { ...duplicate.labels[slots[1]] };
    expect(historicalOpponentLabels(row, ctx, foreign)).toBeNull();
    expect(historicalOpponentLabels(row, ctx, duplicate)).toBeNull();
  });

  it('refuses a wrong frame or a fixture stream without every opponent slot', () => {
    const { row, ctx, season } = fixture();
    expect(historicalOpponentLabels(row, ctx, { ...season, teams: 19 })).toBeNull();
    const slot = season.labels.findIndex(label => !label.named);
    const fault = { ...season, games: season.games.filter(game => game.opp !== slot) };
    expect(fault.games).not.toEqual(season.games);
    expect(historicalOpponentLabels(row, ctx, fault)).toBeNull();
  });
});

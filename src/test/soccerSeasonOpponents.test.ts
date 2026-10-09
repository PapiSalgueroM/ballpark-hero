import { describe, expect, it } from 'vitest';
import { CAREER_LEAGUE_SEASONS } from '@/data/careerLeagueSeasons';
import { FALLBACK_CLUBS, type CareerState, type SeasonRecord } from '@/lib/soccerCareerEngine';
import { deriveSeason, disagreements, planMoments, tableAt, type DerivedSeason } from '@/lib/season/core';
import { buildSoccerSeasonCtx, SOCCER } from '@/lib/season/soccer';

// Fictional saved seasons. Membership comes from the game's verified league data.
function seasonRow(extra: Partial<SeasonRecord> = {}): SeasonRecord {
  return {
    year: 2027, age: 26, club: 'Anderlecht', clubCountry: 'Belgium', clubTier: 3,
    apps: 32, leagueApps: 30, goals: 10, assists: 6, cleanSheets: 0,
    yellowCards: 2, redCards: 0, rating: 7.2, injury: null, injuryWeeks: 0,
    injurySevere: false, leagueTitle: false, domesticCup: false,
    championsLeague: false, worldCup: false, ballonDor: false, ballonDorRank: null,
    type: 'playing', intApps: 0, intGoals: 0, intAssists: 0, intRating: 0,
    tournament: null, tournamentResult: null, ...extra,
  };
}

function careerFor(row: SeasonRecord): CareerState {
  return {
    playerName: 'Opponent fixture', position: 'ST', seasons: [row], awards: [],
    phone: { world: { year: row.year, leagues: {}, ucl: '' } },
  } as unknown as CareerState;
}

function derive(row: SeasonRecord) {
  const career = careerFor(row);
  const before = JSON.stringify(career);
  const ctx = buildSoccerSeasonCtx(career, FALLBACK_CLUBS, row);
  const season = deriveSeason(SOCCER, row, ctx);
  expect(season).not.toBeNull();
  expect(JSON.stringify(career)).toBe(before);
  return { career, ctx, season: season! };
}

function withoutLabels(season: DerivedSeason) {
  return { ...season, labels: undefined };
}

function expectNamesOnly(row: SeasonRecord, ctx: ReturnType<typeof buildSoccerSeasonCtx>, season: DerivedSeason) {
  const controlCtx = { ...ctx, named: [] };
  const control = deriveSeason(SOCCER, row, controlCtx);
  expect(control).not.toBeNull();
  // The control must remove real names, otherwise it would prove nothing.
  expect(control!.labels).not.toEqual(season.labels);
  expect(withoutLabels(season)).toEqual(withoutLabels(control!));
  expect(planMoments(SOCCER, row, ctx, season)).toEqual(planMoments(SOCCER, row, controlCtx, control!));
  expect(disagreements(SOCCER, row, ctx, season)).toEqual([]);
}

function leagueOpponents(league: string, own: string) {
  return FALLBACK_CLUBS.filter(c => c.league === league && c.name !== own).map(c => c.name);
}

function expectBelgianNames(season: DerivedSeason) {
  const opponents = season.labels.slice(1);
  expect(season.labels[0].name).toBe('Anderlecht');
  expect(opponents).toHaveLength(17);
  expect(opponents.every(l => l.named)).toBe(true);
  expect(new Set(opponents.map(l => l.name))).toEqual(new Set(leagueOpponents('Belgian Pro League', 'Anderlecht')));
  for (const label of opponents) {
    const slot = season.labels.indexOf(label);
    const games = season.games.filter(g => g.opp === slot);
    expect(games).toHaveLength(2);
    expect(games.filter(g => g.home)).toHaveLength(1);
  }
}

describe('Soccer Career Season Centre opponent names', () => {
  it('names every Anderlecht opponent on an old save without a league finish or size', () => {
    const row = seasonRow({ leagueApps: undefined });
    const { ctx, season } = derive(row);
    expect(ctx.mode).toBe('results');
    expect(ctx.why).toBe('nofinish');
    expect(season.games).toHaveLength(34);
    expect(tableAt(season, season.games.length)).toEqual([]);
    expectBelgianNames(season);
    expectNamesOnly(row, ctx, season);
  });

  it('keeps real opponent names when a severe injury removes the final table', () => {
    const row = seasonRow({ apps: 14, leagueApps: 14, goals: 4, assists: 3,
      injury: 'ACL', injuryWeeks: 28, injurySevere: true });
    const { ctx, season } = derive(row);
    expect(ctx.mode).toBe('results');
    expect(ctx.why).toBe('severe');
    expect(tableAt(season, season.games.length)).toEqual([]);
    expectBelgianNames(season);
    expect(season.games.some(g => g.why === 'injured')).toBe(true);
    expectNamesOnly(row, ctx, season);
  });

  it('names real opponents in a conference league without claiming a full table', () => {
    const row = seasonRow({ club: 'Inter Miami', clubCountry: 'USA', clubTier: 2 });
    const { ctx, season } = derive(row);
    expect(ctx.mode).toBe('results');
    expect(season.games).toHaveLength(38);
    expect(tableAt(season, season.games.length)).toEqual([]);
    const allowed = new Set(leagueOpponents('MLS', row.club));
    const opponents = season.labels.slice(1);
    expect(opponents).toHaveLength(19);
    expect(opponents.every(l => l.named && allowed.has(l.name))).toBe(true);
    expect(new Set(opponents.map(l => l.name)).size).toBe(opponents.length);
    expectNamesOnly(row, ctx, season);
  });

  it('uses the known split-league clubs without inventing additional real members', () => {
    const row = seasonRow({ club: 'Red Bull Salzburg', clubCountry: 'Austria' });
    const { ctx, season } = derive(row);
    expect(ctx.mode).toBe('results');
    expect(tableAt(season, season.games.length)).toEqual([]);
    const allowed = new Set(leagueOpponents('Austrian Bundesliga', row.club));
    const named = season.labels.slice(1).filter(l => l.named);
    expect(named).toHaveLength(11);
    expect(new Set(named.map(l => l.name))).toEqual(allowed);
    expectNamesOnly(row, ctx, season);
  });

  it('keeps a table season on its saved finish while naming its complete league', () => {
    const row = seasonRow({ leagueFinish: 5, leagueSize: 18 });
    const { ctx, season } = derive(row);
    expect(ctx.mode).toBe('table');
    expectBelgianNames(season);
    expect(tableAt(season, season.games.length).findIndex(r => r.slot === 0) + 1).toBe(5);
    expectNamesOnly(row, ctx, season);
  });

  it('names only the historical members when a past season has no saved finish', () => {
    const row = seasonRow({ year: 2017, club: 'Newcastle', clubCountry: 'England' });
    const { ctx, season } = derive(row);
    expect(ctx.mode).toBe('results');
    const allowed = new Set(CAREER_LEAGUE_SEASONS['Premier League'][2017].clubs);
    const named = season.labels.slice(1).filter(l => l.named);
    expect(named.length).toBeGreaterThan(0);
    expect(named.every(l => allowed.has(l.name) && l.name !== row.club)).toBe(true);
    expect(named.map(l => l.name)).not.toContain('Sunderland');
    expect(named.map(l => l.name)).not.toContain('Coventry City');
    expect(new Set(named.map(l => l.name)).size).toBe(named.length);
    expectNamesOnly(row, ctx, season);
  });

  it('recognises an existing club spelling without making that club its own opponent', () => {
    const row = seasonRow({ club: 'Manchester City', clubCountry: 'England', clubTier: 1 });
    const { ctx, season } = derive(row);
    expect(ctx.mode).toBe('results');
    expect(season.labels[0].name).toBe('Manchester City');
    const opponents = season.labels.slice(1);
    expect(opponents).toHaveLength(19);
    expect(opponents.every(l => l.named)).toBe(true);
    expect(new Set(opponents.map(l => l.name))).toEqual(new Set(leagueOpponents('Premier League', 'Man City')));
    expect(opponents.map(l => l.name)).not.toContain('Man City');
    expect(opponents.map(l => l.name)).not.toContain('Manchester City');
    expectNamesOnly(row, ctx, season);
  });

  it('does not backfill current Belgian members into an unverified historical season', () => {
    const { ctx, season } = derive(seasonRow({ year: 2015 }));
    expect(ctx.mode).toBe('results');
    expect(ctx.named).toEqual([]);
    expect(season.labels.slice(1).every(l => !l.named)).toBe(true);
    expect(tableAt(season, season.games.length)).toEqual([]);
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FALLBACK_CLUBS, determineTransferSituation, simulateUCL, type CareerState, type SeasonRecord } from '@/lib/soccerCareerEngine';
import { deriveSeason, tableAt } from '@/lib/season/core';
import { buildSoccerSeasonCtx, SOCCER } from '@/lib/season/soccer';
import { canonClub, resolveSeasonDerbies } from '@/lib/soccerCareerDerby';
import {
  drawLeagueWorldFinish, finishLeagueWorld, leagueWorldForYear, leagueWorldOrder,
  prepareLeagueWorld, projectLeagueWorldClubs, readLeagueWorldSeason,
  recordLeagueWorldSeason, settleLeagueWorld, settledLeagueOrder, PYRAMIDS,
} from '@/lib/soccerCareerLeagueWorld';

afterEach(() => vi.restoreAllMocks());
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
function career(club = 'PSG', league = 'Ligue 1'): CareerState {
  const saved = JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8')).saves.find((s: { id: string }) => s.id === 'ere').state;
  return { ...saved, playerName: 'Future World Fixture', currentClub: club, currentLeague: league, currentClubCountry: 'France', currentClubTier: 1, position: 'CM', seasons: [], awards: [], events: [], story: [], phone: undefined, leagueWorld: undefined };
}
function season(s: CareerState, year: number, finish: number, size: number): SeasonRecord {
  return { year, age: 26, club: s.currentClub, clubCountry: s.currentClubCountry, clubTier: s.currentClubTier,
    apps: 28, leagueApps: 28, goals: 5, assists: 4, cleanSheets: 0, yellowCards: 2, redCards: 0, rating: 6.9,
    leagueTitle: finish === 1, leagueFinish: finish, leagueSize: size, domesticCup: false, championsLeague: false,
    worldCup: false, ballonDor: false, ballonDorRank: null, type: 'playing',
    intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null };
}

describe('Soccer Career simulated promotion and relegation', () => {
  it('starts all five sourced pyramids and leaves historical and open leagues alone', () => {
    const s = career();
    const before = JSON.stringify(s);
    expect(leagueWorldForYear(s, FALLBACK_CLUBS, 2025)).toBeNull();
    const world = leagueWorldForYear(s, FALLBACK_CLUBS, 2026)!;
    expect(Object.fromEntries(Object.entries(world.leagues).map(([key, names]) => [key, names.length]))).toEqual({
      'Premier League': 20, Championship: 24, Bundesliga: 18, '2. Bundesliga': 18,
      'Ligue 1': 18, 'Ligue 2': 18, 'Serie A': 20, 'Serie B': 20, 'La Liga': 20, 'Segunda Division': 20,
    });
    expect(world.leagues.MLS).toBeUndefined();
    expect(JSON.stringify(s)).toBe(before);
    const open = career('Inter Miami', 'MLS');
    prepareLeagueWorld(open, FALLBACK_CLUBS, 2026);
    const row = season(open, 2026, 8, 20);
    recordLeagueWorldSeason(open, FALLBACK_CLUBS, row);
    expect(row.leagueWorld).toBeUndefined();
    expect(open.currentLeague).toBe('MLS');
  });

  it('changes membership over fifteen years with equal, disjoint and correctly ranked swaps', () => {
    const s = career();
    let world = leagueWorldForYear(s, FALLBACK_CLUBS, 2026)!;
    const initial = clone(world.leagues);
    const pairs = [['Premier League', 'Championship', 3], ['Bundesliga', '2. Bundesliga', 2], ['Ligue 1', 'Ligue 2', 2], ['Serie A', 'Serie B', 3], ['La Liga', 'Segunda Division', 3]] as const;
    vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('world moved the main RNG'); });
    for (let y = 0; y < 15; y++) {
      const before = JSON.stringify(world);
      const next = finishLeagueWorld(world, s.playerName, FALLBACK_CLUBS);
      for (const [upper, lower, count] of pairs) {
        const down = leagueWorldOrder(world, upper, s.playerName, FALLBACK_CLUBS).slice(-count);
        const up = leagueWorldOrder(world, lower, s.playerName, FALLBACK_CLUBS).slice(0, count);
        expect(next.movements.filter(m => m.from === upper).map(m => m.club)).toEqual(down);
        expect(next.movements.filter(m => m.from === lower).map(m => m.club)).toEqual(up);
        expect(next.leagues[upper].length).toBe(initial[upper].length);
        expect(next.leagues[lower].length).toBe(initial[lower].length);
        expect(new Set([...next.leagues[upper], ...next.leagues[lower]]).size).toBe(initial[upper].length + initial[lower].length);
        expect(down.every(n => next.leagues[lower].includes(n))).toBe(true);
        expect(up.every(n => next.leagues[upper].includes(n))).toBe(true);
      }
      expect(JSON.stringify(world)).toBe(before);
      world = next;
    }
    expect(world.year).toBe(2041);
    for (const [league, members] of Object.entries(initial)) expect([...world.leagues[league]].sort()).not.toEqual([...members].sort());
  }, 30000);

  it('uses the displayed final table for relegation and retains that season after later movement', () => {
    const s = career();
    prepareLeagueWorld(s, FALLBACK_CLUBS, 2027);
    const row = season(s, 2027, 18, 18);
    s.seasons = [row];
    recordLeagueWorldSeason(s, FALLBACK_CLUBS, row);
    const derived = deriveSeason(SOCCER, row, buildSoccerSeasonCtx(s, FALLBACK_CLUBS, row));
    expect(derived?.mode).toBe('table');
    const order = tableAt(derived!, derived!.rounds.length).map(t => derived!.labels[t.slot].name);
    expect(new Set(order)).toEqual(new Set(row.leagueWorld!.members));
    expect(order.at(-1)).toBe('PSG');
    settleLeagueWorld(s, FALLBACK_CLUBS, row, order);
    expect(row.leagueWorld!.movements!.filter(m => m.from === 'Ligue 1').map(m => m.club)).toEqual(order.slice(-2));
    expect(row.leagueWorld!.movement).toEqual({ club: 'PSG', from: 'Ligue 1', to: 'Ligue 2', kind: 'relegated' });
    const savedRow = JSON.stringify(row);
    prepareLeagueWorld(s, FALLBACK_CLUBS, 2028);
    expect(s.currentLeague).toBe('Ligue 2');
    const rebuilt = deriveSeason(SOCCER, row, buildSoccerSeasonCtx(clone(s), FALLBACK_CLUBS, clone(row)));
    expect(rebuilt).toEqual(derived);
    expect(JSON.stringify(row)).toBe(savedRow);
  }, 30000);

  it('makes the player follow both divisions and restores base tier after promotion', () => {
    const s = career();
    prepareLeagueWorld(s, FALLBACK_CLUBS, 2026);
    const down = season(s, 2026, 18, 18);
    recordLeagueWorldSeason(s, FALLBACK_CLUBS, down);
    settleLeagueWorld(s, FALLBACK_CLUBS, down);
    prepareLeagueWorld(s, FALLBACK_CLUBS, 2027);
    expect([s.currentLeague, s.currentClubTier]).toEqual(['Ligue 2', 4]);
    expect(simulateUCL(s, down).qualified).toBe(false);
    const up = season(s, 2027, 1, 18);
    recordLeagueWorldSeason(s, FALLBACK_CLUBS, up);
    settleLeagueWorld(s, FALLBACK_CLUBS, up);
    prepareLeagueWorld(s, FALLBACK_CLUBS, 2028);
    expect([s.currentLeague, s.currentClubTier]).toEqual(['Ligue 1', 1]);
    expect(up.leagueWorld!.movement?.kind).toBe('promoted');
    expect(down.leagueWorld!.league).toBe('Ligue 1');
  });

  it('normalizes saved club aliases before swapping and keeps the played spelling once', () => {
    const s = career('Manchester United', 'Premier League');
    s.currentClubCountry = 'England';
    prepareLeagueWorld(s, FALLBACK_CLUBS, 2026);
    const row = season(s, 2026, 20, 20);
    recordLeagueWorldSeason(s, FALLBACK_CLUBS, row);
    expect(row.leagueWorld!.members).toContain('Manchester United');
    expect(row.leagueWorld!.members).not.toContain('Man United');
    const ctx = buildSoccerSeasonCtx(s, FALLBACK_CLUBS, row);
    expect(ctx.named).not.toContain('Man United');
    expect(ctx.named).not.toContain('Manchester United');
    const order = leagueWorldOrder(s.leagueWorld!, 'Premier League', s.playerName, FALLBACK_CLUBS, row).map(n => n === 'Man United' ? row.club : n);
    settleLeagueWorld(s, FALLBACK_CLUBS, row, order);
    expect(s.leagueWorld!.leagues['Premier League'].length).toBe(20);
    expect(s.leagueWorld!.leagues.Championship.length).toBe(24);
    expect(s.leagueWorld!.leagues['Premier League']).not.toContain('Man United');
    expect(s.leagueWorld!.leagues.Championship).toContain('Man United');
    expect(row.leagueWorld!.movement?.club).toBe('Manchester United');
    prepareLeagueWorld(s, FALLBACK_CLUBS, 2027);
    const promoted = season(s, 2027, 1, 24);
    recordLeagueWorldSeason(s, FALLBACK_CLUBS, promoted);
    expect(readLeagueWorldSeason(promoted)?.champion).toBe('Manchester United');
    const winner = buildSoccerSeasonCtx(s, FALLBACK_CLUBS, promoted);
    expect(winner.named.length).toBe(23);
    expect(winner.named).not.toContain('Man United');
    expect(winner.champion).toBeNull();
  });

  it('projects actual transfer offers and lower destinations through the same next-year field', () => {
    const s = career();
    prepareLeagueWorld(s, FALLBACK_CLUBS, 2026);
    const row = season(s, 2026, 18, 18);
    recordLeagueWorldSeason(s, FALLBACK_CLUBS, row);
    settleLeagueWorld(s, FALLBACK_CLUBS, row);
    s.seasons = [row]; s.contractYearsLeft = 0; s.age = 24; s.overall = 68;
    const pool = projectLeagueWorldClubs(s, FALLBACK_CLUBS, 2027);
    expect(pool.find(c => c.name === 'PSG')?.league).toBe('Ligue 2');
    expect(pool.find(c => c.name === 'FC Andorra')?.country).toBe('Andorra');
    expect(pool.some(c => c.name === 'Laval')).toBe(true);
    vi.spyOn(Math, 'random').mockReturnValue(0.41);
    const market = determineTransferSituation(s, FALLBACK_CLUBS);
    expect(market.type).toBe('contract_expiry');
    if (market.type !== 'contract_expiry') throw new Error('expected an actual offer market');
    expect(market.offers.length).toBeGreaterThan(0);
    for (const offer of market.offers) {
      const held = Object.entries(s.leagueWorld!.leagues).find(([, names]) => names.includes(offer.club.name));
      if (held) expect(offer.club.league).toBe(held[0]);
    }
  });

  it('labels the partial Spanish model and caps lower league apps to its own calendar', () => {
    const s = career('Girona', 'Segunda Division');
    prepareLeagueWorld(s, FALLBACK_CLUBS, 2026);
    const row = { ...season(s, 2026, 4, 22), apps: 42, leagueApps: 42 };
    recordLeagueWorldSeason(s, FALLBACK_CLUBS, row);
    expect(row.leagueWorld!.simulation).toBe('simulated-partial');
    expect(row.leagueSize).toBe(20);
    expect(row.leagueApps).toBe(38);
    expect(row.leagueFinish).toBe(drawLeagueWorldFinish(row, s.playerName, 20));
    expect(buildSoccerSeasonCtx(s, FALLBACK_CLUBS, row).games).toBe(38);
    const france = career('Nantes', 'Ligue 2');
    prepareLeagueWorld(france, FALLBACK_CLUBS, 2026);
    const short = { ...season(france, 2026, 4, 18), apps: 40, leagueApps: 40 };
    recordLeagueWorldSeason(france, FALLBACK_CLUBS, short);
    expect(short.leagueApps).toBe(34);
  });

  it('keeps old saves and rejects malformed or foreign membership without inventing tables', () => {
    const s = career();
    const row = season(s, 2026, 6, 18);
    expect(readLeagueWorldSeason(row)).toBeNull();
    prepareLeagueWorld(s, FALLBACK_CLUBS, 2026);
    recordLeagueWorldSeason(s, FALLBACK_CLUBS, row);
    expect(readLeagueWorldSeason(row)).not.toBeNull();
    const duplicate = clone(row); duplicate.leagueWorld!.members[1] = duplicate.leagueWorld!.members[0];
    expect(readLeagueWorldSeason(duplicate)).toBeNull();
    const foreign = clone(row); foreign.leagueWorld!.members[1] = 'Bayern Munich';
    expect(readLeagueWorldSeason(foreign)).toBeNull();
    expect(readLeagueWorldSeason({ ...row, year: 2025 })).toBeNull();
  });

  it('retains an injured season field without inventing a finish or full table', () => {
    const s = career();
    prepareLeagueWorld(s, FALLBACK_CLUBS, 2026);
    const row = { ...season(s, 2026, 6, 18), leagueFinish: undefined, leagueSize: undefined, injurySevere: true, injuryWeeks: 20 };
    recordLeagueWorldSeason(s, FALLBACK_CLUBS, row);
    expect(readLeagueWorldSeason(row)?.members).toEqual(s.leagueWorld!.leagues['Ligue 1']);
    expect(row.leagueFinish).toBeUndefined();
    expect(row.leagueSize).toBeUndefined();
    expect(buildSoccerSeasonCtx(s, FALLBACK_CLUBS, row).why).toBe('severe');
    const held = JSON.stringify(row);
    prepareLeagueWorld(s, FALLBACK_CLUBS, 2027);
    expect(JSON.stringify(row)).toBe(held);
    const spain = career('Girona', 'Segunda Division');
    prepareLeagueWorld(spain, FALLBACK_CLUBS, 2026);
    const partial = { ...season(spain, 2026, 4, 22), leagueFinish: undefined, leagueSize: undefined, injurySevere: true, injuryWeeks: 20 };
    recordLeagueWorldSeason(spain, FALLBACK_CLUBS, partial);
    const ctx = buildSoccerSeasonCtx(spain, FALLBACK_CLUBS, partial);
    expect([ctx.mode, ctx.why, ctx.games]).toEqual(['results', 'severe', 38]);
    expect(ctx.champion).toBeNull();
    expect(ctx.named.length).toBe(19);
    expect(partial.leagueWorld!.members.length).toBe(20);
  });

  it('binds a mixed-alias future champion to its saved derby key and field spelling', () => {
    const s = career('Man City', 'Premier League');
    s.currentClubCountry = 'England';
    prepareLeagueWorld(s, FALLBACK_CLUBS, 2026);
    const row = season(s, 2026, 6, 20);
    row.derbies = [{ rival: 'Manchester United', name: 'Manchester derby', kind: 'derby', meetings: [
      { home: true, gf: 0, ga: 2, played: true, goals: 0 },
      { home: false, gf: 0, ga: 1, played: true, goals: 0 },
    ] }];
    recordLeagueWorldSeason(s, FALLBACK_CLUBS, row);
    row.leagueWorld!.champion = 'Man United';
    s.seasons = [row];
    const before = JSON.stringify({ s, row });
    vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('alias replay moved the main RNG'); });
    const ctx = buildSoccerSeasonCtx(s, FALLBACK_CLUBS, row);
    expect(ctx.fixedNames).toEqual({ 'Manchester United': 'Man United' });
    expect(SOCCER.target(row, ctx, SOCCER.frame(row, ctx))).toEqual({ kind: 'finish', finish: 6, title: false, champion: { key: 'Manchester United' } });
    const derived = deriveSeason(SOCCER, row, ctx);
    expect(derived?.mode).toBe('table');
    const final = tableAt(derived!, derived!.rounds.length);
    const names = final.map(t => derived!.labels[t.slot].name);
    expect(names[0]).toBe('Man United');
    expect([...names].sort()).toEqual([...row.leagueWorld!.members].sort());
    expect(new Set(names.map(canonClub)).size).toBe(20);
    expect(names).not.toContain('Manchester United');
    const fixed = derived!.games.filter(g => g.fixedKey === 'Manchester United');
    expect(fixed.map(g => ({ home: g.home, us: g.us, them: g.them, played: g.played, goals: g.line.goals }))).toEqual([
      { home: true, us: 0, them: 2, played: true, goals: 0 },
      { home: false, us: 0, them: 1, played: true, goals: 0 },
    ]);
    expect(final[0].slot).toBe(fixed[0].opp);
    const trip = clone(row);
    expect(deriveSeason(SOCCER, trip, buildSoccerSeasonCtx(clone(s), FALLBACK_CLUBS, trip))).toEqual(derived);
    const legacy = { ...clone(row), year: 2025 };
    delete legacy.leagueWorld;
    const oldCtx = buildSoccerSeasonCtx(s, FALLBACK_CLUBS, legacy);
    expect(oldCtx.fixedNames).toBeUndefined();
    expect(SOCCER.target(legacy, { ...oldCtx, champion: 'Man United' }, SOCCER.frame(legacy, oldCtx))).toEqual({ kind: 'finish', finish: 6, title: false, champion: 'other' });
    expect(SOCCER.labels([
      { slot: 0, pos: 6, fixedKey: null, champion: false },
      { slot: 1, pos: 1, fixedKey: 'Manchester United', champion: true },
    ], oldCtx, () => 0.5)[1]).toEqual({ name: 'Manchester United', named: true, key: 'Manchester United' });
    expect(JSON.stringify({ s, row })).toBe(before);
  }, 30000);

  it('does not put a rival from another future division in the season context', () => {
    const s = career();
    prepareLeagueWorld(s, FALLBACK_CLUBS, 2026);
    const world = s.leagueWorld!;
    const replacement = world.leagues['Ligue 2'][0];
    world.leagues['Ligue 1'] = world.leagues['Ligue 1'].map(n => n === 'Marseille' ? replacement : n);
    world.leagues['Ligue 2'] = world.leagues['Ligue 2'].map(n => n === replacement ? 'Marseille' : n);
    const row = season(s, 2026, 5, 18);
    const projected = projectLeagueWorldClubs(s, FALLBACK_CLUBS, 2026);
    row.derbies = resolveSeasonDerbies({ club: row.club, league: 'Ligue 1', year: 2026, clubs: projected, elite: [], position: 'CM', apps: row.apps, leagueApps: row.leagueApps!, goals: row.goals, leagueTitle: false, seedKey: 'future-derby-fixture' });
    expect(row.derbies.map(d => d.rival)).not.toContain('Marseille');
    recordLeagueWorldSeason(s, FALLBACK_CLUBS, row);
    expect(buildSoccerSeasonCtx(s, FALLBACK_CLUBS, row).named).not.toContain('Marseille');
    expect(world.leagues['Ligue 2']).toContain('Marseille');
  });

  /* Release AQ. A season a severe injury cut short never reached the settle:
     the next season finished it on form with no record, and his own club
     could change division with nothing written anywhere (4 times in 300
     careers on the reviewed head). */
  it('settles the season a severe injury cut short and writes his club\'s move on the row', () => {
    const field = leagueWorldForYear(career(), FALLBACK_CLUBS, 2026)!.leagues['Ligue 1'];
    let s: CareerState | null = null;
    search: for (const club of field) for (let i = 0; i < 40; i++) {
      const candidate = { ...career(club, 'Ligue 1'), playerName: `Injury Fixture ${i}` };
      const world = leagueWorldForYear(candidate, FALLBACK_CLUBS, 2026)!;
      if (leagueWorldOrder(world, 'Ligue 1', candidate.playerName, FALLBACK_CLUBS).slice(-2).includes(club)) { s = candidate; break search; }
    }
    expect(s, 'a club the world\'s form sends down').not.toBeNull();
    const c = s!;
    prepareLeagueWorld(c, FALLBACK_CLUBS, 2026);
    const row = { ...season(c, 2026, 6, 18), leagueFinish: undefined, leagueSize: undefined, injurySevere: true, injuryWeeks: 20 };
    recordLeagueWorldSeason(c, FALLBACK_CLUBS, row);
    const before = clone(c.leagueWorld!.leagues);
    settleLeagueWorld(c, FALLBACK_CLUBS, row);
    expect(c.leagueWorld!.year).toBe(2027);
    expect(row.leagueWorld!.movement).toEqual({ club: c.currentClub, from: 'Ligue 1', to: 'Ligue 2', kind: 'relegated' });
    expect(row.leagueWorld!.champion).not.toBe(c.currentClub);
    const left = row.leagueWorld!.movements!;
    expect(left.length).toBe(2);
    expect(left.every(m => m.from === 'Ligue 1' && m.kind === 'relegated')).toBe(true);
    expect(c.leagueWorld!.leagues['Ligue 2']).toContain(c.currentClub);
    for (const name of before['Ligue 1']) expect(c.leagueWorld!.leagues['Ligue 1'].includes(name)).toBe(!left.some(m => m.club === name));
    prepareLeagueWorld(c, FALLBACK_CLUBS, 2027);
    expect(c.currentLeague).toBe('Ligue 2');
    expect(c.events).toEqual([]);
  });

  it('never puts his club first in a season a severe injury cut short', () => {
    const field = leagueWorldForYear(career(), FALLBACK_CLUBS, 2026)!.leagues['Ligue 1'];
    let seen = 0;
    for (let i = 0; i < 60 && seen < 3; i++) {
      const name = `Top Fixture ${i}`;
      const base = { ...career(), playerName: name };
      const world = leagueWorldForYear(base, FALLBACK_CLUBS, 2026)!;
      const form = leagueWorldOrder(world, 'Ligue 1', name, FALLBACK_CLUBS);
      const c = { ...career(form[0], 'Ligue 1'), playerName: name };
      expect(field).toContain(form[0]);
      prepareLeagueWorld(c, FALLBACK_CLUBS, 2026);
      const row = { ...season(c, 2026, 6, 18), leagueFinish: undefined, leagueSize: undefined, injurySevere: true, injuryWeeks: 20 };
      recordLeagueWorldSeason(c, FALLBACK_CLUBS, row);
      const order = settledLeagueOrder(c.leagueWorld!, 'Ligue 1', name, FALLBACK_CLUBS, row);
      expect(order[0]).toBe(row.leagueWorld!.champion);
      expect(order[1]).toBe(form[0]);
      expect([...order].sort()).toEqual([...form].sort());
      seen += 1;
    }
    expect(seen).toBe(3);
  });

  it('opens the season after a year out with the line when his club moved without him', () => {
    const field = leagueWorldForYear(career(), FALLBACK_CLUBS, 2026)!.leagues['Ligue 1'];
    let s: CareerState | null = null;
    search: for (const club of field) for (let i = 0; i < 40; i++) {
      const candidate = { ...career(club, 'Ligue 1'), playerName: `Away Fixture ${i}` };
      const world = leagueWorldForYear(candidate, FALLBACK_CLUBS, 2026)!;
      if (leagueWorldOrder(world, 'Ligue 1', candidate.playerName, FALLBACK_CLUBS).slice(-2).includes(club)) { s = candidate; break search; }
    }
    const c = s!;
    prepareLeagueWorld(c, FALLBACK_CLUBS, 2026);
    expect(c.events).toEqual([]);
    /* 2026 goes by with no played season (a ban year writes no league row) */
    prepareLeagueWorld(c, FALLBACK_CLUBS, 2027);
    expect(c.currentLeague).toBe('Ligue 2');
    expect(c.events).toEqual([`⬇️ ${c.currentClub} relegated to Ligue 2 in your simulated league world while you were away.`]);
    prepareLeagueWorld(c, FALLBACK_CLUBS, 2027);
    expect(c.events.length).toBe(1);
  });

  it('starts a damaged world again instead of throwing on the next season', () => {
    const c = career();
    prepareLeagueWorld(c, FALLBACK_CLUBS, 2027);
    const whole = clone(c.leagueWorld!);
    for (const damaged of [
      { year: 2028 },
      { ...clone(whole), year: 2028, leagues: { ...clone(whole.leagues), 'Ligue 2': undefined } },
      { ...clone(whole), year: 2028, leagues: { ...clone(whole.leagues), 'Serie A': whole.leagues['Serie A'].slice(1) } },
      { ...clone(whole), year: 'soon' },
    ]) {
      const hurt = { ...career(), leagueWorld: damaged as unknown as CareerState['leagueWorld'] };
      expect(() => prepareLeagueWorld(hurt, FALLBACK_CLUBS, 2028)).not.toThrow();
      expect(hurt.leagueWorld!.year).toBe(2028);
      expect(hurt.leagueWorld!.leagues['Ligue 2'].length).toBe(18);
      expect(hurt.leagueWorld!.leagues['Serie A'].length).toBe(20);
      expect(hurt.currentLeague).toBe('Ligue 1');
    }
  });

  /* Release AQ: the engine settles from the saved season alone, and the table
     the Season Centre draws afterwards holds the saved clubs in the places
     that changed hands, a derby rival included. */
  it('draws a settled season\'s table with the saved clubs in the places that changed hands', () => {
    let rivalsIn = 0; let rivalsOut = 0; let tables = 0;
    for (let i = 0; i < 24; i++) {
      const s = { ...career('Man City', 'Premier League'), playerName: `Zone Fixture ${i}`, currentClubCountry: 'England' };
      prepareLeagueWorld(s, FALLBACK_CLUBS, 2026);
      const row = season(s, 2026, 3 + (i % 15), 20);
      const projected = projectLeagueWorldClubs(s, FALLBACK_CLUBS, 2026);
      row.derbies = resolveSeasonDerbies({ club: row.club, league: 'Premier League', year: 2026, clubs: projected, elite: [], position: 'CM', apps: row.apps, leagueApps: row.leagueApps!, goals: row.goals, leagueTitle: false, seedKey: `zone-fixture-${i}` });
      recordLeagueWorldSeason(s, FALLBACK_CLUBS, row);
      s.seasons = [row];
      /* the saved zone is forced onto a derby rival on every other pass, so both sides of the hold are met */
      const rival = row.derbies.length > 0 ? row.leagueWorld!.members.find(n => canonClub(n) === canonClub(row.derbies![0].rival))! : null;
      if (i % 2 === 1 && rival && rival !== row.leagueWorld!.champion) {
        const world = s.leagueWorld!;
        const order = leagueWorldOrder(world, 'Premier League', s.playerName, FALLBACK_CLUBS, row).filter(n => n !== rival && n !== row.club);
        order.push(rival);
        order.splice(row.leagueFinish! - 1, 0, row.club);
        settleLeagueWorld(s, FALLBACK_CLUBS, row, order);
      } else settleLeagueWorld(s, FALLBACK_CLUBS, row);
      const saved = row.leagueWorld!.movements!.map(m => canonClub(m.club)).sort();
      expect(saved.length).toBe(3);
      const derived = deriveSeason(SOCCER, row, buildSoccerSeasonCtx(s, FALLBACK_CLUBS, row));
      if (derived?.mode !== 'table') continue;
      tables += 1;
      const names = tableAt(derived, derived.rounds.length).map(t => derived.labels[t.slot].name);
      expect(names.indexOf(row.club) + 1).toBe(row.leagueFinish);
      expect(names.slice(-3).map(canonClub).sort()).toEqual(saved);
      for (const d of row.derbies) { if (saved.includes(canonClub(d.rival))) rivalsIn += 1; else rivalsOut += 1; }
    }
    expect(tables).toBeGreaterThanOrEqual(20);
    expect(rivalsIn).toBeGreaterThanOrEqual(6);
    expect(rivalsOut).toBeGreaterThanOrEqual(12);
  }, 120000);

  it('holds each division\'s count and each second division\'s clubs to Club Manager\'s own rows', async () => {
    const { LEAGUE_RULES, REAL_LEAGUES } = await import('@/lib/clubManager');
    const { CAREER_LOWER_CLUBS } = await import('@/data/soccerCareerLowerClubs');
    const upperId: Record<string, string> = { 'Premier League': 'premier', Bundesliga: 'bundesliga', 'Ligue 1': 'ligue1', 'Serie A': 'seriea', 'La Liga': 'laliga' };
    const lowerId: Record<string, string> = { 'Serie B': 'serieb', 'Ligue 2': 'ligue2', 'Segunda Division': 'segunda' };
    expect(PYRAMIDS.length).toBe(5);
    for (const p of PYRAMIDS) expect(LEAGUE_RULES[upperId[p.upper]].drop, p.upper).toBe(p.count);
    expect(Object.keys(CAREER_LOWER_CLUBS).sort()).toEqual(Object.keys(lowerId).sort());
    for (const [league, names] of Object.entries(CAREER_LOWER_CLUBS)) expect(names, league).toEqual(REAL_LEAGUES.find(l => l.id === lowerId[league])!.clubs);
  }, 60000);
});

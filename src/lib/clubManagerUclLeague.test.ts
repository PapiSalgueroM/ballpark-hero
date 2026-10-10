import { describe, expect, it, vi } from 'vitest';
import { seasonOneUclField, type TableRow, type UclTie } from '@/lib/clubManager';
import {
  createUclLeagueStage, isUclLeagueStage, sortedUclLeague,
  uclLeaguePlayoffs, uclLeagueRoundOf16, type UclLeagueStage,
} from '@/lib/clubManagerUclLeague';

vi.mock('@/integrations/supabase/client', () => ({ supabase: null, SUPABASE_URL: '', SUPABASE_PUBLISHABLE_KEY: '' }));

function field(): string[] {
  const clubs = seasonOneUclField('now');
  expect(clubs).not.toBeNull();
  expect(clubs).toHaveLength(36);
  expect(new Set(clubs).size).toBe(36);
  return clubs!;
}

function stage(seed = 31): UclLeagueStage {
  const clubs = field();
  const result = createUclLeagueStage(clubs, clubs[0], seed);
  expect(result).not.toBeNull();
  return result!;
}

function totals(saved: UclLeagueStage): TableRow[] {
  return saved.table.map(({ club }) => {
    const row = { club, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
    for (const game of saved.results.filter(result => result.home === club || result.away === club)) {
      const mine = game.home === club ? game.hg : game.ag;
      const other = game.home === club ? game.ag : game.hg;
      row.gf += mine; row.ga += other;
      if (mine > other) { row.w++; row.pts += 3; }
      else if (mine < other) row.l++;
      else { row.d++; row.pts++; }
    }
    return row;
  });
}

function completed(days = 8): UclLeagueStage {
  const saved = stage();
  saved.results = saved.fixtures.slice(0, days).flatMap((games, day) => games.map(([home, away], index) => ({
    home, away, hg: (day * 5 + index * 3 + 1) % 5, ag: (day * 2 + index * 7) % 4,
  })));
  saved.matchday = days;
  saved.table = totals(saved);
  return saved;
}

function rankOracle(saved: UclLeagueStage): string[] {
  const metrics = saved.table.map((row, index) => {
    const games = saved.results.filter(game => game.home === row.club || game.away === row.club);
    const away = games.filter(game => game.away === row.club);
    const rivals = games.map(game => saved.table.find(other => other.club === (game.home === row.club ? game.away : game.home))!);
    return { club: row.club, values: [row.pts, row.gf - row.ga, row.gf,
      away.reduce((sum, game) => sum + game.ag, 0), row.w,
      away.filter(game => game.ag > game.hg).length,
      rivals.reduce((sum, other) => sum + other.pts, 0),
      rivals.reduce((sum, other) => sum + other.gf - other.ga, 0),
      rivals.reduce((sum, other) => sum + other.gf, 0), -index] };
  });
  metrics.sort((a, b) => {
    for (let index = 0; index < a.values.length; index++) {
      if (a.values[index] !== b.values[index]) return b.values[index] - a.values[index];
    }
    return 0;
  });
  return metrics.map(row => row.club);
}

function wonPlayoffs(saved: UclLeagueStage): UclTie[] {
  return uclLeaguePlayoffs(saved, saved.table[0].club).map((tie, index) => ({
    ...tie, homeGoals: index % 2 ? 1 : 3, awayGoals: index % 2 ? 2 : 0,
    winner: index % 2 ? tie.away : tie.home,
    legs: 2,
    leg1: { homeGoals: index % 2 ? 1 : 2, awayGoals: index % 2 ? 1 : 0 },
    leg2: { homeGoals: index % 2 ? 0 : 1, awayGoals: index % 2 ? 1 : 0 },
  }));
}

describe('Club Manager modern European league phase', () => {
  it('uses the complete actual modern qualification model without mutating its field or drawing global randomness', () => {
    const clubs = field();
    const before = JSON.stringify(clubs);
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('global random read'); });
    try {
      const saved = createUclLeagueStage(clubs, clubs[0], 0)!;
      expect(saved.table.map(row => row.club).sort()).toEqual([...clubs].sort());
      expect(saved.table).toEqual(saved.table.map(({ club }) => ({ club, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 })));
      expect(saved.matchday).toBe(0);
      expect(saved.results).toEqual([]);
      expect(JSON.stringify(clubs)).toBe(before);
      expect(random).not.toHaveBeenCalled();
    } finally { random.mockRestore(); }
  });

  it.each([0, 1, 7, 31, 2026, 4294967295])('conserves all 36 entrants and 144 distinct games with eight opponents and four home games at seed %s', seed => {
    const saved = stage(seed);
    const clubs = field();
    const pairs = new Set<string>();
    for (const games of saved.fixtures) {
      expect(games).toHaveLength(18);
      expect(games.flat().sort()).toEqual([...clubs].sort());
      for (const [home, away] of games) {
        expect(home).not.toBe(away);
        const key = JSON.stringify([home, away].sort());
        expect(pairs.has(key)).toBe(false);
        pairs.add(key);
      }
    }
    expect(pairs.size).toBe(144);
    for (const club of clubs) {
      const games = saved.fixtures.flat().filter(pair => pair.includes(club));
      expect(games).toHaveLength(8);
      expect(games.filter(([home]) => home === club)).toHaveLength(4);
      expect(games.filter(([, away]) => away === club)).toHaveLength(4);
      expect(new Set(games.map(([home, away]) => home === club ? away : home)).size).toBe(8);
    }
    expect(saved.opponents).toEqual(saved.fixtures.map(games => games.find(pair => pair.includes(clubs[0]))!).map(([home, away]) => home === clubs[0] ? away : home));
    expect(isUclLeagueStage(saved)).toBe(true);
  });

  it('replays the whole seeded schedule after serialization while genuine other seeds change the draw', () => {
    const expected = stage(31);
    expect(stage(31)).toEqual(JSON.parse(JSON.stringify(expected)));
    expect(new Set([0, 1, 7, 31].map(seed => JSON.stringify(stage(seed).fixtures))).size).toBeGreaterThan(1);
  });

  it.each([0, 1, 2, 4, 7, 8])('reconstructs every table field independently after %s completed matchdays', days => {
    const saved = completed(days);
    expect(isUclLeagueStage(saved)).toBe(true);
    expect(saved.results).toHaveLength(18 * days);
    expect(saved.table.every(row => row.w + row.d + row.l === days)).toBe(true);
    expect(saved.table.reduce((sum, row) => sum + row.gf, 0)).toBe(saved.table.reduce((sum, row) => sum + row.ga, 0));
    expect(saved.table.reduce((sum, row) => sum + row.w, 0)).toBe(saved.table.reduce((sum, row) => sum + row.l, 0));
    expect(saved.table).toEqual(totals(saved));
  });

  it('orders complete saved outcomes by all supported sporting tiebreaks and leaves the whole saved stage unchanged', () => {
    const saved = completed();
    const before = JSON.stringify(saved);
    expect(sortedUclLeague(saved).map(row => row.club)).toEqual(rankOracle(saved));
    expect(JSON.stringify(saved)).toBe(before);
    expect(sortedUclLeague(stage()).map(row => row.club)).toEqual(stage().table.map(row => row.club));
  });

  it('gives exactly places 9-24 a playoff and sends all eight byes plus eight actual winners into a full round of 16', () => {
    const saved = completed();
    const ranked = rankOracle(saved);
    const playoff = wonPlayoffs(saved);
    expect(playoff).toHaveLength(8);
    expect(playoff.flatMap(tie => [tie.home, tie.away]).sort()).toEqual(ranked.slice(8, 24).sort());
    expect(new Set(playoff.flatMap(tie => [tie.home, tie.away])).size).toBe(16);
    for (const club of ranked) {
      const index = ranked.indexOf(club);
      expect(uclLeaguePlayoffs(saved, club).filter(tie => tie.mine)).toHaveLength(index >= 8 && index < 24 ? 1 : 0);
      const round = uclLeagueRoundOf16(saved, playoff, club)!;
      expect(round).toHaveLength(8);
      expect(round.flatMap(tie => [tie.home, tie.away]).sort()).toEqual([...ranked.slice(0, 8), ...playoff.map(tie => tie.winner!)].sort());
      expect(new Set(round.flatMap(tie => [tie.home, tie.away])).size).toBe(16);
      expect(round.every(tie => tie.round === 'R16' && tie.home !== tie.away)).toBe(true);
      expect(round.filter(tie => tie.mine)).toHaveLength(index < 8 || playoff.some(tie => tie.winner === club) ? 1 : 0);
    }
  });

  it.each([
    { label: 'missing stage', change: () => null },
    { label: 'null table row', change: (saved: UclLeagueStage) => { (saved.table as unknown[])[0] = null; return saved; } },
    { label: 'blank club', change: (saved: UclLeagueStage) => { saved.table[0].club = ' '; return saved; } },
    { label: 'negative wins', change: (saved: UclLeagueStage) => { saved.table[0].w = -1; return saved; } },
    { label: 'nonnumeric goals', change: (saved: UclLeagueStage) => { saved.table[0].gf = NaN; return saved; } },
    { label: 'wrong table points', change: (saved: UclLeagueStage) => { saved.table[0].pts++; return saved; } },
    { label: 'missing opponent', change: (saved: UclLeagueStage) => { saved.opponents.pop(); return saved; } },
    { label: 'duplicate opponent', change: (saved: UclLeagueStage) => { saved.opponents[0] = saved.opponents[1]; return saved; } },
    { label: 'duplicate fixture', change: (saved: UclLeagueStage) => { saved.fixtures[1][0] = [...saved.fixtures[0][0]]; return saved; } },
    { label: 'home imbalance', change: (saved: UclLeagueStage) => { saved.fixtures[0][0].reverse(); return saved; } },
    { label: 'missing completed result', change: (saved: UclLeagueStage) => { saved.results.pop(); return saved; } },
    { label: 'duplicate completed result', change: (saved: UclLeagueStage) => { saved.results[1] = { ...saved.results[0] }; return saved; } },
    { label: 'wrong directed result', change: (saved: UclLeagueStage) => { const first = saved.results[0]; [first.home, first.away] = [first.away, first.home]; return saved; } },
    { label: 'negative score', change: (saved: UclLeagueStage) => { saved.results[0].hg = -1; return saved; } },
    { label: 'fractional score', change: (saved: UclLeagueStage) => { saved.results[0].ag = 0.5; return saved; } },
    { label: 'future matchday', change: (saved: UclLeagueStage) => { saved.matchday = 9; return saved; } },
    { label: 'unsettled matchday', change: (saved: UclLeagueStage) => { saved.matchday--; return saved; } },
  ])('rejects $label without throwing or changing the supplied value', ({ change }) => {
    const value = change(completed());
    const before = structuredClone(value);
    expect(() => isUclLeagueStage(value)).not.toThrow();
    expect(isUclLeagueStage(value)).toBe(false);
    expect(value).toEqual(before);
  });

  it.each([
    { label: 'one missing tie', change: (ties: UclTie[]) => { ties.pop(); } },
    { label: 'unfinished tie', change: (ties: UclTie[]) => { ties[0].winner = null; } },
    { label: 'duplicate slot', change: (ties: UclTie[]) => { ties[1].slot = ties[0].slot; } },
    { label: 'foreign winner', change: (ties: UclTie[]) => { ties[0].winner = 'Not in this saved field'; } },
    { label: 'borrowed top-eight winner', change: (ties: UclTie[]) => { ties[0].winner = rankOracle(completed())[0]; } },
    { label: 'absent second leg', change: (ties: UclTie[]) => { delete ties[0].leg2; } },
    { label: 'wrong aggregate', change: (ties: UclTie[]) => { ties[0].homeGoals = 99; } },
    { label: 'wrong sporting winner', change: (ties: UclTie[]) => { ties[0].winner = ties[0].away; } },
  ])('holds the round of 16 closed for $label', ({ change }) => {
    const saved = completed();
    const ties = wonPlayoffs(saved);
    change(ties);
    const before = JSON.stringify({ saved, ties });
    expect(uclLeagueRoundOf16(saved, ties, saved.table[0].club)).toBeNull();
    expect(JSON.stringify({ saved, ties })).toBe(before);
  });

  it('holds the round of 16 closed before all eight actual matchdays are completed', () => {
    const final = completed();
    const playoffs = wonPlayoffs(final);
    const partial = completed(7);
    const before = JSON.stringify({ partial, playoffs });
    expect(uclLeagueRoundOf16(partial, playoffs, partial.table[0].club)).toBeNull();
    expect(JSON.stringify({ partial, playoffs })).toBe(before);
  });
  it.each([0, 35, 37])('rejects a field with %s clubs without a partial draw', size => {
    expect(createUclLeagueStage(field().slice(0, size).concat(size === 37 ? ['Extra fixture club'] : []), field()[0], 1)).toBeNull();
  });

  it.each([-1, 0.5, 4294967296, NaN])('rejects invalid seed %s', seed => {
    expect(createUclLeagueStage(field(), field()[0], seed)).toBeNull();
  });

  it('rejects duplicate entrants and a player club outside the saved field', () => {
    const clubs = field();
    const duplicate = [...clubs]; duplicate[1] = duplicate[0];
    expect(createUclLeagueStage(duplicate, clubs[0], 1)).toBeNull();
    expect(createUclLeagueStage(clubs, 'Not in this saved field', 1)).toBeNull();
  });
});

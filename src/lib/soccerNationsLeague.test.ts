import { describe, expect, it, vi } from 'vitest';
import { NATIONS_LEAGUE_2026_GROUPS, nationsLeague2026Fixtures, nationsLeague2026NextLeagues,
  nationsLeague2026GroupTables, simulateNationsLeague2026Groups, simulateNationsLeague2026 } from './soccerNationsLeague';

describe('Soccer Career 2026/27 Nations League transition', () => {
  it('creates a full home and away group schedule for the 54 nations', () => {
    const groups = Object.values(NATIONS_LEAGUE_2026_GROUPS);
    const nations = groups.flat();
    expect(groups.map(group => group.length)).toEqual([...Array(12).fill(4), 3, 3]);
    expect(new Set(nations).size).toBe(54);
    const fixtures = nationsLeague2026Fixtures();
    expect(fixtures).toHaveLength(156);
    expect(new Set(fixtures.map(match => [match.home, match.away].join('|'))).size).toBe(fixtures.length);
    for (const group of groups) {
      for (const nation of group) {
        const home = fixtures.filter(match => match.home === nation).map(match => match.away);
        const away = fixtures.filter(match => match.away === nation).map(match => match.home);
        const opponents = group.filter(member => member !== nation);
        expect(home.sort()).toEqual([...opponents].sort());
        expect(away.sort()).toEqual([...opponents].sort());
      }
    }
  });

  it('uses the two third and fourth place boundaries and both play-off movements', () => {
    const division = (league: 'A' | 'B' | 'C' | 'D') => Object.entries(NATIONS_LEAGUE_2026_GROUPS)
      .filter(([group]) => group.startsWith(league)).map(([, group]) => group);
    const inFinishingOrder = (league: 'A' | 'B' | 'C' | 'D') => {
      const groups = division(league);
      return Array.from({ length: groups[0].length }, (_, place) => groups.map(group => group[place])).flat();
    };
    const ordered = inFinishingOrder('A');
    const b = inFinishingOrder('B');
    const c = inFinishingOrder('C');
    const d = inFinishingOrder('D');
    const ab = [ordered[10], ordered[11], ordered[12], ordered[13]].map((home, index) => ({
      home, away: b[4 + index], winner: index < 2 ? home : b[4 + index],
    }));
    const bc = b.slice(12).map((home, index) => ({
      home, away: c[4 + index], winner: index < 2 ? c[4 + index] : home,
    }));
    const ranked = { A: ordered, B: b, C: c, D: d };
    const next = nationsLeague2026NextLeagues(ranked, ab, bc);
    expect(next?.A).toEqual([...ordered.slice(0, 10), ...b.slice(0, 4), ...ab.map(tie => tie.winner)]);
    expect(next?.B).toEqual([
      ...ordered.slice(14), ...ab.map(tie => tie.winner === tie.home ? tie.away : tie.home),
      ...b.slice(8, 12), ...c.slice(0, 4), ...bc.map(tie => tie.winner),
    ]);
    expect(next?.C).toEqual([
      ...bc.map(tie => tie.winner === tie.home ? tie.away : tie.home), ...c.slice(8), ...d,
    ]);
    expect(Object.values(next!).map(league => league.length)).toEqual([18, 18, 18]);
    expect(new Set(Object.values(next!).flat()).size).toBe(54);
    expect(nationsLeague2026NextLeagues(ranked, ab.slice(1), bc)).toBeNull();
    expect(nationsLeague2026NextLeagues({ ...ranked, D: [...d.slice(0, 5), 'Brazil'] }, ab, bc)).toBeNull();
    expect(nationsLeague2026NextLeagues(ranked, ab, [bc[0], bc[0], ...bc.slice(2)])).toBeNull();
    expect(nationsLeague2026NextLeagues(ranked, [{ ...ab[0], winner: ordered[0] }, ...ab.slice(1)], bc)).toBeNull();
  });

  it('ranks the level nations by their direct games before overall goal difference', () => {
    const scores = new Map([
      ['Spain|England', [0, 1]], ['England|Spain', [1, 0]],
      ['Spain|Croatia', [9, 0]], ['Croatia|Spain', [0, 9]],
      ['Spain|Czech Republic', [9, 0]], ['Czech Republic|Spain', [0, 9]],
      ['England|Croatia', [1, 0]], ['Croatia|England', [1, 0]],
      ['England|Czech Republic', [1, 0]], ['Czech Republic|England', [1, 0]],
    ]);
    const matches = nationsLeague2026Fixtures().map(fixture => {
      const [homeGoals, awayGoals] = scores.get(fixture.home + '|' + fixture.away) ?? [0, 0];
      return { ...fixture, homeGoals, awayGoals };
    });
    const a3 = nationsLeague2026GroupTables(matches).A3;
    expect(a3.slice(0, 2).map(row => [row.nation, row.points])).toEqual([['England', 12], ['Spain', 12]]);
    expect(a3[0].gf - a3[0].ga).toBeLessThan(a3[1].gf - a3[1].ga);
  });

  it('uses a local seed and reconciles every club tally to its fixtures', () => {
    const random = vi.spyOn(Math, 'random');
    try {
      const result = simulateNationsLeague2026Groups('my career');
      expect(simulateNationsLeague2026Groups('my career')).toEqual(result);
      expect(simulateNationsLeague2026Groups('a different career')).not.toEqual(result);
      expect(random).not.toHaveBeenCalled();
      const rows = Object.values(result.tables).flat();
      expect(rows).toHaveLength(54);
      for (const row of rows) {
        const games = result.matches.filter(match => match.home === row.nation || match.away === row.nation);
        const own = games.reduce((sum, match) => sum + (match.home === row.nation ? match.homeGoals : match.awayGoals), 0);
        expect(row.played).toBe(games.length);
        expect(row.gf).toBe(own);
        expect(row.points).toBe(3 * row.won + row.drawn);
      }
    } finally {
      random.mockRestore();
    }
  });

  it('plays the correct home legs, playoffs and final four and seeds the next edition', () => {
    const seasons = Array.from({ length: 24 }, (_, i) => simulateNationsLeague2026(`knockouts ${i}`));
    for (const season of seasons) {
      const { tables, rankings, quarterfinals, ab, bc, semifinals, final, thirdPlace, nextLeagues } = season;
      const groupOf = (nation: string) => Object.entries(tables).find(([, rows]) => rows.some(row => row.nation === nation))?.[0];
      expect(quarterfinals.map(tie => tie.away)).toEqual(rankings.A.slice(0, 4));
      expect([...quarterfinals.map(tie => tie.home)].sort()).toEqual(rankings.A.slice(4, 8).sort());
      expect(ab.map(tie => tie.away)).toEqual(rankings.A.slice(10, 14));
      expect(bc.map(tie => tie.away)).toEqual(rankings.B.slice(12));
      expect(quarterfinals.every(tie => groupOf(tie.home) !== groupOf(tie.away))).toBe(true);
      for (const tie of [...quarterfinals, ...ab, ...bc]) {
        const [first, second] = tie.legs;
        expect([first.home, first.away, second.home, second.away]).toEqual([tie.home, tie.away, tie.away, tie.home]);
        const margin = first.homeGoals + second.awayGoals - first.awayGoals - second.homeGoals;
        expect(Boolean(second.extraTime)).toBe(margin === 0);
        const resolved = margin + (second.extraTime?.awayGoals ?? 0) - (second.extraTime?.homeGoals ?? 0);
        expect(Boolean(second.penalties)).toBe(resolved === 0);
        if (resolved !== 0) expect(tie.winner).toBe(resolved > 0 ? tie.home : tie.away);
      }
      const finalists = semifinals.map(match => match.winner);
      expect([final.home, final.away]).toEqual(finalists);
      expect([thirdPlace.home, thirdPlace.away]).toEqual(semifinals.map(match => match.winner === match.home ? match.away : match.home));
      expect(thirdPlace.extraTime).toBeUndefined();
      expect(Boolean(thirdPlace.penalties)).toBe(thirdPlace.homeGoals === thirdPlace.awayGoals);
      expect(nextLeagues.A.slice(0, 4)).toEqual([final.winner, finalists.find(nation => nation !== final.winner), thirdPlace.winner, thirdPlace.winner === thirdPlace.home ? thirdPlace.away : thirdPlace.home]);
      expect(Object.values(nextLeagues).map(league => league.length)).toEqual([18, 18, 18]);
      expect(new Set(Object.values(nextLeagues).flat()).size).toBe(54);
    }
    expect(seasons.some(season => season.quarterfinals.some(tie => tie.legs[1].penalties))).toBe(true);
    expect(seasons.some(season => season.thirdPlace.penalties)).toBe(true);
  });
});

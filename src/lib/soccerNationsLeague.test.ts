import { describe, expect, it, vi } from 'vitest';
import { NATIONS_LEAGUE_2026_GROUPS, nationsLeague2026Fixtures, nationsLeague2026NextLeagues,
  nationsLeague2026GroupTables, simulateNationsLeague2026Groups, simulateNationsLeague2026,
  simulateNationsLeague2028, nationsLeagueCampaign } from './soccerNationsLeague';

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

describe('Soccer Career 2028/29 Nations League format', () => {
  it('uses the previous finish to draw three pots and balances home and away against each pot', () => {
    const seed = '2028 start';
    const previous = simulateNationsLeague2026(seed);
    const result = simulateNationsLeague2028(seed);
    expect(result).toEqual(simulateNationsLeague2028(seed));
    expect(result.matches).toHaveLength(162);
    expect(Object.keys(result.tables)).toHaveLength(9);
    for (const [group, table] of Object.entries(result.tables)) {
      const league = group[0] as 'A' | 'B' | 'C';
      const pot = (nation: string) => Math.floor(previous.nextLeagues[league].indexOf(nation) / 6);
      const nations = table.map(row => row.nation);
      expect(nations.map(pot).sort()).toEqual([0, 0, 1, 1, 2, 2]);
      for (const row of table) {
        const home = result.matches.filter(match => match.home === row.nation);
        const away = result.matches.filter(match => match.away === row.nation);
        expect(row.played).toBe(6);
        expect(home.map(match => pot(match.away)).sort()).toEqual([0, 1, 2]);
        expect(away.map(match => pot(match.home)).sort()).toEqual([0, 1, 2]);
        const shared = home.filter(match => away.some(other => other.home === match.away)).map(match => match.away);
        expect(shared).toEqual(nations.filter(nation => nation !== row.nation && pot(nation) === pot(row.nation)));
      }
    }
  });

  it('sends six first or second and two third-place teams to the quarterfinals, plus six ties at each league boundary', () => {
    for (let i = 0; i < 18; i++) {
      const { rankings, quarterfinals, ab, bc, nextLeagues } = simulateNationsLeague2028(`new format ${i}`);
      const participants = (ties: typeof quarterfinals) => ties.flatMap(tie => [tie.home, tie.away]);
      expect(participants(quarterfinals).sort()).toEqual([...rankings.A.slice(0, 8)].sort());
      expect(participants(ab).sort()).toEqual([...rankings.A.slice(9, 15), ...rankings.B.slice(3, 9)].sort());
      expect(participants(bc).sort()).toEqual([...rankings.B.slice(9, 15), ...rankings.C.slice(3, 9)].sort());
      expect(Object.values(nextLeagues).map(league => league.length)).toEqual([18, 18, 18]);
      expect(new Set(Object.values(nextLeagues).flat()).size).toBe(54);
      expect(nextLeagues.A).toEqual(expect.arrayContaining([...ab.map(tie => tie.winner), ...rankings.B.slice(0, 3)]));
      expect(nextLeagues.B).toEqual(expect.arrayContaining([...bc.map(tie => tie.winner), ...rankings.A.slice(15), ...rankings.C.slice(0, 3)]));
      expect(nextLeagues.C).toEqual(expect.arrayContaining(rankings.B.slice(15)));
    }
  });
});

describe('Nations League career receipts', () => {
  it('holds the same results for selected, unavailable and retired players', () => {
    const form = { overall: 97, lastRating: 8, lastGoals: 28, position: 'ST', age: 26, isCaptain: false };
    const random = vi.spyOn(Math, 'random');
    try {
      for (const year of [2026, 2028, 2030]) {
        const player = nationsLeagueCampaign(year, 'career record', 'France', form)!;
        const absent = nationsLeagueCampaign(year, 'career record', 'France', null)!;
        const decoded = JSON.parse(JSON.stringify(player));
        expect(decoded).toEqual(player);
        expect(player.selected).toBe(true);
        expect(absent.selected).toBe(false);
        expect([absent.apps, absent.goals, absent.assists, absent.rating]).toEqual([0, 0, 0, 0]);
        expect(player.matches.map(({ player: _line, ...match }) => match)).toEqual(absent.matches);
        expect([player.group, player.result, player.champion, player.nextLeague]).toEqual([absent.group, absent.result, absent.champion, absent.nextLeague]);
        expect(player.apps).toBe(player.matches.filter(match => match.player).length);
        expect(player.goals).toBe(player.matches.reduce((sum, match) => sum + (match.player?.goals ?? 0), 0));
        expect(player.assists).toBe(player.matches.reduce((sum, match) => sum + (match.player?.assists ?? 0), 0));
        for (const match of player.matches) {
          const goals = match.home === player.nation ? match.homeGoals + (match.extraTime?.homeGoals ?? 0) : match.awayGoals + (match.extraTime?.awayGoals ?? 0);
          expect((match.player?.goals ?? 0) + (match.player?.assists ?? 0)).toBeLessThanOrEqual(goals);
        }
      }
      expect(nationsLeagueCampaign(2027, 'career record', 'France', form)).toBeUndefined();
      expect(nationsLeagueCampaign(2028, 'career record', 'Argentina', form)).toBeUndefined();
      expect(nationsLeagueCampaign(2024, 'career record', 'France', form)).toBeUndefined();
      expect(random).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
    }
  });
});

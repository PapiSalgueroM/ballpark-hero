import { describe, expect, it } from 'vitest';
import { NATIONS_LEAGUE_2026_GROUPS, nationsLeague2026Fixtures, nationsLeague2026NextLeagues } from './soccerNationsLeague';

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
});

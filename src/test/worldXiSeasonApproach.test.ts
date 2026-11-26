import { describe, expect, it } from 'vitest';
import { simulateWorldXiSeason, whatIfFinish, worldXiMatchOdds, settleXiTable, tablePoints, type WxPlayer } from '@/lib/worldXi';

const cards: [string, string, WxPlayer['position'], number, number][] = [
  ['Alisson', 'Brazil', 'GK', 31, 29],
  ['Achraf Hakimi', 'Morocco', 'RB', 26, 55],
  ['Virgil van Dijk', 'Netherlands', 'CB', 32, 30],
  ['Ruben Dias', 'Portugal', 'CB', 27, 67],
  ['Theo Hernandez', 'France', 'LB', 27, 59],
  ['Rodri', 'Spain', 'CDM', 28, 103],
  ['Jude Bellingham', 'England', 'CAM', 22, 146],
  ['Federico Valverde', 'Uruguay', 'CM', 26, 91],
  ['Mohamed Salah', 'Egypt', 'RW', 32, 63],
  ['Erling Haaland', 'Norway', 'ST', 25, 175],
  ['Khvicha Kvaratskhelia', 'Georgia', 'LW', 24, 75],
];
const squad = (keeperValue = 29): WxPlayer[] => cards.map(([name, country, position, age, value], index) => ({
  name, country, position, age, value: Math.round((index === 0 ? keeperValue : value) * 1_000_000), club: 'Fixture club',
}));
const shape = '4-3-3';

describe('World XI season approach', () => {
  it('replays a riskier fixture, preserves expected points and reconciles home and away points', () => {
    for (const players of [squad(), squad().map(p => ({ ...p, value: 0 })), squad().map(p => ({ ...p, value: 1_000_000_000 }))]) {
      const balanced = worldXiMatchOdds(players, 'balanced');
      const attack = worldXiMatchOdds(players, 'attack');
      expect(attack.win).toBeGreaterThan(balanced.win);
      expect(attack.draw).toBeLessThan(balanced.draw);
      expect(attack.loss).toBeGreaterThan(balanced.loss);
      expect(attack.win + attack.draw + attack.loss).toBeCloseTo(1, 12);
      expect(attack.win * 3 + attack.draw).toBeCloseTo(balanced.win * 3 + balanced.draw, 12);
    }
    const players = squad();
    const report = simulateWorldXiSeason(players, shape, undefined, 'attack');
    expect(simulateWorldXiSeason(players, shape, undefined, 'attack')).toEqual(report);
    expect(report.narrative).toContain('On the same rolls, Balanced would finish 3rd with 105 points and 0 draws.');
    expect(report.venuePoints!.home + report.venuePoints!.away).toBe(report.points);
    expect(report.venuePoints!.home).toBeLessThanOrEqual(57);
    expect(report.venuePoints!.away).toBeLessThanOrEqual(57);
    expect(simulateWorldXiSeason(players, shape, undefined, 'protect').venuePoints).toBeUndefined();
  });

  it('previews the same expected points with more draws and fewer wins and losses', () => {
    for (const players of [squad(), squad().map(p => ({ ...p, value: 0 })), squad().map(p => ({ ...p, value: 1_000_000_000 }))]) {
      const balanced = worldXiMatchOdds(players, 'balanced');
      const protect = worldXiMatchOdds(players, 'protect');
      expect(protect.win).toBeLessThan(balanced.win);
      expect(protect.draw).toBeGreaterThan(balanced.draw);
      expect(protect.loss).toBeLessThan(balanced.loss);
      expect(protect.win + protect.draw + protect.loss).toBeCloseTo(1, 12);
      expect(protect.win * 3 + protect.draw).toBeCloseTo(balanced.win * 3 + balanced.draw, 12);
    }
  });

  it('turns a three-loss fixture into an unbeaten season and improves the finish on the same rolls', () => {
    const players = squad();
    const usual = simulateWorldXiSeason(players, shape);
    const protect = simulateWorldXiSeason(players, shape, undefined, 'protect');

    expect(usual).toMatchObject({ squadRating: 87, points: 105, tablePosition: 3, record: { wins: 35, draws: 0, losses: 3 }, unbeatenRun: 24 });
    expect(protect).toMatchObject({ squadRating: 87, points: 108, tablePosition: 2, record: { wins: 35, draws: 3, losses: 0 }, unbeatenRun: 38 });
    expect(protect.narrative).toContain('On the same rolls, Balanced would finish 3rd with 105 points and 0 draws.');
    expect(protect.months!.reduce((total, month) => total + month.draws, 0)).toBe(3);
    expect(protect.playerStats!.reduce((total, player) => total + player.goals, 0)).toBe(protect.goalsFor);
    expect(protect.injuries).toEqual(usual.injuries);
  });

  it('can cost a league place even as it avoids defeat', () => {
    const players = squad(29.4);
    expect(simulateWorldXiSeason(players, shape)).toMatchObject({ points: 111, tablePosition: 2, record: { wins: 37, draws: 0, losses: 1 } });
    expect(simulateWorldXiSeason(players, shape, undefined, 'protect')).toMatchObject({
      points: 110, tablePosition: 3, record: { wins: 36, draws: 2, losses: 0 },
    });
  });

  it('replays shape and pick changes on the selected approach', () => {
    const players = squad();
    const protect = simulateWorldXiSeason(players, shape, undefined, 'protect');
    expect(whatIfFinish(players, shape, { approach: 'protect' })).toEqual({ points: protect.points, tablePosition: protect.tablePosition });
    const whatIf = protect.whatIf!;
    expect(whatIf).toMatchObject({ pointsFrom: protect.points, finishFrom: protect.tablePosition });
    expect(whatIf.kind).not.toBe('none');
    const alt = whatIf.kind === 'formation' ? { formation: whatIf.alternative } : { liftWeakest: true };
    expect(whatIfFinish(players, shape, { ...alt, approach: 'protect' })).toEqual({ points: whatIf.pointsTo, tablePosition: whatIf.finishTo });
  });

  it('keeps the implicit Balanced report exact with and without Build Your XI fit adjustments', () => {
    const players = squad();
    expect(simulateWorldXiSeason(players, shape, undefined, 'balanced')).toEqual(simulateWorldXiSeason(players, shape));
    const fit = { roleFit: -0.75, chemistry: 1.25, balance: 0.9 };
    expect(simulateWorldXiSeason(players, shape, fit, 'balanced')).toEqual(simulateWorldXiSeason(players, shape, fit));
  });
});

describe('Build Your XI head-to-head standings', () => {
  it('gives every rival the opposite result from each home and away game against your XI', () => {
    const won = settleXiTable(17, Array(38).fill('W'));
    const lost = settleXiTable(17, Array(38).fill('L'));
    expect(won.sharedFixtures).toEqual(lost.sharedFixtures);
    const teams = (league: typeof won) => [...league.leagueTable].sort((a, b) => a.team - b.team);
    const wins = teams(won), losses = teams(lost);
    expect(wins[0].wins).toBe(38);
    expect(losses[0].losses).toBe(38);
    for (let team = 1; team < 20; team++) {
      expect(won.sharedFixtures.filter(f => f.rival === team - 1).map(f => f.home).sort()).toEqual([false, true]);
      expect(losses[team].wins - wins[team].wins).toBe(2);
      expect(wins[team].losses - losses[team].losses).toBe(2);
      expect(wins[team].draws).toBe(losses[team].draws);
    }
  });

  it('ranks all twenty teams using one set of 380 games and replays the same table for a what-if', () => {
    for (const value of [2, 20, 29, 47, 70]) {
      const players = squad(value);
      const report = simulateWorldXiSeason(players, shape, undefined, 'balanced', 'round-robin');
      const table = report.leagueTable!;
      expect(new Set(table.map(row => row.team)).size).toBe(20);
      expect(table[report.tablePosition - 1]).toMatchObject({ team: 0, ...report.record });
      expect(table.map(tablePoints)).toEqual(table.map(tablePoints).sort((a, b) => b - a));
      const wins = table.reduce((sum, row) => sum + row.wins, 0);
      const losses = table.reduce((sum, row) => sum + row.losses, 0);
      const draws = table.reduce((sum, row) => sum + row.draws, 0) / 2;
      expect(wins).toBe(losses);
      expect(wins + draws).toBe(380);
      let leadingPoints = 0;
      table.forEach((row, i) => {
        expect(row.wins + row.draws + row.losses).toBe(38);
        const k = i + 1;
        leadingPoints += tablePoints(row);
        expect(leadingPoints).toBeLessThanOrEqual(3 * k * (39 - k));
      });
      expect(whatIfFinish(players, shape, { table: 'round-robin' })).toEqual({ points: report.points, tablePosition: report.tablePosition });
      expect(simulateWorldXiSeason(players, shape).points).toBe(report.points);
    }
  });
});

/**
 * Round 1329: the boundary between football that happened and the game's own
 * future, the "was he at the finals" test, and the month award.
 * scripts/simSoccerWorldTruth.mjs measures the same rules at scale.
 */
import { describe, it, expect } from 'vitest';
import {
  LAST_PLAYED_SEASON, LAST_PLAYED_SUMMER, LAST_REAL_YEAR, seasonHappened, summerHappened, playedFinals,
  tournamentWinnerShown, monthYear, MONTHS, monthAwards, seasonLabel, feedPastSeasonLine, feedFutureSeasonLine,
  MONTH_AWARD_MAX, type MonthGroup,
} from '@/lib/soccerWorldTruth';
import { runInternationalSummer } from '@/lib/soccerInternationalSquads';
import { keyedRng } from '@/lib/keyedRng';

const DASHES = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];

describe('the boundary', () => {
  it('holds the 2025-26 seasons and the 2026 summer as played, and nothing after', () => {
    expect(LAST_PLAYED_SEASON).toBe(2025);
    expect(LAST_PLAYED_SUMMER).toBe(2026);
    expect(LAST_REAL_YEAR).toBe(2032);
    expect([2024, 2025, 2026, 2027].map(seasonHappened)).toEqual([true, true, false, false]);
    expect([2025, 2026, 2027, 2028].map(summerHappened)).toEqual([true, true, false, false]);
    expect(seasonHappened(1990)).toBe(true);
  });

  it('knows a summer at the finals from one at home, for every result the engine writes', () => {
    const stages = ['Group Stage', 'Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Runner-up', 'Winner'];
    for (const r of stages) expect(playedFinals(r)).toBe(true);
    for (const r of ['Did Not Qualify', 'Not Selected', '', null, undefined]) expect(playedFinals(r)).toBe(false);
  });

  it('shows who won a tournament only for a summer still to come or finals he played', () => {
    expect(tournamentWinnerShown(2006, 'Did Not Qualify')).toBe(false);
    expect(tournamentWinnerShown(2006, '')).toBe(false);
    expect(tournamentWinnerShown(2006, 'Quarter-final')).toBe(true);
    expect(tournamentWinnerShown(2026, 'Not Selected')).toBe(false);
    expect(tournamentWinnerShown(2027, 'Not Selected')).toBe(true);
    expect(tournamentWinnerShown(2030, '')).toBe(true);
  });

  it('never hands a stage result to a summer played without him (the engine passes no form then)', () => {
    let qualified = 0;
    for (let i = 0; i < 40; i += 1) {
      for (const nation of ['Brazil', 'France', 'England', 'Argentina']) {
        const t = runInternationalSummer(nation, 2006, null);
        expect(t).not.toBeNull();
        expect(['Did Not Qualify', 'Not Selected']).toContain(t!.myResult);
        if (t!.qualified) qualified += 1;
      }
    }
    expect(qualified).toBeGreaterThan(0);
  });

  it('writes its feed lines in plain words with no dash', () => {
    expect(seasonLabel(2027)).toBe('2027-28');
    expect(seasonLabel(1999)).toBe('1999-00');
    for (const line of [feedPastSeasonLine(1998), feedFutureSeasonLine(2027)]) {
      for (const d of DASHES) expect(line.includes(d)).toBe(false);
      expect(line).not.toMatch(/^🏆 .+ win (the )?.+\.$/u);
      expect(line).not.toMatch(/champions of Europe/);
      expect(line).not.toMatch(/DONE DEAL/);
    }
  });
});

describe('the month and its year', () => {
  it('puts August to December in the season year and January to May in the next', () => {
    expect(MONTHS.length).toBe(10);
    expect(MONTHS.map(m => monthYear(m, 1992))).toEqual([1992, 1992, 1992, 1992, 1992, 1993, 1993, 1993, 1993, 1993]);
    expect(monthYear('April', 1992)).toBe(1993);
  });
});

describe('Player of the Month', () => {
  const row = (o: Partial<{ apps: number; goals: number; assists: number; cleanSheets: number; rating: number; injuryWeeks: number }>) =>
    ({ apps: 34, goals: 0, assists: 0, cleanSheets: 0, rating: 7, injuryWeeks: 0, ...o });
  const won = (r: ReturnType<typeof row>, g: MonthGroup, n: number) => {
    let total = 0, seasons = 0;
    for (let i = 0; i < n; i += 1) {
      const m = monthAwards(r, g, keyedRng(`id ${i}|2010|potm`));
      total += m.length; if (m.length) seasons += 1;
    }
    return { mean: total / n, any: seasons / n };
  };

  it('never goes to a 6.0 keeper with no goals, nor to a season under ten games', () => {
    expect(won(row({ rating: 6, cleanSheets: 20 }), 'GK', 2000).any).toBe(0);
    expect(won(row({ apps: 8, goals: 6, rating: 8.6 }), 'ATT', 2000).any).toBe(0);
  });

  it('goes to a keeper or a defender on his own football, and to a great season far more than a fair one', () => {
    expect(won(row({ rating: 8.3, cleanSheets: 16 }), 'GK', 2000).mean).toBeGreaterThan(1);
    expect(won(row({ rating: 8.3, cleanSheets: 14, goals: 2 }), 'DEF', 2000).mean).toBeGreaterThan(1);
    const fair = won(row({ rating: 7.2, goals: 10, assists: 4 }), 'ATT', 2000);
    const great = won(row({ rating: 8.4, goals: 22, assists: 9 }), 'ATT', 2000);
    expect(fair.any).toBeLessThan(0.2);
    expect(great.mean).toBeGreaterThan(fair.mean * 5);
  });

  it('never wins more than four, keeps calendar order, and gives nothing in a month an injury took', () => {
    for (let i = 0; i < 500; i += 1) {
      const m = monthAwards(row({ rating: 9.5, goals: 30, injuryWeeks: 20 }), 'ATT', keyedRng(`inj ${i}`));
      expect(m.length).toBeLessThanOrEqual(MONTH_AWARD_MAX);
      const idx = m.map(x => (MONTHS as readonly string[]).indexOf(x));
      expect(idx).toEqual([...idx].sort((a, b) => a - b));
    }
    expect(won(row({ rating: 9.5, goals: 30, injuryWeeks: 36 }), 'ATT', 2000).mean).toBeLessThanOrEqual(1);
  });

  it('is the same months for the same stream', () => {
    const r = row({ rating: 8.2, goals: 18, assists: 6 });
    expect(monthAwards(r, 'ATT', keyedRng('k'))).toEqual(monthAwards(r, 'ATT', keyedRng('k')));
  });
});

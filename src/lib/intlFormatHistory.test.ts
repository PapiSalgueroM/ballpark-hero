import { describe, expect, it } from 'vitest';
import {
  INTL_FORMAT_PERIODS, INTL_FORMAT_PARTIAL, periodInForce, playedPeriod, wcFieldMixFor,
} from './intlFormatHistory';
import { managerFormatYear, tournamentForYear, WC_SLOTS } from './soccerInternational';

/* Round 1027. The heavy walk lives in scripts/simIntlFormatHistory.mjs; these
   pin the lookups a reader of the table relies on. */

describe('intl format history lookups', () => {
  it('finds the row in force by its first edition', () => {
    expect(periodInForce('WC', 1994).id).toBe('wc-24');
    expect(periodInForce('WC', 1998).id).toBe('wc-32');
    expect(periodInForce('WC', 2022).id).toBe('wc-32');
    expect(periodInForce('WC', 2026).id).toBe('wc-48');
    expect(periodInForce('UEFA', 2012).id).toBe('euro-16');
    expect(periodInForce('CONMEBOL', 2020).id).toBe('copa-2019');
  });

  it('never reaches the 2021 Copa row from a game year, and says so', () => {
    const reached = new Set<string>();
    // Continental game years are the years divisible by four.
    for (let y = 1992; y <= 2040; y += 4) reached.add(periodInForce('CONMEBOL', y).id);
    expect(reached.has('copa-2019')).toBe(true);
    expect(reached.has('copa-2021')).toBe(false);
    expect(INTL_FORMAT_PERIODS.find(p => p.id === 'copa-2021')?.note).toMatch(/never reaches this row/);
  });

  it('cites two publishers for the OFC gap, so it is not thin', () => {
    expect(INTL_FORMAT_PARTIAL).not.toContain('ofc-gap');
    expect(INTL_FORMAT_PERIODS.find(p => p.id === 'ofc-gap')?.sources).toEqual(['rsOfc', 'ofc1996']);
  });

  it('plays a shape the engine cannot play as its nearest verified row', () => {
    expect(playedPeriod(periodInForce('CONMEBOL', 1992)).id).toBe('copa-12');
    expect(playedPeriod(periodInForce('CONCACAF', 1996)).id).toBe('gold-8');
    expect(playedPeriod(periodInForce('OFC', 2008)).id).toBe('ofc-8');
    for (const p of INTL_FORMAT_PERIODS.filter(r => !r.playable)) {
      expect(playedPeriod(p).playable).toBe(true);
    }
  });

  it('keeps thin rows out of play', () => {
    for (const id of INTL_FORMAT_PARTIAL) {
      const row = INTL_FORMAT_PERIODS.find(p => p.id === id);
      expect(row?.playable).toBe(false);
    }
  });

  it('fills every World Cup to its own size', () => {
    for (let y = 1990; y <= 2038; y += 4) {
      const mix = wcFieldMixFor(y);
      const sum = Object.values(mix.places).reduce((a, b) => a + b, 0) + mix.open;
      expect(sum).toBe(periodInForce('WC', y).teams);
    }
    expect(wcFieldMixFor(2030).places).toEqual(WC_SLOTS);
  });
});

describe('tournamentForYear by era', () => {
  it('plays a 1994 World Cup with 24 teams and a round of 16', () => {
    const f = tournamentForYear('Brazil', 1994);
    expect(f?.teams).toBe(24);
    expect(f?.thirdsThrough).toBe(4);
    expect(f?.firstRound).toBe('R16');
  });

  it('plays a 1996 Euros with 16 teams and the 2028 one with 24', () => {
    expect(tournamentForYear('France', 1996)?.teams).toBe(16);
    expect(tournamentForYear('France', 2028)?.teams).toBe(24);
  });

  it('keeps the 2026 World Cup as it was', () => {
    const f = tournamentForYear('Brazil', 2026);
    expect(f).toMatchObject({ teams: 48, groups: 12, thirdsThrough: 8, finalists: 48, firstRound: 'R32' });
  });

  it('has no tournament in an off year', () => {
    expect(tournamentForYear('Brazil', 1995)).toBeNull();
  });
});

describe('Club Manager season counters', () => {
  it('reads a counter as the modern year on the same cycle, and a year as itself', () => {
    expect([1, 2, 3, 4, 40].map(managerFormatYear)).toEqual([2025, 2026, 2027, 2028, 2028]);
    expect(managerFormatYear(1996)).toBe(1996);
    expect(tournamentForYear('England', managerFormatYear(4))?.teams).toBe(24);
  });
});

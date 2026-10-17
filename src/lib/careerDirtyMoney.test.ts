/* Round 1500: the dirty money desk, unit by unit (src/lib/careerDirtyMoney.ts). The deck cards and the board have
   their own tests (src/test/usCareerDirtyMoney.test.tsx) and scripts/simUsDirtyMoney.mjs proves the desk is never
   a heat eraser over every corruption card of the four sports. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { keyedRng } from '@/lib/keyedRng';
import {
  CLEAN_HEAT_CAP, DIRTY_WAYS, GIVE_KARMA_CAP, US_DIRTY_MONEY_HELP_RULE, bannedAhead, cleanHeatRelief, dealWithDirtyMoney,
  launderDirtyMoney, launderEffectText, launderKey, previewDirty, washCaughtPct, washerIds, washersLeft,
  type DirtyMoneyHost,
} from '@/lib/careerDirtyMoney';
import { NBA_SPEND_ITEMS } from '@/lib/nbaMyCareer';
import { NFL_SPEND_ITEMS } from '@/lib/nflMyCareer';
import { MLB_SPEND_ITEMS } from '@/lib/mlbMyCareer';
import { NHL_SPEND_ITEMS } from '@/lib/nhlMyCareer';

const host = (o: Partial<DirtyMoneyHost>): DirtyMoneyHost => ({
  name: 'Desk Tester', year: 2031, seasons: [1, 2, 3], netWorth: 12, dirtyMoney: 5, heat: 40, fanbase: 60, morale: 70, karma: 55, ...o,
});
const DIRTY = [0.05, 0.1, 0.4, 0.9, 1, 1.1, 2.5, 6, 9.5, 20, 40];
const HEAT = [0, 0.55, 3, 9, 39.5, 40, 64, 81, 88.95, 89, 90, 98, 99, 100];

afterEach(() => { vi.restoreAllMocks(); });

describe('Round 1500: every way does exactly what its button prints', () => {
  it('the preview numbers are the applied change, over a grid of money, heat, karma and cash', () => {
    vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('the desk drew Math.random'); });
    let caughtSeen = 0, freeSeen = 0, grid = 0;
    for (const dirtyMoney of DIRTY) for (const heat of HEAT) for (const karma of [undefined, 0, 50, 98, 100]) for (const netWorth of [undefined, 0, 0.3, 0.35, 40]) for (const suspendedSeasons of [undefined, 0, 1]) {
      const c = host({ name: `Desk ${grid++}`, dirtyMoney, heat, karma, netWorth, suspendedSeasons, fanbase: heat > 50 ? 12 : 60 });
      const frozen = JSON.stringify(c);
      for (const way of DIRTY_WAYS) {
        const p = previewDirty(c, way);
        const r = dealWithDirtyMoney(c, way);
        expect(JSON.stringify(c), 'the desk never touches its input').toBe(frozen);
        if (way === 'quiet') { expect(r.state).toBe(c); expect(r.line).toBe(''); continue; }
        const s = r.state;
        expect(s.dirtyMoney, `${way}: dirty money ends at 0`).toBe(0);
        const net0 = netWorth ?? 0;
        /* 0 - fine, never -fine: a fine of 0 must read as 0, not -0 (Object.is tells them apart). */
        const netChange = way === 'clean' ? 0 - p.fine : way === 'wash' && !r.caught ? p.keep : 0;
        expect(Math.round(((s.netWorth ?? 0) - net0) * 100) / 100, `${way}: money, to the hundredth`).toBe(netChange);
        expect(s.netWorth ?? 0, `${way}: never below zero`).toBeGreaterThanOrEqual(0);
        expect(Math.round(((s.heat ?? 0) - heat) * 100) / 100, `${way}: heat`).toBe(p.heat);
        expect((s.karma ?? 50) - (karma ?? 50), `${way}: karma`).toBe(p.karma);
        if (way === 'wash') {
          expect(r.caught).toBe(keyedRng(launderKey(c))() < (p.caughtPct ?? 0) / 100);
          expect(dealWithDirtyMoney(c, way).caught, 'the same key gives the same answer').toBe(r.caught);
          if (r.caught) caughtSeen++; else freeSeen++;
          expect(s.fanbase).toBe(c.fanbase - (r.caught ? p.caughtFanbase : 0));
          expect(s.morale).toBe(c.morale - (r.caught ? p.caughtMorale : 0));
          expect(s.suspendedSeasons ?? 0).toBe(r.caught ? Math.max(1, suspendedSeasons ?? 0) : suspendedSeasons ?? 0);
          expect(s.suspendedSeasons ?? 0).toBeLessThanOrEqual(1);
        } else {
          expect(r.caught).toBeNull();
          expect([s.fanbase, s.morale, s.suspendedSeasons]).toEqual([c.fanbase, c.morale, c.suspendedSeasons]);
        }
      }
    }
    expect(caughtSeen).toBeGreaterThan(100);
    expect(freeSeen).toBeGreaterThan(100);
  });

  it('a career with no dirty money, or retired, comes back unchanged', () => {
    for (const c of [host({ dirtyMoney: 0 }), host({ dirtyMoney: undefined }), host({ retired: true })]) {
      for (const way of DIRTY_WAYS) expect(dealWithDirtyMoney(c, way)).toEqual({ state: c, line: '', caught: null });
    }
  });

  it('never a heat eraser: Come clean cools at most 5 and nothing at the top of the meter; Give it away holds the heat', () => {
    for (const d of DIRTY) for (const h of HEAT) {
      const relief = cleanHeatRelief(d, h);
      expect(relief).toBeLessThanOrEqual(CLEAN_HEAT_CAP);
      expect(relief).toBeLessThanOrEqual(h);
      if (h >= 100) expect(relief).toBe(0);
      if (d < 1) expect(relief).toBe(0);
      expect(previewDirty(host({ dirtyMoney: d, heat: h }), 'give').heat).toBe(0);
      expect(previewDirty(host({ dirtyMoney: d, heat: h, karma: 0 }), 'give').karma).toBeLessThanOrEqual(Math.min(GIVE_KARMA_CAP, Math.floor(d)));
    }
  });

  it('the wash is drawn against the whole percent it prints, rising with the heat from 15 to 55', () => {
    expect([0, 10, 50, 100, 110].map(washCaughtPct)).toEqual([15, 19, 35, 55, 55]);
    const p = previewDirty(host({ heat: 40 }), 'wash');
    expect(p.caughtPct).toBe(35);
    expect(p.lines).toContain('35 percent chance you are caught');
  });

  it('a ban the season end brings is counted the way the engines count it', () => {
    expect(bannedAhead(98, 0)).toBe(0);
    expect(bannedAhead(99, 0)).toBe(1);
    expect(bannedAhead(100, 0)).toBe(1);
    expect(bannedAhead(98, 1)).toBe(1);
    expect(bannedAhead(99, 1)).toBe(2);
    expect(bannedAhead(0, 0)).toBe(0);
    const top = previewDirty(host({ heat: 89 }), 'wash');
    expect(top.bannedAfter).toBe(1);
    expect(top.bannedIfCaught).toBe(2);
    expect(top.lines.join(' ')).toContain('Not caught: 3.5M comes out as clean money, and at this heat you still sit out a season to a suspension');
    expect(top.lines.join(' ')).toContain('you sit out 2 seasons');
    /* The card applies on one tap, so it prints the caught branch too, and at heat 89 the two seasons it costs. */
    expect(launderEffectText(host({ heat: 89 }))).toBe('Keep 70 percent, heat +10, 55 percent chance you are caught, and at this heat you sit out a season either way. Caught: all of it seized, fanbase -30, morale -25, 2 seasons out');
    expect(launderEffectText(host({ heat: 40 }))).toBe('Keep 70 percent, heat +10, 35 percent chance you are caught. Caught: all of it seized, fanbase -30, morale -25, a season out');
    expect(launderEffectText(host({ heat: 40, fanbase: 12, morale: 7 }))).toContain('fanbase -12, morale -7, a season out');
  });

  it('a sliver, the top of the meter and a suspension print what really happens (review minors 4 and 14)', () => {
    /* The NHL brewery's 0.05M: the amount is not printed as 0.1M, the fine floor is the help's, and a wash that
       banks nothing says so instead of "0.0M". */
    const sliver = host({ dirtyMoney: 0.05, heat: 0, netWorth: 12.35 });
    expect(previewDirty(sliver, 'clean').lines[0]).toBe('Pay back all 0.05M plus a 0.1M fine');
    expect(previewDirty(sliver, 'give').lines[0]).toBe('All 0.05M goes to charity. You keep none of it');
    expect(previewDirty(sliver, 'wash').lines).toContain('Not caught: too little of it to come out as clean money');
    expect(previewDirty(sliver, 'wash').lines.join(' ')).toContain('Caught: all 0.05M is seized');
    expect(dealWithDirtyMoney(sliver, 'clean').state.netWorth, 'NHL hundredths are kept').toBe(12.25);
    expect(dealWithDirtyMoney(host({ dirtyMoney: 5, netWorth: 0.35 }), 'clean').state.netWorth, 'all the clean money, to the hundredth').toBe(0);
    /* A wash near the top never prints a fraction of heat. */
    expect(previewDirty(host({ heat: 95.25 }), 'wash').lines[0]).toBe('Heat goes to the top of the meter now');
    expect(launderEffectText(host({ heat: 95.25 }))).toContain(', heat to the top of the meter,');
    expect(previewDirty(host({ heat: 100 }), 'wash').lines[0]).toBe('Heat is already at the top of the meter');
    /* A suspension that starts at a season end costs what the engines take; one already pending was paid for. */
    expect(previewDirty(host({ heat: 99 }), 'give').lines).toContain('At this heat you still sit out a season to a suspension, fanbase -30 and morale -25 when it starts');
    expect(previewDirty(host({ heat: 40, suspendedSeasons: 1 }), 'give').lines).toContain('At this heat you still sit out a season to a suspension');
    expect(previewDirty(host({ heat: 89 }), 'wash').lines.join(' ')).toContain('you sit out 2 seasons, the next suspension costing fanbase -30 and morale -25 again');
    expect(previewDirty(host({ heat: 86 }), 'quiet').lines).toContain('At this heat the next season end suspends you, takes all of it, and costs fanbase -30 and morale -25');
    /* The help says the floor and says the heat only climbs once it has started. */
    expect(US_DIRTY_MONEY_HELP_RULE).toContain('plus a 10 percent fine, never under 0.1M');
    expect(US_DIRTY_MONEY_HELP_RULE.startsWith('Once your heat is above zero, dirty money raises it every season you hold it.')).toBe(true);
  });
});

describe('Round 1500: the card, the washers and the help line', () => {
  it('the card mutates its career and keeps its own sentence when the wash works', () => {
    for (const heat of HEAT) {
      const c = host({ heat, dirtyMoney: 5 });
      const twin = dealWithDirtyMoney(c, 'wash');
      const line = launderDirtyMoney(c, 'You bought into cash businesses.');
      expect(c).toEqual(twin.state);
      expect(line.startsWith('You bought into cash businesses.')).toBe(!twin.caught);
    }
  });

  it('every sport has three washers, read off its own shop, and none is the offshore account', () => {
    for (const stock of [NBA_SPEND_ITEMS, NFL_SPEND_ITEMS, MLB_SPEND_ITEMS, NHL_SPEND_ITEMS]) {
      const ids = washerIds(stock);
      expect(ids).toHaveLength(3);
      expect(ids.some(id => id.includes('offshore'))).toBe(false);
      expect(washersLeft(stock, [])).toBe(3);
      expect(washersLeft(stock, ids.slice(0, 2))).toBe(1);
      expect(washersLeft(stock, ids)).toBe(0);
    }
  });

  it('the help line carries the numbers the desk plays, and no long dash', () => {
    expect(US_DIRTY_MONEY_HELP_RULE).toContain('6.0M of dirty money comes clean for a 0.6M fine with heat -5 and karma +3');
    expect(US_DIRTY_MONEY_HELP_RULE).toContain('goes to charity for karma +6');
    expect(US_DIRTY_MONEY_HELP_RULE).toContain('washes into 4.2M with a 35 percent chance');
    expect([0x2013, 0x2014].some(code => US_DIRTY_MONEY_HELP_RULE.includes(String.fromCharCode(code)))).toBe(false);
  });
});

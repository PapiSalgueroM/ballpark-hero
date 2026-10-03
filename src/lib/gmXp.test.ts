/* Round 942: the shared XP ladder, Club Manager's delegation to it, the GM block,
   and the panel's promise that a tree a board does not feed sells no point. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import * as cm from '@/lib/clubManagerXp';
import {
  GM_MAX_LEVEL, GM_MAX_TREE_POINTS, GM_TREES, contractAsk, craftedDeadMoney, cushionTrustLoss, defaultGmXp,
  developedGrowth, gmPointsFree, gmXpOf, isValidGmXp, levelFor, pointsEarned, pressOdds,
  scoutedNoise, spendGmPoint, tradePremium, xpForLevel,
} from '@/lib/gmXp';
import { GmXpPanel } from '@/components/front-office-shared/GmXpPanel';

afterEach(cleanup);

describe('the shared curve', () => {
  it('is Club Manager\'s at every level and either side of every threshold', () => {
    expect(GM_MAX_LEVEL).toBe(cm.MAX_LEVEL);
    for (let l = 1; l <= cm.MAX_LEVEL + 1; l++) {
      expect(xpForLevel(l)).toBe(cm.xpForLevel(l));
      for (const xp of [cm.xpForLevel(l) - 1, cm.xpForLevel(l)]) {
        expect(levelFor(xp, GM_MAX_LEVEL)).toBe(cm.levelFor(xp));
        expect(pointsEarned(xp, GM_MAX_LEVEL)).toBe(cm.pointsEarned(xp));
      }
    }
  });

  it('keeps Club Manager\'s constants reachable where they always were', () => {
    expect(cm.XP_FIRST_LEVEL).toBe(400);
    expect(cm.XP_LEVEL_STEP).toBe(1.04);
  });
});

describe('the GM block', () => {
  it('cannot conjure a point, caps a tree at five and refuses a made up tree', () => {
    expect(spendGmPoint(defaultGmXp(), 'scouting')).toBeNull();
    let b = { ...defaultGmXp(), xp: xpForLevel(GM_MAX_LEVEL) };
    for (let i = 0; i < GM_MAX_TREE_POINTS + 2; i++) b = spendGmPoint(b, 'media') ?? b;
    expect(b.points.media).toBe(GM_MAX_TREE_POINTS);
    expect(spendGmPoint(b, 'tactics')).toBeNull();
    expect(gmPointsFree(b)).toBe(GM_MAX_LEVEL - 1 - GM_MAX_TREE_POINTS);
  });

  it('reads an absent or mangled block as a fresh one and a sound one as itself', () => {
    for (const bad of [undefined, null, {}, { v: 1, xp: -3, points: {} }, { ...defaultGmXp(), points: { ...defaultGmXp().points, trading: 9 } }]) {
      expect(isValidGmXp(bad)).toBe(false);
      expect(gmXpOf(bad)).toEqual(defaultGmXp());
    }
    const good = { ...defaultGmXp(), xp: 900, points: { ...defaultGmXp().points, ownership: 2 } };
    expect(gmXpOf(good)).toBe(good);
  });
});

describe('the GM effects', () => {
  it('hand back exactly what they were given at zero points', () => {
    expect(scoutedNoise(3, 0, 0)).toBe(3);
    expect(contractAsk(12.5, 0, 0, 1)).toBe(12.5);
    expect(craftedDeadMoney(4.5, 0, 0)).toBe(4.5);
    expect(developedGrowth(3, 10, 0, 0)).toBe(3);
    expect(tradePremium(1.15, 0)).toBe(1.15);
    expect(cushionTrustLoss(-16, 0)).toBe(-16);
    expect(pressOdds(0.5, 0)).toBe(0.5);
  });

  /* The rolled effects, averaged over a grid of rolls, stored the way a board stores them. */
  const rolls = Array.from({ length: 100 }, (_, i) => (i + 0.5) / 100);
  const avg = (f: (r: number) => number) => rolls.reduce((s, r) => s + f(r), 0) / rolls.length;

  it('move at every point, not only at the cap, after the board rounds them', () => {
    for (let p = 1; p <= GM_MAX_TREE_POINTS; p++) {
      expect(avg(r => contractAsk(1.2, p, r, 0.7))).toBeLessThan(avg(r => contractAsk(1.2, p - 1, r, 0.7)));
      expect(avg(r => craftedDeadMoney(0.5, p, r))).toBeLessThan(avg(r => craftedDeadMoney(0.5, p - 1, r)));
      expect(avg(r => Math.round(developedGrowth(1, 9, p, r)))).toBeGreaterThan(avg(r => Math.round(developedGrowth(1, 9, p - 1, r))));
      expect(tradePremium(1.15, p)).toBeLessThan(tradePremium(1.15, p - 1));
      expect(-cushionTrustLoss(-16, p)).toBeLessThan(-cushionTrustLoss(-16, p - 1));
      expect(pressOdds(0.45, p)).toBeGreaterThan(pressOdds(0.45, p - 1));
    }
  });

  it('hand back whole ratings and money in tenths', () => {
    for (const r of rolls) {
      expect(Number.isInteger(developedGrowth(2, 9, 3, r))).toBe(true);
      const ask = contractAsk(1.2, 3, r, 0.7);
      expect(Math.round(ask * 10) / 10).toBe(ask);
      const dead = craftedDeadMoney(0.8, 3, r);
      expect(Math.round(dead * 10) / 10).toBe(dead);
    }
  });

  it('never grows a player past his ceiling, never asks under the floor, and never touches a gain or a decline', () => {
    for (const r of rolls) {
      expect(developedGrowth(2, 2, 5, r)).toBe(2);
      expect(developedGrowth(2, 3, 5, r)).toBeLessThanOrEqual(3);
      expect(contractAsk(0.7, 5, r, 0.7)).toBe(0.7);
      expect(contractAsk(0.8, 5, r, 0.7)).toBeGreaterThanOrEqual(0.7);
    }
    expect(developedGrowth(-2, 5, 5, 0)).toBe(-2);
    expect(cushionTrustLoss(14, 5)).toBe(14);
    expect(tradePremium(1.15, 5)).toBeGreaterThan(1);
  });
});

describe('GmXpPanel', () => {
  const rich = { ...defaultGmXp(), xp: xpForLevel(4) };

  it('sells points only in the trees the board feeds', () => {
    const spend = vi.fn();
    render(createElement(GmXpPanel, { block: rich, onSpendPoint: spend, live: ['ownership'] }));
    expect(screen.getByText('3 points to spend')).toBeTruthy();
    const off = screen.getAllByRole('button', { name: 'Not here yet' });
    expect(off).toHaveLength(GM_TREES.length - 1);
    for (const b of off) expect((b as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Spend a point (0/5)' }));
    expect(spend).toHaveBeenCalledWith('ownership');
  });

  it('says nothing is full at the top level while points sit unspent', () => {
    const maxed = { ...defaultGmXp(), xp: xpForLevel(GM_MAX_LEVEL) };
    render(createElement(GmXpPanel, { block: maxed, onSpendPoint: () => {}, live: GM_TREES }));
    expect(screen.getByText('Top level. Every point the trees hold has been earned.')).toBeTruthy();
    expect(screen.getByText('35 points to spend')).toBeTruthy();
    expect(screen.queryByText(/Every tree is full/)).toBeNull();
  });

  it('does not offer points to spend when no tile on the desk can take one', () => {
    render(createElement(GmXpPanel, { block: rich, onSpendPoint: () => {}, live: [] }));
    expect(screen.queryByText('3 points to spend')).toBeNull();
    expect(screen.getByText('3 points saved. No tree on this desk can take one yet.')).toBeTruthy();
  });

  it('draws a mangled block as a fresh one rather than crashing', () => {
    render(createElement(GmXpPanel, { block: { v: 9 }, onSpendPoint: () => {}, live: GM_TREES }));
    expect(screen.getByText('🎖️ GM level 1')).toBeTruthy();
    expect(screen.getByText('0 of 35 points spent')).toBeTruthy();
  });
});

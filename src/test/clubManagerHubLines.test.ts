import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CareerState } from '@/lib/clubManager';
import type { FinanceProjection } from '@/lib/clubManagerFinances';
import { inboxTile, kittyChange, leagueTileValue, recordLine } from '@/lib/clubManagerHubLines';

/* Round 1328: the hub tiles' words, on hand made states and the two committed
   old save fixtures. */

type Desk = NonNullable<CareerState['decisions']>;
const situation = (over: Partial<Desk[number]> = {}): Desk[number] =>
  ({ id: 'desk-1-20-quietWord', kind: 'situation', season: 1, week: 20, from: 'The head coach', text: 'A word.', options: [], ...over }) as Desk[number];
const appeal = (over: Partial<Desk[number]> = {}): Desk[number] =>
  ({ id: 'desk-1-21-appeal-p1', kind: 'appeal', season: 1, week: 21, from: 'The club secretary', text: 'Appeal?', options: [], playerId: 'p1', playerName: 'A Player', ban: 3, odds: 30, ...over }) as Desk[number];
const message = (over: Record<string, unknown> = {}) =>
  ({ id: 'msg-1-3-1', playerName: 'A Player', text: 'Boss.', week: 3, ...over }) as unknown as NonNullable<CareerState['inbox']>[number];
const tile = (inbox: unknown[], decisions?: unknown[]) =>
  inboxTile({ inbox, decisions } as unknown as Pick<CareerState, 'inbox' | 'decisions'>);
const fixture = (name: string) =>
  JSON.parse(fs.readFileSync(path.join(process.cwd(), 'scripts', 'data', name), 'utf8')) as CareerState;

describe('inboxTile', () => {
  it('a New year takeover with one open situation card and no messages reads 1 new over a role, never No messages yet', () => {
    const t = tile([], [situation()]);
    expect(t).toMatchObject({ value: '1 new', sub: 'The head coach' });
    expect(t.count).toBe(1);
  });
  it('an open appeal is named as one, ahead of any other card', () => {
    expect(tile([message()], [situation(), appeal()])).toMatchObject({ value: '3 new', sub: 'Red card appeal' });
  });
  it('with the desk answered, the first open message names its sender', () => {
    const t = tile([message({ resolved: 'done', playerName: 'Old News' }), message({ from: 'Your agent', playerName: 'X' })], [situation({ resolved: 'Done.' })]);
    expect(t).toMatchObject({ value: '1 new', sub: 'Your agent' });
  });
  it('all answered: the newest message, then the newest desk card, and No messages yet only when both are empty', () => {
    expect(tile([message({ resolved: 'ok', playerName: 'Newest' }), message({ resolved: 'ok', playerName: 'Older' })], [])).toMatchObject({ value: 'All quiet', sub: 'Newest' });
    expect(tile([], [situation({ resolved: 'Done.', from: 'The board' }), situation({ id: 'desk-1-2-x', resolved: 'Done.' })])).toMatchObject({ value: 'All quiet', sub: 'The board' });
    expect(tile([], [])).toMatchObject({ value: 'All quiet', sub: 'No messages yet' });
    expect(tile(undefined as unknown as unknown[], undefined)).toMatchObject({ value: 'All quiet', sub: 'No messages yet' });
  });
  it('a damaged desk block reads as empty, as the panel reads it', () => {
    expect(tile([], [{ id: 'not-a-desk-card' }])).toMatchObject({ value: 'All quiet', sub: 'No messages yet' });
  });
});

describe('recordLine', () => {
  it('prints W D L the way the Manager panel does', () => {
    expect(recordLine({ wins: 5, draws: 2, losses: 6 })).toBe('5W 2D 6L');
    expect(recordLine({ wins: 1200, draws: 0, losses: 3 })).toBe('1,200W 0D 3L');
  });
  it('an old save without a field reads 0, never undefined', () => {
    expect(recordLine({ wins: 4, losses: 1 })).toBe('4W 0D 1L');
    expect(recordLine(undefined)).toBe('0W 0D 0L');
  });
});

describe('leagueTileValue', () => {
  it('week 0 says the season has not started, never a rank', () => {
    expect(leagueTileValue(0, 5)).toBe('Not started');
    expect(leagueTileValue(0, 0)).not.toMatch(/#/);
  });
  it('after week 0 it is the position', () => {
    expect(leagueTileValue(3, 5)).toBe('#5');
    expect(leagueTileValue(3, 0)).toBe('#-');
  });
});

describe('kittyChange', () => {
  const line = (id: string, actual: number, projected: number, kitty: boolean) => ({ id, label: id, actual, projected, kitty });
  it("Round 1326's worked example: income 64.8, spend 72.4, the board covers 71.3, the kitty moves +63.7", () => {
    const p = {
      resultActual: -1.2,
      resultProjected: Math.round((64.8 - 72.4) * 100) / 100,
      spend: [line('playerWages', 20, 60.1, false), line('staffWages', 3, 9.2, false), line('travel', 0.5, 2, false), line('transferOut', 1.1, 1.1, true)],
    } as unknown as FinanceProjection;
    expect(kittyChange(p)).toEqual({ actual: 22.3, projected: 63.7 });
  });
  it('reads the kitty flag, never a line id: a new running cost lands on the board side by itself', () => {
    const p = { resultActual: 0, resultProjected: -10, spend: [line('somethingNew', 1, 4, false), line('playerWages', 0, 0, true)] } as unknown as FinanceProjection;
    expect(kittyChange(p).projected).toBe(-6);
  });
});

describe('the two old save fixtures', () => {
  for (const name of ['cmOldSave1052Fixture.json', 'cmSecondTierOldSaveFixture.json']) {
    it(`${name}: every line is words, never undefined or NaN`, () => {
      const c = fixture(name);
      const t = inboxTile(c);
      const words = [t.value, t.sub, recordLine(c.careerStats), leagueTileValue(c.week, 4)].join(' | ');
      expect(words).not.toMatch(/undefined|NaN|\[object Object\]|Infinity/);
      expect(recordLine(c.careerStats)).toMatch(/^[\d,]+W [\d,]+D [\d,]+L$/);
    });
  }
});

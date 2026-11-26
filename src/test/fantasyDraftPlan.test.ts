import { expect, it } from 'vitest';
import type { DraftPlayer } from '@/components/fantasy-draft/PlayerPool';
import { fantasyAiShortlist, followUpChance, rivalPicksBeforeNextTurn } from '@/lib/fantasyDraftPlan';
import { ruleForCriteria } from '@/lib/fantasyCriteria';

const player = (id: string, position: string, value: number, age = 24): DraftPlayer => ({ id, name: id, position, market_value_millions: value, age, nationality: 'Fixture', dominant_foot: 'Right' });
const forwards = Array.from({ length: 7 }, (_, n) => player(`forward${n}`, 'FWD', 100 - n));

it('prices the second shortlist after the first rival pick and observes both snake orders', () => {
  expect(rivalPicksBeforeNextTurn(0, true)).toBe(2);
  expect(rivalPicksBeforeNextTurn(3, true)).toBe(0);
  expect(rivalPicksBeforeNextTurn(1, false)).toBe(0);
  expect(rivalPicksBeforeNextTurn(2, false)).toBe(2);
  expect(rivalPicksBeforeNextTurn(20, true)).toBeNull();
  expect(rivalPicksBeforeNextTurn(21, false)).toBeNull();
  const chance = (target: string, rivals: number) => followUpChance(target, rivals, null, [], forwards, new Set());
  expect(chance('forward0', 2)).toBeCloseTo(25 / 36);
  expect(chance('forward6', 2)).toBeCloseTo(5 / 6);
  expect(chance('forward0', 0)).toBe(1);
});
it('retains keeper priority, daily eligibility and the hard formation limit at each branch', () => {
  const keeper = player('keeper', 'GK', 1);
  expect(fantasyAiShortlist([], [...forwards, keeper])).toEqual([keeper]);
  expect(followUpChance('keeper', 2, null, [], [...forwards, keeper], new Set())).toBe(0);
  expect(followUpChance('forward0', 2, null, [], [...forwards, keeper], new Set())).toBeCloseTo(5 / 6);
  const older = player('older', 'MID', 200, 30);
  const rule = ruleForCriteria('Under 25s');
  expect(followUpChance('older', 2, rule, [], [...forwards, older], new Set())).toBe(1);
  const midfielders = Array.from({ length: 4 }, (_, n) => player('mid'+n, 'MID', 1));
  expect(followUpChance('forward3', 2, null, forwards.slice(0, 3), [...forwards, ...midfielders], new Set(forwards.slice(0, 3).map(p => p.id)))).toBe(1);
});

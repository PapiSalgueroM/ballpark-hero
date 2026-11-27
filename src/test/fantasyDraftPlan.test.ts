import { expect, it } from 'vitest';
import type { DraftPlayer } from '@/components/fantasy-draft/PlayerPool';
import { fantasyAiShortlist, fantasyRivalPick, followUpChance, rivalPicksBeforeNextTurn } from '@/lib/fantasyDraftPlan';
import { ruleForCriteria } from '@/lib/fantasyCriteria';

const player = (id: string, position: string, value: number, age = 24): DraftPlayer => ({ id, name: id, position, market_value_millions: value, age, nationality: 'Fixture', dominant_foot: 'Right' });
const forwards = Array.from({ length: 7 }, (_, n) => player(`forward${n}`, 'FWD', 100 - n));

it('Scout protects a scarce role before the opponent can take it and the planner predicts that same pick', () => {
  const defender = player('specialist', 'DEF', 85);
  const field = [...forwards, defender, ...Array.from({length: 5}, (_, i) => player('cover'+i, 'DEF', 15))];
  const yours = [player('yourmid', 'MID', 50)];
  const ai = [player('rivalmid', 'MID', 52)];
  const claimed = new Set([...yours, ...ai].map(p => p.id));
  const scout = { team: yours, userFirst: true };
  expect(fantasyRivalPick(null, ai, field, claimed).players).not.toContain(defender);
  expect(fantasyRivalPick(null, ai, field, claimed, scout).players).toEqual([defender]);
  expect(fantasyRivalPick(null, ai, field, claimed, scout).reason).toMatch(/DEF.*85.*15/);
  expect(followUpChance(defender.id, 1, null, ai, field, claimed, scout)).toBe(0);
  expect(followUpChance(defender.id, 1, null, ai, field, claimed)).toBe(1);
  const fullDefence = Array.from({length: 4}, (_, i) => player('filled'+i, 'DEF', 20));
  expect(fantasyRivalPick(null, ai, field, claimed, {team: fullDefence, userFirst: false}).players).toEqual([forwards[0]]);
  expect(fantasyRivalPick(null, [], field, new Set(), {team:yours, userFirst:true}).players).toEqual([forwards[0]]);
});
it('Scout obeys daily eligibility and the same hard keeper and position rules', () => {
  const old = player('old', 'MID', 200, 31);
  const keeper = player('keeper', 'GK', 8);
  const young = player('young', 'MID', 25);
  const scout = {team: [], userFirst:false};
  expect(fantasyRivalPick(ruleForCriteria('Under 25s'), [], [old, young, keeper], new Set(), scout).players).toEqual([keeper]);
  expect(fantasyRivalPick(ruleForCriteria('Under 25s'), [keeper], [old, young, keeper], new Set([keeper.id]), scout).players).toEqual([young]);
});

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

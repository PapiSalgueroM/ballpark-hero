import { expect, it } from 'vitest';
import * as factory from '@/lib/wonderkidFactory';

const time = 1767225600000;
const academy = () => {
  const s = factory.newFactory(time, 293);
  s.prospects = [1, 2, 3].map((id) => ({ ...factory.makeProspectInBand(s, 80, 80, () => 0.45), id, name: 'Fixture Prospect ' + id, rating: 60, age: 18, ageClock: 0 }));
  s.nextId = 4;
  return s;
};
const sum = (s: factory.FactoryState) => s.prospects.reduce((n, p) => n + p.rating, 0);

it.each([false, true])('redistributes only earned progress while training, offline %s', offline => {
  const baseline = academy(), focused = structuredClone(baseline);
  expect(factory.setCoachingFocus(focused, 1)).toBe(true);
  factory.tick(baseline, 10, { offline });
  factory.tick(focused, 10, { offline });
  const gained = baseline.prospects[0].rating - 60;
  expect(focused.prospects[0].rating).toBeCloseTo(60 + gained * 1.3, 10);
  expect(focused.prospects[1].rating).toBeCloseTo(60 + gained * 0.85, 10);
  expect(focused.prospects[2].rating).toBeCloseTo(60 + gained * 0.85, 10);
  expect(sum(focused)).toBeCloseTo(sum(baseline), 10);
  expect(focused.prospects.map(p => p.ageClock)).toEqual(baseline.prospects.map(p => p.ageClock));
  expect(focused.seed).toBe(baseline.seed);
});

it('fills only remaining headroom, restores the choice and removes it on sale or promotion', () => {
  const s = academy();
  expect(factory.setCoachingFocus(s, 999)).toBe(false);
  expect(factory.setCoachingFocus(s, 1)).toBe(true);
  expect(factory.setCoachingFocus(s, 1)).toBe(false);
  const restored = factory.deserialize(factory.serialize(s), time)!;
  expect(restored.coachingFocusId).toBe(1);
  expect(factory.sellProspect(restored, 1)).toBeGreaterThan(0);
  expect(restored.coachingFocusId).toBeUndefined();
  expect(factory.promote(s, 1)).toBe(true);
  expect(s.coachingFocusId).toBeUndefined();

  const base = academy();
  base.prospects[0].rating = 79.99;
  const capped = structuredClone(base);
  expect(factory.setCoachingFocus(capped, 1)).toBe(true);
  factory.tick(base, 5, { offline: true });
  factory.tick(capped, 5, { offline: true });
  expect(capped.prospects).toEqual(base.prospects);
  expect(capped.coachingFocusId).toBeUndefined();
});

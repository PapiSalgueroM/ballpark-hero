import { expect, it, vi } from 'vitest';
import * as engine from '@/lib/stadiumTycoon';

const now = 1767225600000;

it('locks one halftime plan before minute 75 and resumes the same match after reload', () => {
  const s = { ...engine.newTycoon(now), minute: 45 };
  expect(engine.setMatchPlan({ ...s, minute: 44 }, s.matchNo, 'protect')).toMatchObject({ minute: 44 });
  expect(engine.setMatchPlan(s, s.matchNo + 1, 'protect')).toBe(s);
  expect(engine.setMatchPlan({ ...s, minute: 75 }, s.matchNo, 'protect')).not.toHaveProperty('matchPlan');
  const next = engine.setMatchPlan(s, s.matchNo, 'protect');
  const restored = engine.deserializeTycoon(engine.serializeTycoon(next, now), now)!;
  expect(restored.matchPlan).toEqual({ match: s.matchNo, minute: 45, kind: 'protect' });
  expect(engine.setMatchPlan(restored, s.matchNo, 'push')).toBe(restored);
  expect(engine.deserializeTycoon(engine.serializeTycoon({ ...next, matchNo: s.matchNo + 1 }, now), now)).not.toHaveProperty('matchPlan');
});

it('uses two original rolls per minute and records the plan on just the completed match', () => {
  const s = { ...engine.newTycoon(now), minute: 89 };
  const attacking = engine.setMatchPlan({ ...s, minute: 45 }, s.matchNo, 'push');
  attacking.minute = 89;
  const rng = vi.fn(() => engine.goalChancePerMin(s) * 1.1);
  const control = { ...s };
  engine.playMinute(control, rng, [], { pay: true });
  expect(rng).toHaveBeenCalledTimes(2);
  rng.mockClear();
  engine.playMinute(attacking, rng, [], { pay: true });
  expect(rng).toHaveBeenCalledTimes(2);
  expect(attacking.totalGoals).toBe(control.totalGoals + 1);
  expect(attacking.matchPlan).toBeUndefined();
  expect(attacking.league?.results?.at(-1)).toMatchObject({ plan: { minute: 45, kind: 'push' } });
  const next = engine.playAwayMatchdays(attacking, 1, () => 0.99).state;
  expect(next.league?.results?.at(-1)).not.toHaveProperty('plan');
  expect(engine.deserializeTycoon(engine.serializeTycoon(next, now), now)?.league?.results?.[0].plan).toEqual({ minute: 45, kind: 'push' });
});
